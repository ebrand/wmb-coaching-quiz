'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import type { QuizResult, Question, Answer, AnswerResultWeight } from '@/types/database';

interface QuestionWithAnswers extends Question {
  answers: (Answer & { answer_result_weights: AnswerResultWeight[] })[];
}

interface QuestionsManagerProps {
  quizId: string;
  questions: QuestionWithAnswers[];
  results: QuizResult[];
}

export function QuestionsManager({ quizId, questions, results }: QuestionsManagerProps) {
  const router = useRouter();
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [isCreatingQuestion, setIsCreatingQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(false);

  const [questionForm, setQuestionForm] = useState({ question_text: '' });

  const toggleQuestion = (questionId: string) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
    }
    setExpandedQuestions(newExpanded);
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz_id: quizId,
          question_text: questionForm.question_text,
          display_order: questions.length,
        }),
      });

      if (!response.ok) throw new Error('Failed to create question');

      setQuestionForm({ question_text: '' });
      setIsCreatingQuestion(false);
      router.refresh();
    } catch (error) {
      console.error('Error creating question:', error);
      alert('Failed to create question');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;
    setLoading(true);

    try {
      const response = await fetch(`/api/questions/${editingQuestion.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_text: questionForm.question_text }),
      });

      if (!response.ok) throw new Error('Failed to update question');

      setEditingQuestion(null);
      setQuestionForm({ question_text: '' });
      router.refresh();
    } catch (error) {
      console.error('Error updating question:', error);
      alert('Failed to update question');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Delete this question and all its answers?')) return;
    setLoading(true);

    try {
      const response = await fetch(`/api/questions/${questionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete question');
      router.refresh();
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Failed to delete question');
    } finally {
      setLoading(false);
    }
  };

  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>You need to create at least one result before adding questions.</p>
          <p className="text-sm mt-1">Go to the Results tab to add quiz outcomes.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Questions</h3>
        <Dialog open={isCreatingQuestion} onOpenChange={setIsCreatingQuestion}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Question</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateQuestion} className="space-y-4">
              <div className="space-y-2">
                <Label>Question Text</Label>
                <Input
                  value={questionForm.question_text}
                  onChange={(e) => setQuestionForm({ question_text: e.target.value })}
                  placeholder="Enter your question..."
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Question'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsCreatingQuestion(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {questions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>No questions yet. Click &quot;Add Question&quot; to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {questions.map((question, qIndex) => (
            <Card key={question.id}>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <button
                    className="flex items-center gap-2 text-left flex-1"
                    onClick={() => toggleQuestion(question.id)}
                  >
                    {expandedQuestions.has(question.id) ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                    <span className="text-muted-foreground">Q{qIndex + 1}.</span>
                    <span className="font-medium">{question.question_text}</span>
                  </button>
                  <div className="flex gap-1">
                    <Dialog
                      open={editingQuestion?.id === question.id}
                      onOpenChange={(open) => {
                        if (!open) {
                          setEditingQuestion(null);
                          setQuestionForm({ question_text: '' });
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingQuestion(question);
                            setQuestionForm({ question_text: question.question_text });
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Question</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleUpdateQuestion} className="space-y-4">
                          <div className="space-y-2">
                            <Label>Question Text</Label>
                            <Input
                              value={questionForm.question_text}
                              onChange={(e) => setQuestionForm({ question_text: e.target.value })}
                              required
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button type="submit" disabled={loading}>Save</Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setEditingQuestion(null);
                                setQuestionForm({ question_text: '' });
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteQuestion(question.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {expandedQuestions.has(question.id) && (
                <CardContent className="border-t pt-4">
                  <AnswersManager
                    questionId={question.id}
                    answers={question.answers || []}
                    results={results}
                  />
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Answers Manager Sub-component
interface AnswersManagerProps {
  questionId: string;
  answers: (Answer & { answer_result_weights: AnswerResultWeight[] })[];
  results: QuizResult[];
}

function AnswersManager({ questionId, answers, results }: AnswersManagerProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [newAnswerText, setNewAnswerText] = useState('');
  const [newAnswerIsCorrect, setNewAnswerIsCorrect] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreateAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create the answer
      const answerResponse = await fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: questionId,
          answer_text: newAnswerText,
          display_order: answers.length,
        }),
      });

      if (!answerResponse.ok) throw new Error('Failed to create answer');

      const newAnswer = await answerResponse.json();

      // Only create a weight if this is a correct answer (worth 1 point)
      if (newAnswerIsCorrect && results.length > 0) {
        await fetch('/api/answer-weights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            answer_id: newAnswer.id,
            result_id: results[0].id, // Use first result as placeholder
            weight: 1,
          }),
        });
      }

      setNewAnswerText('');
      setNewAnswerIsCorrect(false);
      setIsCreating(false);
      router.refresh();
    } catch (error) {
      console.error('Error creating answer:', error);
      alert('Failed to create answer');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnswer = async (answerId: string) => {
    if (!confirm('Delete this answer?')) return;

    try {
      const response = await fetch(`/api/answers/${answerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete answer');
      router.refresh();
    } catch (error) {
      console.error('Error deleting answer:', error);
      alert('Failed to delete answer');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-medium text-sm text-muted-foreground">Answers</h4>
        {!isCreating && (
          <Button size="sm" variant="outline" onClick={() => setIsCreating(true)}>
            <Plus className="w-3 h-3 mr-1" />
            Add Answer
          </Button>
        )}
      </div>

      {isCreating && (
        <form onSubmit={handleCreateAnswer} className="space-y-3 p-3 border rounded-lg bg-neutral-50">
          <div className="space-y-2">
            <Label className="text-sm">Answer Text</Label>
            <Input
              value={newAnswerText}
              onChange={(e) => setNewAnswerText(e.target.value)}
              placeholder="Enter answer text..."
              required
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="new-answer-correct"
              checked={newAnswerIsCorrect}
              onCheckedChange={(checked) => setNewAnswerIsCorrect(checked === true)}
            />
            <Label htmlFor="new-answer-correct" className="text-sm cursor-pointer">
              Correct answer (worth 1 point)
            </Label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? 'Adding...' : 'Add Answer'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setIsCreating(false);
                setNewAnswerText('');
                setNewAnswerIsCorrect(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {answers.length === 0 && !isCreating ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No answers yet. Add answers for this question.
        </p>
      ) : (
        <div className="space-y-2">
          {answers.map((answer) => (
            <AnswerRow
              key={answer.id}
              answer={answer}
              results={results}
              onDelete={() => handleDeleteAnswer(answer.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Single Answer Row with correct/incorrect toggle
interface AnswerRowProps {
  answer: Answer & { answer_result_weights: AnswerResultWeight[] };
  results: QuizResult[];
  onDelete: () => void;
}

function AnswerRow({ answer, results, onDelete }: AnswerRowProps) {
  const router = useRouter();

  // Answer is "correct" if it has any weight assigned
  const hasWeight = answer.answer_result_weights.length > 0;
  const [isCorrect, setIsCorrect] = useState(hasWeight);
  const [loading, setLoading] = useState(false);

  const handleCorrectToggle = async (checked: boolean) => {
    setLoading(true);
    setIsCorrect(checked);

    try {
      if (checked) {
        // Add weight (make it worth 1 point)
        if (results.length > 0) {
          await fetch('/api/answer-weights', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              answer_id: answer.id,
              result_id: results[0].id,
              weight: 1,
            }),
          });
        }
      } else {
        // Remove all weights for this answer
        for (const weight of answer.answer_result_weights) {
          await fetch(`/api/answer-weights?answer_id=${answer.id}&result_id=${weight.result_id}`, {
            method: 'DELETE',
          });
        }
      }
      router.refresh();
    } catch (error) {
      console.error('Error updating answer:', error);
      setIsCorrect(!checked); // Revert on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`border rounded-lg p-3 ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
      <div className="flex items-center gap-3">
        <Checkbox
          checked={isCorrect}
          onCheckedChange={(checked) => handleCorrectToggle(checked === true)}
          disabled={loading}
        />
        <div className="flex-1 min-w-0">
          <p className={`font-medium truncate ${isCorrect ? 'text-green-800' : ''}`}>
            {answer.answer_text}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isCorrect && (
            <span className="text-xs text-green-600 font-medium">+1 point</span>
          )}
          <Button variant="ghost" size="sm" className="text-destructive" onClick={onDelete}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
