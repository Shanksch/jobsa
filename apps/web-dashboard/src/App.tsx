import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Layout } from "./components/Layout.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { ProfilePage } from "./pages/ProfilePage.js";
import { ResumesPage } from "./pages/ResumesPage.js";
import { ResumeDetailPage } from "./pages/ResumeDetailPage.js";
import { KnowledgeBasePage } from "./pages/KnowledgeBasePage.js";
import { ApplicationsPage } from "./pages/ApplicationsPage.js";
import { SettingsPage } from "./pages/SettingsPage.js";
import { LoginPage } from "./pages/LoginPage.js";
import { LandingPage } from "./pages/LandingPage.js";
import { AuthProvider, useAuth } from "./contexts/AuthContext.js";
import { Toaster } from "@jobsa/ui";
import { Loader2 } from "lucide-react";

function ProtectedRoute() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" closeButton richColors />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/resumes" element={<ResumesPage />} />
            <Route path="/resumes/:id" element={<ResumeDetailPage />} />
            <Route path="/knowledge" element={<KnowledgeBasePage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
