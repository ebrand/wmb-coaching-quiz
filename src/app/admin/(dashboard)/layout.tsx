import { requireAdminPage } from '@/lib/auth/admin-page';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const response = await requireAdminPage();

  const user = response.user;
  const email = user.emails?.[0]?.email ?? '';
  const firstName = user.name?.first_name ?? '';
  const lastName = user.name?.last_name ?? '';
  const displayName = [firstName, lastName].filter(Boolean).join(' ');
  const googleProvider = user.providers?.find(
    (p) => p.provider_type.toLowerCase() === 'google'
  );
  const profilePicture = googleProvider?.profile_picture_url ?? null;

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <AdminSidebar
        displayName={displayName}
        email={email}
        profilePicture={profilePicture}
        firstName={firstName}
      />

      {/* Main content */}
      <main className="flex-1 bg-neutral-50">
        <div className="p-4 md:p-8 pt-18 md:pt-8">{children}</div>
      </main>
    </div>
  );
}
