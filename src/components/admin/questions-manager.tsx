'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Edit, Trash2, ChevronDown, ChevronUp, Upload, X, Loader2, ImageIcon, GripVertical } from 'lucide-react';
import { AnswerResultWiring } from './answer-result-wiring';
import type { QuizResult, Question, Answer, AnswerResultWeight } from '@/types/database';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface QuestionWithAnswers extends Question {
  answers: (Answer & { answer_result_weights: AnswerResultWeight[] })[];
}

interface QuestionsManagerProps {
  quizId: string;
  questions: QuestionWithAnswers[];
  results: QuizResult[];
}

// Sortable question card sub-component
function SortableQuestionCard({
  question,
  qIndex,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  editDialog,
  children,
}: {
  question: QuestionWithAnswers;
  qIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  editDialog: React.ReactNode;
  children?: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style}>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              className="cursor-grab active:cursor-grabbing touch-none p-1 text-muted-foreground hover:text-foreground shrink-0"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="w-4 h-4" />
            </button>
            <button
              className="flex items-center gap-2 text-left flex-1 min-w-0"
              onClick={onToggle}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 shrink-0" />
              )}
              <span className="text-muted-foreground shrink-0">Q{qIndex + 1}.</span>
              <span className="font-medium truncate">{question.question_text}</span>
              {question.image_url && (
                <ImageIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}
            </button>
          </div>
          <div className="flex gap-1">
            {editDialog}
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="border-t pt-4">
          {children}
        </CardContent>
      )}
    </Card>
  );
}

export function QuestionsManager({ quizId, questions, results }: QuestionsManagerProps) {
  const router = useRouter();
  const [orderedQuestions, setOrderedQuestions] = useState<QuestionWithAnswers[]>(questions);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [isCreatingQuestion, setIsCreatingQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(false);

  const [questionForm, setQuestionForm] = useState({ question_text: '', image_url: '' });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync orderedQuestions from props when they change (e.g. after router.refresh)
  useEffect(() => {
    setOrderedQuestions(questions);
  }, [questions]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleQuestionDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedQuestions.findIndex((q) => q.id === active.id);
    const newIndex = orderedQuestions.findIndex((q) => q.id === over.id);
    const reordered = arrayMove(orderedQuestions, oldIndex, newIndex);

    // Optimistic update
    setOrderedQuestions(reordered);

    try {
      const response = await fetch('/api/questions/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: reordered.map((q) => q.id) }),
      });

      if (!response.ok) throw new Error('Failed to reorder questions');
      router.refresh();
    } catch (error) {
      console.error('Error reordering questions:', error);
      // Revert on failure
      setOrderedQuestions(questions);
      alert('Failed to reorder questions');
    }
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Upload failed');
        return;
      }

      const { url } = await response.json();
      setQuestionForm((prev) => ({ ...prev, image_url: url }));
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    e.target.value = '';
  };

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
          image_url: questionForm.image_url || null,
          display_order: orderedQuestions.length,
        }),
      });

      if (!response.ok) throw new Error('Failed to create question');

      setQuestionForm({ question_text: '', image_url: '' });
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
        body: JSON.stringify({
          question_text: questionForm.question_text,
          image_url: questionForm.image_url || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update question');
      }

      setEditingQuestion(null);
      setQuestionForm({ question_text: '', image_url: '' });
      router.refresh();
    } catch (error) {
      console.error('Error updating question:', error);
      alert(error instanceof Error ? error.message : 'Failed to update question');
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
                  onChange={(e) => setQuestionForm((prev) => ({ ...prev, question_text: e.target.value }))}
                  placeholder="Enter your question..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Image (optional)</Label>
                {questionForm.image_url ? (
                  <div className="relative inline-block">
                    <img src={questionForm.image_url} alt="" className="max-h-40 rounded-lg border" />
                    <button
                      type="button"
                      onClick={() => setQuestionForm((prev) => ({ ...prev, image_url: '' }))}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
                      ) : (
                        <><Upload className="w-4 h-4 mr-2" />Upload Image</>
                      )}
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={loading || uploading}>
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

      {orderedQuestions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>No questions yet. Click &quot;Add Question&quot; to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleQuestionDragEnd}
        >
          <SortableContext
            items={orderedQuestions.map((q) => q.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {orderedQuestions.map((question, qIndex) => (
                <SortableQuestionCard
                  key={question.id}
                  question={question}
                  qIndex={qIndex}
                  isExpanded={expandedQuestions.has(question.id)}
                  onToggle={() => toggleQuestion(question.id)}
                  onEdit={() => {
                    setEditingQuestion(question);
                    setQuestionForm({ question_text: question.question_text, image_url: question.image_url || '' });
                  }}
                  onDelete={() => handleDeleteQuestion(question.id)}
                  editDialog={
                    <Dialog
                      open={editingQuestion?.id === question.id}
                      onOpenChange={(open) => {
                        if (!open) {
                          setEditingQuestion(null);
                          setQuestionForm({ question_text: '', image_url: '' });
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingQuestion(question);
                            setQuestionForm({ question_text: question.question_text, image_url: question.image_url || '' });
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
                              onChange={(e) => setQuestionForm((prev) => ({ ...prev, question_text: e.target.value }))}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Image (optional)</Label>
                            {questionForm.image_url ? (
                              <div className="relative inline-block">
                                <img src={questionForm.image_url} alt="" className="max-h-40 rounded-lg border" />
                                <button
                                  type="button"
                                  onClick={() => setQuestionForm((prev) => ({ ...prev, image_url: '' }))}
                                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={uploading}
                                  onClick={() => fileInputRef.current?.click()}
                                >
                                  {uploading ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
                                  ) : (
                                    <><Upload className="w-4 h-4 mr-2" />Upload Image</>
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button type="submit" disabled={loading || uploading}>Save</Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setEditingQuestion(null);
                                setQuestionForm({ question_text: '', image_url: '' });
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  }
                >
                  <AnswersManager
                    questionId={question.id}
                    answers={question.answers || []}
                    results={results}
                  />
                </SortableQuestionCard>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={onFileSelect}
        className="hidden"
      />
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
  const [loading, setLoading] = useState(false);

  const handleCreateAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
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

      setNewAnswerText('');
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

  const handleReorderAnswers = async (orderedIds: string[]) => {
    try {
      const response = await fetch('/api/answers/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
      });

      if (!response.ok) throw new Error('Failed to reorder answers');
      router.refresh();
    } catch (error) {
      console.error('Error reordering answers:', error);
      alert('Failed to reorder answers');
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
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {answers.length > 0 && (
        <AnswerResultWiring
          answers={answers}
          results={results}
          onDeleteAnswer={handleDeleteAnswer}
          onReorderAnswers={handleReorderAnswers}
        />
      )}

      {answers.length === 0 && !isCreating && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No answers yet. Add answers for this question.
        </p>
      )}
    </div>
  );
}
