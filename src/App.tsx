import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { AppProvider } from './lib/app-context';
import { ErrorBoundary } from './components/LoadingScreen';
import MainApp from './MainApp';
import AuthModal from './components/AuthModal';
import { useState } from 'react';

export default function App() {
  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null);

  return (
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <AppProvider>
            <Routes>
              <Route path="/" element={<MainApp onAuthRequired={setAuthModal} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            {authModal && (
              <AuthModal
                initialMode={authModal}
                onClose={() => setAuthModal(null)}
              />
            )}
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
