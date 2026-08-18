import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider, useAuth } from '@/lib/auth-context';
import { AccountReviewPage } from '@/pages/account-review';
import { AdvisoryPage } from '@/pages/advisory';
import { BuyersPage } from '@/pages/buyers';
import { DashboardPage } from '@/pages/dashboard';
import { FarmersPage } from '@/pages/farmers';
import { LoginPage } from '@/pages/login';
import { MessagesPage } from '@/pages/messages';
import { SettingsPage } from '@/pages/settings';

function ConsoleRoutes() {
  const { session, loading, signOut } = useAuth();
  const handleSignOut = () => {
    void signOut();
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--animo-muted)' }}>
        Naglo-load…
      </div>
    );
  }

  const guard = (element: React.ReactNode) =>
    session ? element : <Navigate to="/login" replace />;

  return (
    <Routes>
      <Route
        path="/login"
        element={session ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route path="/dashboard" element={guard(<DashboardPage onSignOut={handleSignOut} />)} />
      <Route path="/advisory" element={guard(<AdvisoryPage onSignOut={handleSignOut} />)} />
      <Route path="/messages" element={guard(<MessagesPage onSignOut={handleSignOut} />)} />
      <Route path="/farmers" element={guard(<FarmersPage onSignOut={handleSignOut} />)} />
      <Route path="/buyers" element={guard(<BuyersPage onSignOut={handleSignOut} />)} />
      <Route
        path="/account-review/:type/:id"
        element={guard(<AccountReviewPage onSignOut={handleSignOut} />)}
      />
      <Route path="/account-review/:id" element={guard(<AccountReviewPage onSignOut={handleSignOut} />)} />
      <Route path="/settings" element={guard(<SettingsPage onSignOut={handleSignOut} />)} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

/** LGU Console shell with Supabase email/password auth. */
export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ConsoleRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
