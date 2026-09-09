import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import HomePage from '../pages/HomePage';
import WizardPage from '../pages/WizardPage';
import HistoryPage from '../pages/HistoryPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import LocksDirectoryPage from '../pages/LocksDirectoryPage';
import AdminSettingsPage from '../pages/AdminSettingsPage';
import AssignedUsersPage from '../pages/AssignedUsersPage';
import { motion, AnimatePresence } from 'framer-motion';

// Page Transition wrapper component — instant on first PWA load to avoid black flash
const PageWrapper = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="w-full flex-1 bg-[#f8f9fb]"
    >
      {children}
    </motion.div>
  );
};

// Animated routing orchestrator
const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
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
          path="/wizard"
          element={
            <ProtectedRoute requireAdmin>
              <PageWrapper>
                <WizardPage />
              </PageWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/wizard/edit/:id"
          element={
            <ProtectedRoute requireAdmin>
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
          path="/history"
          element={
            <ProtectedRoute>
              <PageWrapper>
                <HistoryPage />
              </PageWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/locks-directory"
          element={
            <ProtectedRoute requireAdmin>
              <PageWrapper>
                <LocksDirectoryPage />
              </PageWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/assigned-users"
          element={
            <ProtectedRoute requireAdmin>
              <PageWrapper>
                <AssignedUsersPage />
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
      <div className="flex flex-col min-h-screen bg-[#f8f9fb] text-zinc-900">
        <Navbar />
        {/* left padding for fixed 260px sidebar, mobile bottom bar */}
        <main className="flex-1 w-full relative pb-20 md:pb-0 md:pl-[260px]">
          <AnimatedRoutes />
        </main>
      </div>
    </BrowserRouter>
  );
}
