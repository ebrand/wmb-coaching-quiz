import Link from 'next/link';
import { LayoutDashboard, FileQuestion, Users } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-neutral-900 text-white">
        <div className="p-4 border-b border-neutral-800">
          <h1 className="text-xl font-bold">Quiz Admin</h1>
        </div>
        <nav className="p-4">
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
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-neutral-50">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
