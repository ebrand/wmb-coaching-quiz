import Link from 'next/link';
import { LayoutDashboard, FileQuestion, Users } from 'lucide-react';
import { requireAdminPage } from '@/lib/auth/admin-page';
import { LogoutButton } from '@/components/admin/logout-button';

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-neutral-900 text-white flex flex-col">
        <div className="p-4 border-b border-neutral-800">
          <h1 className="text-xl font-bold">Culture Coach Wendy</h1>
        </div>
        <nav className="p-4 flex-1">
          <ul className="space-y-2">
            <li>
              <Link
                href="/admin"
                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-neutral-800 transition-colors"
              >
                <LayoutDashboard className="w-5 h-5" />
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/admin/quizzes"
                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-neutral-800 transition-colors"
              >
                <FileQuestion className="w-5 h-5" />
                Quizzes
              </Link>
            </li>
            <li>
              <Link
                href="/admin/leads"
                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-neutral-800 transition-colors"
              >
                <Users className="w-5 h-5" />
                Leads
              </Link>
            </li>
          </ul>
        </nav>
        <div className="p-4 border-t border-neutral-800">
          <LogoutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-neutral-50">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
