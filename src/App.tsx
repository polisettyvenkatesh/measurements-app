import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { AuthScreen } from '@/auth/AuthScreen';
import { useRouter, navigate } from '@/lib/router';
import { AppShell } from '@/components/AppShell';
import { Dashboard } from '@/screens/Dashboard';
import { SheetEditor } from '@/screens/SheetEditor';
import { SavedSheets } from '@/screens/SavedSheets';
import { AdminBusinesses } from '@/screens/AdminBusinesses';
import { AdminUsers } from '@/screens/AdminUsers';
import { isSuperAdmin } from '@/lib/roles';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

function Routes({ route }: { route: ReturnType<typeof useRouter> }) {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  if (route.path === '/admin/users' || route.path === '/admin/businesses') {
    if (!isAdmin) {
      navigate('/dashboard');
      return <Dashboard />;
    }
  }

  if (route.path === '/dashboard') return <Dashboard />;
  if (route.path === '/sheet') {
    const id = route.param ?? 'new';
    return <SheetEditor key={id} sheetId={id} />;
  }
  if (route.path === '/sheets') return <SavedSheets />;
  if (route.path === '/admin/businesses') return <AdminBusinesses />;
  if (route.path === '/admin/users') return <AdminUsers />;
  return <Dashboard />;
}

function Inner() {
  const { session, profile, loading } = useAuth();
  const route = useRouter();

  useEffect(() => {
    if (session && (window.location.hash === '' || window.location.hash === '#' || window.location.hash === '#/')) {
      navigate('/dashboard');
    }
  }, [session]);

  useEffect(() => {
    if (profile && isSuperAdmin(profile)) {
      const hash = window.location.hash;
      if (hash === '' || hash === '#' || hash === '#/' || hash === '#/dashboard') {
        navigate('/admin/businesses');
      }
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
      </div>
    );
  }

  if (!session) return <AuthScreen />;

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-slate-500 gap-3">
        <div className="flex items-center"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading profile...</div>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-slate-600 underline hover:text-slate-900"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <AppShell route={route}>
      <Routes route={route} />
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Inner />
    </AuthProvider>
  );
}