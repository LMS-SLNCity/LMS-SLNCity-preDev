import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import { MainLayout } from './components/MainLayout';
import { PublicReportView } from './components/PublicReportView';
import { Landing } from './components/Landing';
import TestMenuPage from './components/TestMenuPage';
import { ContactPage } from './components/ContactPage';


const AppContent: React.FC = () => {
    const { user, isLoading } = useAuth();
    const location = useLocation();

    // Check if current route is public (doesn't require authentication)
    const isPublicRoute = location.pathname.startsWith('/verify-report/') || location.pathname === '/test-menu' || location.pathname === '/tests' || location.pathname === '/contact';

    // If it's a public route, render it directly without authentication
    if (isPublicRoute) {
      if (location.pathname === '/test-menu' || location.pathname === '/tests') {
        return <TestMenuPage />;
      }
      if (location.pathname === '/contact') {
        return <ContactPage />;
      }
      return <PublicReportView />;
    }

    // Show landing page for unauthenticated users at root
    if (!isLoading && !user && location.pathname === '/') {
        return <Landing />;
    }

    // Show loading state while restoring session
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 text-lg">Restoring session...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <LoginScreen />;
    }

    return <MainLayout user={user} />;
}

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppProvider>
        <AuthProvider>
          <Routes>
            <Route path="/verify-report/:visitCode" element={<PublicReportView />} />
            <Route path="*" element={<AppContent />} />
          </Routes>
        </AuthProvider>
      </AppProvider>
    </BrowserRouter>
  );
};

export default App;