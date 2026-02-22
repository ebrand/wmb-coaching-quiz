'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Mail } from 'lucide-react';

interface AdminNotificationSettingsProps {
  initialNotifyAdmin: boolean;
  initialEmail: string;
  defaultEmail: string;
}

export function AdminNotificationSettings({
  initialNotifyAdmin,
  initialEmail,
  defaultEmail,
}: AdminNotificationSettingsProps) {
  const [notifyAdmin, setNotifyAdmin] = useState(initialNotifyAdmin);
  const [email, setEmail] = useState(initialEmail);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    try {
      const response = await fetch('/api/app-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notify_admin: notifyAdmin,
          admin_notification_email: email || null,
        }),
      });

      if (!response.ok) throw new Error('Failed to save settings');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="py-4 px-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Admin Notifications</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Checkbox
              id="notifyAdmin"
              checked={notifyAdmin}
              onCheckedChange={(checked) => setNotifyAdmin(checked === true)}
            />
            <Label htmlFor="notifyAdmin" className="text-sm cursor-pointer">
              Send on quiz completion
            </Label>
          </div>

          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={defaultEmail || 'admin@example.com'}
            disabled={!notifyAdmin}
            className="max-w-xs text-sm"
          />

          <Button
            size="sm"
            variant="outline"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
