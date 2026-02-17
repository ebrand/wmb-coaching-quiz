'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileQuestion, Users, UserCircle, Menu } from 'lucide-react';
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet';
import { LogoutButton } from '@/components/admin/logout-button';

interface AdminSidebarProps {
  displayName: string;
  email: string;
  profilePicture: string | null;
  firstName: string;
}

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/quizzes', label: 'Quizzes', icon: FileQuestion },
  { href: '/admin/leads', label: 'Leads', icon: Users },
  { href: '/admin/account', label: 'Account', icon: UserCircle },
];

function SidebarContent({
  displayName,
  email,
  profilePicture,
  firstName,
  pathname,
  onNavClick,
}: AdminSidebarProps & { pathname: string; onNavClick?: () => void }) {
  return (
    <div className="flex flex-col h-full text-white" style={{ backgroundColor: '#c9952d' }}>
      <div className="p-4 border-b border-white/20">
        <h1 className="text-xl font-bold">Culture Coach Wendy</h1>
      </div>
      <nav className="p-4 flex-1">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavClick}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    isActive ? 'bg-white/30 font-semibold' : 'hover:bg-white/20'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-4 border-t border-white/20 space-y-3">
        <Link
          href="/admin/account"
          onClick={onNavClick}
          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/20 transition-colors"
        >
          {profilePicture ? (
            <Image
              src={profilePicture}
              alt={displayName || email}
              width={32}
              height={32}
              className="rounded-full shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {(firstName?.[0] || email[0] || '?').toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            {displayName && (
              <p className="text-sm font-medium truncate">{displayName}</p>
            )}
            <p className="text-xs text-white/70 truncate">{email}</p>
          </div>
        </Link>
        <LogoutButton />
      </div>
    </div>
  );
}

export function AdminSidebar(props: AdminSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div
        className="fixed top-0 left-0 right-0 z-40 flex items-center h-14 px-4 md:hidden text-white"
        style={{ backgroundColor: '#c9952d' }}
      >
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="p-2 -ml-2 hover:bg-white/20 rounded-md">
              <Menu className="w-6 h-6" />
              <span className="sr-only">Open menu</span>
            </button>
          </SheetTrigger>
          <SheetContent>
            <SidebarContent
              {...props}
              pathname={pathname}
              onNavClick={() => setOpen(false)}
            />
          </SheetContent>
        </Sheet>
        <span className="ml-3 text-lg font-bold">Culture Coach Wendy</span>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col">
        <SidebarContent {...props} pathname={pathname} />
      </aside>
    </>
  );
}
