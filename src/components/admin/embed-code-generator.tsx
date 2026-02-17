'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Check } from 'lucide-react';

interface EmbedCodeGeneratorProps {
  slug: string;
}

export function EmbedCodeGenerator({ slug }: EmbedCodeGeneratorProps) {
  const [width, setWidth] = useState('100%');
  const [height, setHeight] = useState('600');
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || '';

  const quizUrl = `${baseUrl}/q/${slug}`;

  const iframeCode = `<iframe
  src="${quizUrl}"
  width="${width}"
  height="${height}px"
  frameborder="0"
  allow="clipboard-write"
  style="border: none; max-width: 100%;"
></iframe>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(iframeCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Embed Code</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="width">Width</Label>
            <Input
              id="width"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              placeholder="100% or 600"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="height">Height (px)</Label>
            <Input
              id="height"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="600"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Direct URL</Label>
          <div className="flex gap-2">
            <Input value={quizUrl} readOnly />
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigator.clipboard.writeText(quizUrl)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Embed Code (iframe)</Label>
          <Textarea
            value={iframeCode}
            readOnly
            rows={6}
            className="font-mono text-sm"
          />
          <Button onClick={handleCopy} variant="outline" className="w-full">
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Embed Code
              </>
            )}
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Preview</Label>
          <div
            className="border rounded-lg overflow-hidden bg-neutral-100"
            style={{ height: '300px' }}
          >
            <iframe
              src={quizUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              style={{ border: 'none' }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
