'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EmbedCodeGenerator } from '@/components/admin/embed-code-generator';
import type { Quiz, QuizSettings } from '@/types/database';

interface QuizSettingsFormProps {
  quiz: Quiz;
}

export function QuizSettingsForm({ quiz }: QuizSettingsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: quiz.title,
    description: quiz.description || '',
    slug: quiz.slug,
    is_published: quiz.is_published,
    settings: quiz.settings as QuizSettings,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/quizzes/${quiz.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update quiz');
      }

      router.refresh();
    } catch (error) {
      console.error('Error updating quiz:', error);
      alert('Failed to update quiz');
    } finally {
      setLoading(false);
    }
  };

  const togglePublish = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/quizzes/${quiz.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !formData.is_published }),
      });

      if (!response.ok) {
        throw new Error('Failed to update quiz');
      }

      setFormData((prev) => ({ ...prev, is_published: !prev.is_published }));
      router.refresh();
    } catch (error) {
      console.error('Error updating quiz:', error);
      alert('Failed to update quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Basic Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">/q/</span>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={3}
              />
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  id="primaryColor"
                  value={formData.settings.primaryColor}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      settings: { ...prev.settings, primaryColor: e.target.value },
                    }))
                  }
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={formData.settings.primaryColor}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      settings: { ...prev.settings, primaryColor: e.target.value },
                    }))
                  }
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="backgroundColor">Background Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  id="backgroundColor"
                  value={formData.settings.backgroundColor}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      settings: { ...prev.settings, backgroundColor: e.target.value },
                    }))
                  }
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={formData.settings.backgroundColor}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      settings: { ...prev.settings, backgroundColor: e.target.value },
                    }))
                  }
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="buttonStyle">Button Style</Label>
              <Select
                value={formData.settings.buttonStyle}
                onValueChange={(value: 'rounded' | 'square') =>
                  setFormData((prev) => ({
                    ...prev,
                    settings: { ...prev.settings, buttonStyle: value },
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rounded">Rounded</SelectItem>
                  <SelectItem value="square">Square</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL (optional)</Label>
              <Input
                id="logoUrl"
                value={formData.settings.logoUrl || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    settings: { ...prev.settings, logoUrl: e.target.value || null },
                  }))
                }
                placeholder="https://..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Publishing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Status</p>
                <p className="text-sm text-muted-foreground">
                  {formData.is_published
                    ? 'This quiz is publicly accessible'
                    : 'This quiz is in draft mode'}
                </p>
              </div>
              <Badge variant={formData.is_published ? 'default' : 'secondary'}>
                {formData.is_published ? 'Published' : 'Draft'}
              </Badge>
            </div>
            <Button
              type="button"
              variant={formData.is_published ? 'outline' : 'default'}
              onClick={togglePublish}
              disabled={loading}
            >
              {formData.is_published ? 'Unpublish' : 'Publish Quiz'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Embed Code - Full Width */}
      {formData.is_published && (
        <div className="md:col-span-2">
          <EmbedCodeGenerator slug={quiz.slug} />
        </div>
      )}
    </div>
  );
}
