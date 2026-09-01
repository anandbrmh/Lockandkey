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
    { to: '/', label: 'Home', icon: Home, note: '01' },
    { to: '/wizard', label: 'New Record', icon: PlusCircle, note: '02' },
    { to: '/history', label: 'History', icon: History, note: '03' },
  ];

  return (
    <>
      {/* WIREFRAME NAV - thick border, grid paper, sketch */}
      <nav className="sticky top-0 z-40 w-full bg-paper border-b-[3px] border-ink relative">
        {/* top measurement ruler */}
        <div className="hidden md:flex h-5 bg-ink text-white text-[9px] font-mono tracking-widest items-center px-4 gap-4">
          <span>┌ WIREFRAME v0.1 — LO-FI — GRID 24px ─┐</span>
          <span className="ml-auto">✎ LOCK & KEY VAULT • SKETCH MODE</span>
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-[64px] items-center justify-between gap-4">
            {/* Logo - placeholder box with X */}
            <NavLink to="/" className="flex items-center gap-3 group">
              <div className="h-11 w-11 bg-white border-2 border-ink flex items-center justify-center relative shadow-[3px_3px_0_0_#111] rotate-[-0.8deg] group-hover:rotate-[0.8deg] transition-transform">
                <div className="absolute inset-0 wire-placeholder opacity-20" />
                <KeyRound className="h-5 w-5 text-ink relative z-10" />
                <span className="absolute -top-1.5 -right-1.5 bg-ink text-white text-[7px] font-mono px-1 border border-ink">LOGO</span>
              </div>
              <div className="leading-none">
                <div className="font-display text-[18px] font-bold tracking-tight text-ink flex items-baseline gap-1">
                  LOCK <span className="font-mono text-[11px] bg-ink text-white px-1.5 py-0.5 rotate-[1deg]"> & KEY</span>
                  <span className="text-[9px] font-mono border border-ink px-1 ml-1">VAULT</span>
                </div>
                <div className="font-mono text-[9px] tracking-[0.18em] text-zinc-500">[ WIREFRAME ] DRAFT — NOT FINAL</div>
              </div>
            </NavLink>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-3">
              <div className="flex items-center gap-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `relative flex items-center gap-2 px-4 py-2 border-2 font-mono text-xs font-bold uppercase tracking-widest transition-none ${
                        isActive
                          ? 'bg-ink text-white border-ink shadow-[3px_3px_0_0_#111] -rotate-[0.5deg]'
                          : 'bg-white text-ink border-ink hover:bg-yellow-50 shadow-[2px_2px_0_0_#111]'
                      }`
                    }
                  >
                    <span className="text-[8px] opacity-50">[{item.note}]</span>
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
              <div className="h-8 w-[2px] bg-ink mx-1 rotate-[2deg]" />
              <div className="border-2 border-ink bg-white p-1 shadow-[2px_2px_0_0_#111]">
                <DarkModeToggle />
              </div>
              {isAuthenticated ? (
                <div className="flex items-center gap-2 border-2 border-dashed border-ink bg-yellow-50 px-3 py-1.5 rotate-[0.3deg]">
                  <span className="text-[10px] font-mono">● {currentUser?.name} [{currentUser?.role}]</span>
                  <button onClick={handleLogout} className="wire-btn !py-1 !px-2 !text-[11px] !shadow-[2px_2px_0_0_#111]">
                    <LogOut className="h-3 w-3" /> Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <NavLink to="/login" className="wire-btn !py-2 !px-3">
                    <LogIn className="h-4 w-4" /> Login
                  </NavLink>
                  <NavLink to="/register" className="wire-btn wire-btn-primary !py-2 !px-3">
                    <UserPlus className="h-4 w-4" /> Register
                  </NavLink>
                </div>
              )}
            </div>

            {/* Mobile */}
            <div className="flex items-center gap-2 md:hidden">
              <div className="border-2 border-ink p-1 bg-white">
                <DarkModeToggle />
              </div>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="h-11 w-11 bg-white border-2 border-ink flex items-center justify-center shadow-[3px_3px_0_0_#111] font-mono text-xs"
              >
                {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t-[3px] border-ink bg-paper px-4 py-3 space-y-2"
            >
              {isAuthenticated ? (
                <button onClick={handleLogout} className="w-full wire-btn justify-between">
                  <span>Logout — {currentUser?.name} [{currentUser?.role}]</span> <LogOut className="h-4 w-4" />
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <NavLink to="/login" onClick={() => setIsOpen(false)} className="wire-btn">
                    <LogIn className="h-4 w-4" /> Login
                  </NavLink>
                  <NavLink to="/register" onClick={() => setIsOpen(false)} className="wire-btn wire-btn-primary">
                    <UserPlus className="h-4 w-4" /> Register
                  </NavLink>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Mobile bottom bar wireframe */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-paper border-t-[3px] border-ink px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-around gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1.5 border-2 text-[10px] font-mono font-bold uppercase flex-1 ${
                  isActive ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-ink border-dashed'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              <span>[{item.note}] {item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </>
  );
}
