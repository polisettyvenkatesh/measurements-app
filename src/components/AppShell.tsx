import { LayoutDashboard, FilePlus2, FolderOpen, LogOut, Ruler, Building2, Users } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { roleTitle } from '@/lib/roles';
import { navigate, type Route } from '@/lib/router';
import { useState, type ReactNode } from 'react';

interface NavItem {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
  match: (r: Route) => boolean;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, match: (r) => r.path === '/dashboard' },
  { label: 'New Sheet', path: '/sheet/new', icon: FilePlus2, match: (r) => r.path === '/sheet' && r.param === 'new' },
  { label: 'Saved Sheets', path: '/sheets', icon: FolderOpen, match: (r) => r.path === '/sheets' },
  { label: 'Businesses', path: '/admin/businesses', icon: Building2, match: (r) => r.path === '/admin/businesses', adminOnly: true },
  { label: 'Users', path: '/admin/users', icon: Users, match: (r) => r.path === '/admin/users', adminOnly: true },
];

export function AppShell({ route, children }: { route: Route; children: ReactNode }) {
  const { user, profile, signOut } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isAdmin = profile?.role === 'admin';
  const visibleNav = NAV.filter((item) => !item.adminOnly || isAdmin);

  const go = (path: string) => {
    navigate(path);
    setMobileNavOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 bg-white border-r border-slate-200 flex-col">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-slate-200">
          <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center">
            <Ruler className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-sm">Granite &amp; Block</div>
            <div className="text-xs text-slate-500">Measurement Sheets</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleNav.map((item) => {
            const active = item.match(route);
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => go(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4.5 h-4.5" size={18} />
                {item.label}
                {item.adminOnly && <span className="ml-auto text-[9px] uppercase font-bold text-blue-500">Admin</span>}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-200">
          <div className="px-3 pb-1 text-xs text-slate-500 truncate" title={user?.email ?? ''}>
            {user?.email}
          </div>
          {isAdmin && <div className="px-3 pb-2 text-[10px] font-semibold text-blue-600 uppercase">{profile ? roleTitle(profile) : 'Admin'}</div>}
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      <header className="md:hidden sticky top-0 z-20 bg-white border-b border-slate-200 h-14 flex items-center px-4 justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
            <Ruler className="w-4 h-4 text-white" strokeWidth={2} />
          </div>
          <span className="font-semibold text-sm">Measurement Sheets</span>
        </div>
        <button
          onClick={() => setMobileNavOpen((o) => !o)}
          className="p-2 rounded-lg hover:bg-slate-100"
          aria-label="Menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
      </header>

      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-30" onClick={() => setMobileNavOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute right-0 top-0 bottom-0 w-64 bg-white shadow-xl p-4 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1 flex-1 overflow-y-auto">
              {visibleNav.map((item) => {
                const active = item.match(route);
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => go(item.path)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium ${
                      active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                    {item.adminOnly && <span className="ml-auto text-[9px] uppercase font-bold text-blue-500">Admin</span>}
                  </button>
                );
              })}
            </div>
            <div className="border-t border-slate-200 pt-3">
              <div className="px-3 pb-2 text-xs text-slate-500 truncate">{user?.email}</div>
              {isAdmin && <div className="px-3 pb-2 text-[10px] font-semibold text-blue-600 uppercase">{profile ? roleTitle(profile) : 'Admin'}</div>}
              <button
                onClick={() => { signOut(); setMobileNavOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                <LogOut size={18} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="md:pl-60">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">{children}</div>
      </main>
    </div>
  );
}