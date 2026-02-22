'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Quiz, Question, Answer, QuizResult, QuizSettings } from '@/types/database';

interface QuestionWithAnswers extends Question {
  answers: Answer[];
}

interface QuizWithRelations extends Quiz {
  questions: QuestionWithAnswers[];
  quiz_results: QuizResult[];
}

interface QuizContainerProps {
  quiz: QuizWithRelations;
}

type QuizState = 'intro' | 'questions' | 'auth' | 'results';

interface SessionResult {
  session: { id: string };
  primaryResult: QuizResult | null;
  scores: Record<string, number>;
}

export function QuizContainer({ quiz }: QuizContainerProps) {
  const [state, setState] = useState<QuizState>('intro');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SessionResult | null>(null);
  const [loading, setLoading] = useState(false);

  const settings = quiz.settings as QuizSettings;

  // Shuffle answers per question if randomizeAnswers is enabled (stable for the session)
  const questions = useMemo(() => {
    if (!settings.randomizeAnswers) return quiz.questions;
    return quiz.questions.map((q) => ({
      ...q,
      answers: [...q.answers].sort(() => Math.random() - 0.5),
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz.questions]);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  // Create session when quiz starts
  const startQuiz = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quiz_id: quiz.id }),
      });

      if (!response.ok) throw new Error('Failed to start session');

      const session = await response.json();
      setSessionId(session.id);
      setState('questions');
    } catch (error) {
      console.error('Error starting quiz:', error);
      alert('Failed to start quiz');
    } finally {
      setLoading(false);
    }
  }, [quiz.id]);

  // Submit answer
  const submitAnswer = async (questionId: string, answerId: string) => {
    if (!sessionId) return;

    setAnswers((prev) => ({ ...prev, [questionId]: answerId }));

    try {
      await fetch(`/api/sessions/${sessionId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: questionId, answer_id: answerId }),
      });
    } catch (error) {
      console.error('Error submitting answer:', error);
    }
  };

  // Move to next question or complete quiz
  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // Last question - go to auth or complete
      setState('auth');
    }
  };

  // Move to previous question
  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  // Complete quiz (after auth or skip)
  const completeQuiz = async (userId?: string) => {
    if (!sessionId) return;
    setLoading(true);

    try {
      // Update session with user ID if provided
      if (userId) {
        await fetch(`/api/sessions/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId }),
        });
      }

      // Complete the quiz and calculate results
      const response = await fetch(`/api/sessions/${sessionId}/complete`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to complete quiz');

      const data = await response.json();
      setResult(data);
      setState('results');
    } catch (error) {
      console.error('Error completing quiz:', error);
      alert('Failed to complete quiz');
    } finally {
      setLoading(false);
    }
  };

  const buttonStyle = settings.buttonStyle === 'square' ? 'rounded-none' : 'rounded-md';
  const logoHeightClass = { small: 'h-8', medium: 'h-16', large: 'h-24' }[settings.logoSize || 'medium'];

  return (
    <div
      className="min-h-screen flex items-start justify-center p-4"
      style={{ backgroundColor: settings.backgroundColor }}
    >
      <Card className="w-full max-w-2xl">
        {settings.logoUrl && (
          <div className="p-4 border-b flex justify-center">
            <img src={settings.logoUrl} alt="Logo" className={`${logoHeightClass} object-contain`} />
          </div>
        )}

        <CardContent className="p-6">
          {state === 'intro' && (
            <IntroScreen
              quiz={quiz}
              onStart={startQuiz}
              loading={loading}
              buttonStyle={buttonStyle}
              primaryColor={settings.primaryColor}
              startButtonText={settings.startButtonText}
            />
          )}

          {state === 'questions' && currentQuestion && (
            <QuestionScreen
              question={currentQuestion}
              questionNumber={currentQuestionIndex + 1}
              totalQuestions={questions.length}
              selectedAnswer={answers[currentQuestion.id]}
              onSelectAnswer={(answerId) => submitAnswer(currentQuestion.id, answerId)}
              onNext={handleNext}
              onPrevious={handlePrevious}
              canGoBack={currentQuestionIndex > 0}
              isLast={currentQuestionIndex === questions.length - 1}
              progress={progress}
              buttonStyle={buttonStyle}
              primaryColor={settings.primaryColor}
            />
          )}

          {state === 'auth' && (
            <LeadCaptureForm
              onComplete={completeQuiz}
              loading={loading}
              buttonStyle={buttonStyle}
              primaryColor={settings.primaryColor}
            />
          )}

          {state === 'results' && result && (
            <ResultScreen
              result={result.primaryResult}
              buttonStyle={buttonStyle}
              primaryColor={settings.primaryColor}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Sub-components

interface IntroScreenProps {
  quiz: QuizWithRelations;
  onStart: () => void;
  loading: boolean;
  buttonStyle: string;
  primaryColor: string;
  startButtonText?: string;
}

function IntroScreen({ quiz, onStart, loading, buttonStyle, primaryColor, startButtonText }: IntroScreenProps) {
  return (
    <div className="text-center space-y-6">
      <h1 className="text-2xl font-bold">{quiz.title}</h1>
      {quiz.description && (
        <p className="text-muted-foreground">{quiz.description}</p>
      )}
      {quiz.image_url && (
        <img
          src={quiz.image_url}
          alt=""
          className="w-full max-w-md mx-auto rounded-lg"
        />
      )}
      <p className="text-sm text-muted-foreground">
        {quiz.questions.length} questions
      </p>
      <Button
        onClick={onStart}
        disabled={loading}
        className={buttonStyle}
        style={{ backgroundColor: primaryColor }}
      >
        {loading ? 'Starting...' : (startButtonText || 'Start Quiz')}
      </Button>
    </div>
  );
}

interface QuestionScreenProps {
  question: QuestionWithAnswers;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswer: string | undefined;
  onSelectAnswer: (answerId: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  canGoBack: boolean;
  isLast: boolean;
  progress: number;
  buttonStyle: string;
  primaryColor: string;
}

function QuestionScreen({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  onSelectAnswer,
  onNext,
  onPrevious,
  canGoBack,
  isLast,
  progress,
  buttonStyle,
  primaryColor,
}: QuestionScreenProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Question {questionNumber} of {totalQuestions}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <h2 className="text-xl font-medium">{question.question_text}</h2>

      {question.image_url && (
        <img
          src={question.image_url}
          alt=""
          className="w-full max-w-md mx-auto rounded-lg"
        />
      )}

      <div className="space-y-3">
        {question.answers.map((answer) => (
          <button
            key={answer.id}
            onClick={() => onSelectAnswer(answer.id)}
            className={`w-full p-4 text-left border rounded-lg transition-all ${
              selectedAnswer === answer.id
                ? 'border-2'
                : 'border-neutral-200 hover:border-neutral-300'
            }`}
            style={{
              borderColor: selectedAnswer === answer.id ? primaryColor : undefined,
              backgroundColor: selectedAnswer === answer.id ? `${primaryColor}10` : undefined,
            }}
          >
            {answer.answer_text}
          </button>
        ))}
      </div>

      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={!canGoBack}
          className={buttonStyle}
        >
          Previous
        </Button>
        <Button
          onClick={onNext}
          disabled={!selectedAnswer}
          className={buttonStyle}
          style={{ backgroundColor: primaryColor }}
        >
          {isLast ? 'Finish' : 'Next'}
        </Button>
      </div>
    </div>
  );
}

interface LeadCaptureFormProps {
  onComplete: (userId?: string) => void;
  loading: boolean;
  buttonStyle: string;
  primaryColor: string;
}

function LeadCaptureForm({ onComplete, loading, buttonStyle, primaryColor }: LeadCaptureFormProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSkip, setShowSkip] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowSkip(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/users/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email }),
      });

      if (!response.ok) throw new Error('Failed to save info');

      const { user_id } = await response.json();
      onComplete(user_id);
    } catch (error) {
      console.error('Error saving lead info:', error);
      alert('Failed to save your info. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold">Almost there!</h2>
        <p className="text-muted-foreground mt-2">
          Enter your info to see your results and receive them by email
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="text-center">
          <Button
            type="submit"
            disabled={loading || submitting}
            className={buttonStyle}
            style={{ backgroundColor: primaryColor }}
          >
            {loading || submitting ? 'Processing...' : 'See My Results'}
          </Button>
        </div>
      </form>

      {showSkip && (
        <div className="text-center">
          <button
            onClick={() => onComplete()}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Skip for now
          </button>
        </div>
      )}
    </div>
  );
}

interface ResultScreenProps {
  result: QuizResult | null;
  buttonStyle: string;
  primaryColor: string;
}

function ResultScreen({ result, buttonStyle, primaryColor }: ResultScreenProps) {
  if (!result) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-xl font-bold">Quiz Completed!</h2>
        <p className="text-muted-foreground">
          Thanks for taking the quiz.
        </p>
      </div>
    );
  }

  return (
    <div className="text-center space-y-6">
      <div className="text-4xl">🎉</div>
      <h2 className="text-2xl font-bold">{result.title}</h2>
      {result.description && (
        <p className="text-muted-foreground">{result.description}</p>
      )}
      {result.image_url && (
        <img
          src={result.image_url}
          alt={result.title}
          className="mx-auto max-w-sm rounded-lg"
        />
      )}
      <Button
        onClick={() => window.location.reload()}
        variant="outline"
        className={buttonStyle}
      >
        Take Quiz Again
      </Button>
    </div>
  );
}
