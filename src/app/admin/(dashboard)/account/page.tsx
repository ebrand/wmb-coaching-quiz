export const dynamic = 'force-dynamic';

import Image from 'next/image';
import { requireAdminPage, getRolesFromJwt } from '@/lib/auth/admin-page';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';

export default async function AccountPage() {
  const response = await requireAdminPage();

  const user = response.user;
  const email = user.emails?.[0]?.email ?? '—';
  const firstName = user.name?.first_name ?? '';
  const lastName = user.name?.last_name ?? '';
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || '—';
  const createdAt = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—';

  const googleProvider = user.providers?.find(
    (p) => p.provider_type.toLowerCase() === 'google'
  );
  const profilePicture = googleProvider?.profile_picture_url ?? null;
  const googleId = googleProvider?.provider_subject ?? '—';

  const roles = getRolesFromJwt(response.session_jwt);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Account</h1>

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              {profilePicture ? (
                <Image
                  src={profilePicture}
                  alt={displayName}
                  width={80}
                  height={80}
                  className="rounded-full"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-500 text-2xl font-semibold">
                  {firstName?.[0] ?? email[0]?.toUpperCase() ?? '?'}
                </div>
              )}
              <div>
                <p className="text-lg font-semibold">{displayName}</p>
                <p className="text-muted-foreground">{email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Role(s)</dt>
              <dd>{roles.length > 0 ? roles.join(', ') : '—'}</dd>

              <dt className="text-muted-foreground">Stytch User ID</dt>
              <dd className="font-mono text-xs break-all">{user.user_id}</dd>

              <dt className="text-muted-foreground">Google ID</dt>
              <dd className="font-mono text-xs break-all">{googleId}</dd>

              <dt className="text-muted-foreground">Account Created</dt>
              <dd>{createdAt}</dd>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
