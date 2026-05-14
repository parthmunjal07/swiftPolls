import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Layout } from "./components/layout/Layout";

import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { DashboardPage } from "./pages/DashboardPage";
import { PollBuilderPage } from "./pages/PollBuilderPage";
import { PollAnalyticsPage } from "./pages/PollAnalyticsPage";
import { PresenterPage } from "./pages/PresenterPage";
import { AudiencePage } from "./pages/AudiencePage";
import { AsyncPollPage } from "./pages/AsyncPollPage";
import { EditPollPage } from "./pages/EditPollPage";
import { AuthSuccessPage } from "./pages/AuthSuccessPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="flex h-screen items-center justify-center"><span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const LayoutWrapper = () => (
  <Layout>
    <Outlet />
  </Layout>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <Router>
              <Routes>
                {/* ── Routes with standard Layout ── */}
                <Route element={<LayoutWrapper />}>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route
                    path="/dashboard"
                    element={
                      <PrivateRoute>
                        <DashboardPage />
                      </PrivateRoute>
                    }
                  />
                </Route>

                {/* ── Routes without standard Layout (full-screen) ── */}

                {/* Poll Builder — private */}
                <Route
                  path="/polls/create"
                  element={
                    <PrivateRoute>
                      <PollBuilderPage />
                    </PrivateRoute>
                  }
                />

                {/* Edit Poll — private */}
                <Route
                  path="/polls/:id/edit"
                  element={
                    <PrivateRoute>
                      <EditPollPage />
                    </PrivateRoute>
                  }
                />

                {/* Analytics — private */}
                <Route
                  path="/polls/:id"
                  element={
                    <PrivateRoute>
                      <PollAnalyticsPage />
                    </PrivateRoute>
                  }
                />

                {/* Presenter View — private */}
                <Route
                  path="/present/:sessionId"
                  element={
                    <PrivateRoute>
                      <PresenterPage />
                    </PrivateRoute>
                  }
                />

                {/* Audience join — public */}
                <Route path="/join/:code" element={<AudiencePage />} />
                <Route path="/join" element={<AudiencePage />} />

                {/* Async public poll — public */}
                <Route path="/poll/:slug" element={<AsyncPollPage />} />

                {/* Google OAuth landing — public */}
                <Route path="/auth-success" element={<AuthSuccessPage />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
