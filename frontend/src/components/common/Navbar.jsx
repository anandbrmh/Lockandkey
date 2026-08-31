import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { KeyRound, History, PlusCircle, Home, Menu, X, LogOut, LogIn, UserPlus } from 'lucide-react';
import { selectIsAuthenticated, selectCurrentUser, logout } from '../../features/auth/authSlice';
import DarkModeToggle from './DarkModeToggle';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const currentUser = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
    setIsOpen(false);
  };

  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/wizard', label: 'New Record', icon: PlusCircle },
    { to: '/history', label: 'History', icon: History },
  ];

  return (
    <>
      <nav className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 dark:border-slate-800/80 dark:bg-slate-950/80 backdrop-blur-md transition-colors duration-300">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo and Brand */}
            <NavLink to="/" className="flex items-center gap-2.5 focus:outline-none">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-600 to-amber-600 text-white shadow-md shadow-primary-500/20">
                <KeyRound className="h-5.5 w-5.5" />
              </div>
              <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-lg font-bold tracking-tight text-transparent dark:from-white dark:to-slate-200">
                Lock & Key <span className="font-medium text-primary-600 dark:text-primary-400">Vault</span>
              </span>
            </NavLink>

            {/* Desktop Nav Items — horizontal */}
            <div className="hidden md:flex items-center gap-6">
              <div className="flex items-center gap-1.5">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all focus:outline-none ${
                        isActive
                          ? 'bg-primary-50 text-primary-600 dark:bg-primary-950/50 dark:text-primary-400'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 hover:text-slate-900 dark:hover:text-slate-100'
                      }`
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-850" />
              <DarkModeToggle />
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 hidden lg:inline">{currentUser?.name} ({currentUser?.role})</span>
                  <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30">
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <NavLink to="/login" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900">
                    <LogIn className="h-4 w-4" /> Login
                  </NavLink>
                  <NavLink to="/register" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700">
                    <UserPlus className="h-4 w-4" /> Register
                  </NavLink>
                </div>
              )}
            </div>

            {/* Mobile Right Bar — only dark toggle + hamburger, nav goes to bottom bar */}
            <div className="flex items-center gap-3 md:hidden">
              <DarkModeToggle />
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900 focus:outline-none"
                aria-label="Toggle navigation menu"
              >
                {isOpen ? <X className="h-5.5 w-5.5" /> : <Menu className="h-5.5 w-5.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer — for account actions only; nav icons are in bottom bar */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-slate-950 px-4 py-3 space-y-1.5"
            >
              {isAuthenticated ? (
                <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-medium">
                  <LogOut className="h-5 w-5" /> Logout ({currentUser?.name} — {currentUser?.role})
                </button>
              ) : (
                <div className="flex gap-2">
                  <NavLink to="/login" onClick={() => setIsOpen(false)} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                    <LogIn className="h-4 w-4" /> Login
                  </NavLink>
                  <NavLink to="/register" onClick={() => setIsOpen(false)} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary-600 text-white font-medium">
                    <UserPlus className="h-4 w-4" /> Register
                  </NavLink>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Mobile Bottom Horizontal Bar — all nav icons below, fixed */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-around gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-wide transition-all flex-1 ${
                  isActive
                    ? 'bg-primary-50 text-primary-600 dark:bg-primary-950/50 dark:text-primary-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
          {/* Auth icons also in bottom bar for quick access */}
          {isAuthenticated ? (
            <button onClick={handleLogout} className="flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-bold text-red-500 flex-1">
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          ) : (
            <>
              <NavLink to="/login" className={({ isActive }) => `flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-bold flex-1 ${isActive ? 'bg-primary-50 text-primary-600 dark:bg-primary-950/50 dark:text-primary-400' : 'text-slate-500 dark:text-slate-400'}`}>
                <LogIn className="h-5 w-5" />
                <span>Login</span>
              </NavLink>
              <NavLink to="/register" className={({ isActive }) => `flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-bold flex-1 ${isActive ? 'bg-primary-600 text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                <UserPlus className="h-5 w-5" />
                <span>Register</span>
              </NavLink>
            </>
          )}
        </div>
      </div>
    </>
  );
}
