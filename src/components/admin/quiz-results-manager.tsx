'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Edit, Trash2, GripVertical, Star, Mail } from 'lucide-react';
import { RichTextEditor } from './rich-text-editor';
import type { QuizResult } from '@/types/database';

interface QuizResultsManagerProps {
  quizId: string;
  results: QuizResult[];
}

export function QuizResultsManager({ quizId, results }: QuizResultsManagerProps) {
  const router = useRouter();
  const [editingResult, setEditingResult] = useState<QuizResult | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    email_content: '',
    is_lead: false,
  });

  const resetForm = () => {
    setFormData({ title: '', description: '', image_url: '', email_content: '', is_lead: false });
    setEditingResult(null);
    setIsCreating(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/quiz-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz_id: quizId,
          ...formData,
          display_order: results.length,
        }),
      });

      if (!response.ok) throw new Error('Failed to create result');

      resetForm();
      router.refresh();
    } catch (error) {
      console.error('Error creating result:', error);
      alert('Failed to create result');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResult) return;
    setLoading(true);

    try {
      const response = await fetch(`/api/quiz-results/${editingResult.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to update result');

      resetForm();
      router.refresh();
    } catch (error) {
      console.error('Error updating result:', error);
      alert('Failed to update result');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (resultId: string) => {
    if (!confirm('Are you sure you want to delete this result?')) return;
    setLoading(true);

    try {
      const response = await fetch(`/api/quiz-results/${resultId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete result');

      router.refresh();
    } catch (error) {
      console.error('Error deleting result:', error);
      alert('Failed to delete result');
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (result: QuizResult) => {
    setEditingResult(result);
    setFormData({
      title: result.title,
      description: result.description || '',
      image_url: result.image_url || '',
      email_content: result.email_content || '',
      is_lead: result.is_lead,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <CardTitle>Quiz Results / Outcomes</CardTitle>
        <Dialog open={isCreating} onOpenChange={(open) => {
          if (open) {
            resetForm();
            setIsCreating(true);
          } else {
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Result
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Result</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-result-title">Title</Label>
                <Input
                  id="create-result-title"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., You're a Natural Leader"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-result-description">Description (shown on results page)</Label>
                <Textarea
                  id="create-result-description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description shown immediately after quiz completion..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-result-image">Image URL (optional)</Label>
                <Input
                  id="create-result-image"
                  value={formData.image_url}
                  onChange={(e) => setFormData((prev) => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Email Content
                  <span className="text-muted-foreground font-normal ml-2">- sent to user after completion</span>
                </Label>
                <RichTextEditor
                  value={formData.email_content}
                  onChange={(html) => setFormData((prev) => ({ ...prev, email_content: html }))}
                  placeholder="Write your email content here..."
                />
                <p className="text-xs text-muted-foreground">
                  Use the toolbar to format text and add images. This will be sent to users who complete the quiz with this result.
                </p>
              </div>

              <div className="flex items-center space-x-2 pt-2 pb-2 border-t border-b">
                <Checkbox
                  id="create-result-is-lead"
                  checked={formData.is_lead}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_lead: checked === true }))}
                />
                <Label htmlFor="create-result-is-lead" className="flex items-center gap-2 cursor-pointer">
                  <Star className="w-4 h-4 text-yellow-500" />
                  Mark as Lead
                  <span className="text-muted-foreground font-normal">- users with this result are flagged as leads</span>
                </Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Create Result'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {results.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No results defined yet.</p>
            <p className="text-sm mt-1">
              Results are the possible outcomes of your quiz. Add at least one result before creating questions.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((result) => (
              <div
                key={result.id}
                className="flex items-center gap-3 p-3 border rounded-lg bg-white"
              >
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{result.title}</p>
                    {result.is_lead && (
                      <Badge variant="secondary" className="text-xs">
                        <Star className="w-3 h-3 mr-1 text-yellow-500" />
                        Lead
                      </Badge>
                    )}
                    {result.email_content && (
                      <Badge variant="outline" className="text-xs">
                        <Mail className="w-3 h-3 mr-1" />
                        Email
                      </Badge>
                    )}
                  </div>
                  {result.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {result.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Dialog open={editingResult?.id === result.id} onOpenChange={(open) => {
                    if (!open) resetForm();
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(result)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Edit Result</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleUpdate} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-result-title">Title</Label>
                          <Input
                            id="edit-result-title"
                            value={formData.title}
                            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                            placeholder="e.g., You're a Natural Leader"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="edit-result-description">Description (shown on results page)</Label>
                          <Textarea
                            id="edit-result-description"
                            value={formData.description}
                            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                            placeholder="Brief description shown immediately after quiz completion..."
                            rows={3}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="edit-result-image">Image URL (optional)</Label>
                          <Input
                            id="edit-result-image"
                            value={formData.image_url}
                            onChange={(e) => setFormData((prev) => ({ ...prev, image_url: e.target.value }))}
                            placeholder="https://..."
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>
                            Email Content
                            <span className="text-muted-foreground font-normal ml-2">- sent to user after completion</span>
                          </Label>
                          <RichTextEditor
                            value={formData.email_content}
                            onChange={(html) => setFormData((prev) => ({ ...prev, email_content: html }))}
                            placeholder="Write your email content here..."
                          />
                          <p className="text-xs text-muted-foreground">
                            Use the toolbar to format text and add images. This will be sent to users who complete the quiz with this result.
                          </p>
                        </div>

                        <div className="flex items-center space-x-2 pt-2 pb-2 border-t border-b">
                          <Checkbox
                            id="edit-result-is-lead"
                            checked={formData.is_lead}
                            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_lead: checked === true }))}
                          />
                          <Label htmlFor="edit-result-is-lead" className="flex items-center gap-2 cursor-pointer">
                            <Star className="w-4 h-4 text-yellow-500" />
                            Mark as Lead
                            <span className="text-muted-foreground font-normal">- users with this result are flagged as leads</span>
                          </Label>
                        </div>

                        <div className="flex gap-2">
                          <Button type="submit" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                          </Button>
                          <Button type="button" variant="outline" onClick={resetForm}>
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
                    onClick={() => handleDelete(result.id)}
                    disabled={loading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
