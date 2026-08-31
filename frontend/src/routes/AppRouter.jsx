import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import HomePage from '../pages/HomePage';
import WizardPage from '../pages/WizardPage';
import HistoryPage from '../pages/HistoryPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
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
          path="/wizard"
          element={
            <ProtectedRoute>
              <PageWrapper>
                <WizardPage />
              </PageWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/wizard/edit/:id"
          element={
            <ProtectedRoute>
              <PageWrapper>
                <WizardPage />
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
      </Routes>
    </AnimatePresence>
  );
};

export default function AppRouter() {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-300">
        <Navbar />
        {/* bottom padding on mobile to avoid fixed bottom bar overlap */}
        <main className="flex-1 w-full relative pb-20 md:pb-0">
          <AnimatedRoutes />
        </main>
      </div>
    </BrowserRouter>
  );
}
