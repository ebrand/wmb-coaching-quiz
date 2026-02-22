'use client';

import { useState, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Upload, X, Loader2 } from 'lucide-react';
import { EmbedCodeGenerator } from '@/components/admin/embed-code-generator';
import type { Quiz, QuizSettings } from '@/types/database';

interface QuizSettingsFormProps {
  quiz: Quiz;
}

export function QuizSettingsForm({ quiz }: QuizSettingsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: quiz.title,
    description: quiz.description || '',
    image_url: quiz.image_url || '',
    slug: quiz.slug,
    is_published: quiz.is_published,
    settings: quiz.settings as QuizSettings,
  });

  const [savedFormData, setSavedFormData] = useState({
    title: quiz.title,
    description: quiz.description || '',
    image_url: quiz.image_url || '',
    slug: quiz.slug,
    settings: quiz.settings as QuizSettings,
  });

  const isDirty = useMemo(() => {
    return (
      formData.title !== savedFormData.title ||
      formData.description !== savedFormData.description ||
      formData.image_url !== savedFormData.image_url ||
      formData.slug !== savedFormData.slug ||
      JSON.stringify(formData.settings) !== JSON.stringify(savedFormData.settings)
    );
  }, [formData, savedFormData]);

  const markClean = useCallback(() => {
    setSavedFormData({
      title: formData.title,
      description: formData.description,
      image_url: formData.image_url,
      slug: formData.slug,
      settings: formData.settings,
    });
  }, [formData]);

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: fd,
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Upload failed');
        return;
      }

      const { url } = await response.json();
      setFormData((prev) => ({ ...prev, image_url: url }));
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

  const handleSave = async () => {
    setLoading(true);

    try {
      const response = await fetch(`/api/quizzes/${quiz.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          image_url: formData.image_url || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update quiz');
      }

      markClean();
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
          <div className="space-y-4">
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

            <div className="space-y-2">
              <Label>Quiz Image (optional)</Label>
              {formData.image_url ? (
                <div className="relative inline-block">
                  <img src={formData.image_url} alt="" className="max-h-40 rounded-lg border" />
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, image_url: '' }))}
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
              <p className="text-sm text-muted-foreground">
                Displayed on the quiz intro screen
              </p>
            </div>

          </div>
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
              <Label htmlFor="answerOrder">Answer Order</Label>
              <Select
                value={formData.settings.randomizeAnswers ? 'random' : 'set'}
                onValueChange={(value: string) =>
                  setFormData((prev) => ({
                    ...prev,
                    settings: { ...prev.settings, randomizeAnswers: value === 'random' },
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="set">Show in set order</SelectItem>
                  <SelectItem value="random">Randomize answer order</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Randomize shuffles answer choices for each quiz taker
              </p>
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

            <div className="space-y-2">
              <Label htmlFor="logoSize">Logo Size</Label>
              <Select
                value={formData.settings.logoSize || 'medium'}
                onValueChange={(value: 'small' | 'medium' | 'large') =>
                  setFormData((prev) => ({
                    ...prev,
                    settings: { ...prev.settings, logoSize: value },
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startButtonText">Start Button Text</Label>
              <Input
                id="startButtonText"
                value={formData.settings.startButtonText || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    settings: { ...prev.settings, startButtonText: e.target.value || undefined },
                  }))
                }
                placeholder="Start Quiz"
              />
              <p className="text-sm text-muted-foreground">
                Customize the text on the start button (defaults to &ldquo;Start Quiz&rdquo;)
              </p>
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
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={handleSave}
                disabled={loading || uploading || !isDirty}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                variant={formData.is_published ? 'outline' : 'default'}
                onClick={togglePublish}
                disabled={loading}
              >
                {formData.is_published ? 'Unpublish' : 'Publish Quiz'}
              </Button>
              {formData.is_published && (
                <Button
                  variant="outline"
                  onClick={() => window.open(`/q/${formData.slug}`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Quiz
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Embed Code - Full Width */}
      {formData.is_published && (
        <div className="md:col-span-2">
          <EmbedCodeGenerator slug={quiz.slug} />
        </div>
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
