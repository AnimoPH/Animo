import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AdvisoryPage } from '@/pages/advisory';
import { DashboardPage } from '@/pages/dashboard';
import { FarmersPage } from '@/pages/farmers';
import { LoginPage } from '@/pages/login';
import { MessagesPage } from '@/pages/messages';
import { SettingsPage } from '@/pages/settings';

/**
 * LGU Console shell.
 *
 * Auth is stubbed for the scaffold — signing in flips local state and routes to
 * the dashboard. Swap `signedIn` for the real session hook when the API lands.
 */
export function App() {
  const [signedIn, setSignedIn] = useState(false);
  const signOut = () => setSignedIn(false);

  /** Console routes render only when signed in; otherwise bounce to login. */
  const guard = (element: React.ReactNode) =>
    signedIn ? element : <Navigate to="/login" replace />;

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            signedIn ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LoginPage onSignIn={() => setSignedIn(true)} />
            )
          }
        />
        <Route path="/dashboard" element={guard(<DashboardPage onSignOut={signOut} />)} />
        <Route path="/advisory" element={guard(<AdvisoryPage onSignOut={signOut} />)} />
        <Route path="/messages" element={guard(<MessagesPage onSignOut={signOut} />)} />
        <Route path="/farmers" element={guard(<FarmersPage onSignOut={signOut} />)} />
        <Route path="/settings" element={guard(<SettingsPage onSignOut={signOut} />)} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
