import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import HomePage from '../pages/HomePage';
import WizardPage from '../pages/WizardPage';
import HistoryPage from '../pages/HistoryPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import StaffOnboardingPage from '../pages/StaffOnboardingPage';
import StaffDirectoryPage from '../pages/StaffDirectoryPage';
import LocksDirectoryPage from '../pages/LocksDirectoryPage';
import AdminSettingsPage from '../pages/AdminSettingsPage';
import AdminStaffDashboard from '../pages/AdminStaffDashboard';
import { motion, AnimatePresence } from 'framer-motion';

// Page Transition wrapper component
const PageWrapper = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="w-full flex-1"
    >
      {children}
    </motion.div>
  );
};

// Animated routing orchestrator
const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <PageWrapper>
              <HomePage />
            </PageWrapper>
          }
        />
        <Route path="/login" element={<PageWrapper><LoginPage /></PageWrapper>} />
        <Route path="/register" element={<PageWrapper><RegisterPage /></PageWrapper>} />
        <Route
          path="/staff/complete"
          element={
            <ProtectedRoute allowIncompleteStaff>
              <PageWrapper>
                <StaffOnboardingPage />
              </PageWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/wizard"
          element={
            <ProtectedRoute requireStaffComplete requireAdminOrSubadmin>
              <PageWrapper>
                <WizardPage />
              </PageWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/wizard/edit/:id"
          element={
            <ProtectedRoute requireStaffComplete requireAdminOrSubadmin>
              <PageWrapper>
                <WizardPage />
              </PageWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute requireAdmin>
              <PageWrapper>
                <AdminSettingsPage />
              </PageWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/staff"
          element={
            <ProtectedRoute requireAdmin>
              <PageWrapper>
                <AdminStaffDashboard />
              </PageWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute requireStaffComplete>
              <PageWrapper>
                <HistoryPage />
              </PageWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff-directory"
          element={
            <ProtectedRoute requireStaffComplete>
              <PageWrapper>
                <StaffDirectoryPage />
              </PageWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/locks-directory"
          element={
            <ProtectedRoute requireStaffComplete>
              <PageWrapper>
                <LocksDirectoryPage />
              </PageWrapper>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AnimatePresence>
  );
};

export default function AppRouter() {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen bg-white text-zinc-900">
        <Navbar />
        {/* bottom padding on mobile to avoid fixed bottom bar overlap; left padding on desktop for fixed sidebar */}
        <main className="flex-1 w-full relative pb-20 md:pb-0 md:pl-16">
          <AnimatedRoutes />
        </main>
      </div>
    </BrowserRouter>
  );
}
