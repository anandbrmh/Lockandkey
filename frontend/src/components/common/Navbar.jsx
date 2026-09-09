import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  KeyRound,
  PlusCircle,
  Home,
  Menu,
  X,
  LogOut,
  LogIn,
  UserPlus,
  Lock,
  Users,
} from 'lucide-react';
import { selectIsAuthenticated, selectCurrentUser, logout } from '../../features/auth/authSlice';
import { resetWizard } from '../../features/wizard/wizardSlice';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const currentUser = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    dispatch(resetWizard());
    navigate('/login');
    setIsOpen(false);
  };

  const handleNewClick = () => {
    dispatch(resetWizard());
    setIsOpen(false);
  };

  // Exactly 4 items for desktop: Home, Locks, Users, Create New
  const desktopItems = [
    { to: '/', label: 'Home', icon: Home, color: 'bg-sky-50 text-sky-600 border-sky-100' },
    { to: '/locks-directory', label: 'Locks', icon: Lock, color: 'bg-violet-50 text-violet-600 border-violet-100' },
    { to: '/assigned-users', label: 'Users', icon: Users, color: 'bg-blue-50 text-blue-600 border-blue-100' },
    { to: '/wizard', label: 'Create New', icon: PlusCircle, color: 'bg-emerald-50 text-emerald-600 border-emerald-100', onClick: handleNewClick },
  ];

  // Mobile bottom bar: exactly 3 icons — Create, Users, Lock (no Home)
  const mobileItems = [
    { to: '/wizard', label: 'Create', icon: PlusCircle, color: 'bg-emerald-50 text-emerald-600 border-emerald-100', onClick: handleNewClick },
    { to: '/assigned-users', label: 'Users', icon: Users, color: 'bg-blue-50 text-blue-600 border-blue-100' },
    { to: '/locks-directory', label: 'Locks', icon: Lock, color: 'bg-violet-50 text-violet-600 border-violet-100' },
  ];

  const NavItem = ({ item, size = 'default' }) => {
    const Icon = item.icon;
    return (
      <NavLink
        to={item.to}
        onClick={item.onClick}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
            isActive
              ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
              : 'bg-white text-zinc-600 border-transparent hover:bg-zinc-50 hover:text-zinc-900 hover:border-zinc-200'
          } ${size === 'compact' ? 'py-2' : ''}`
        }
      >
        {({ isActive }) => (
          <>
            <span className={`h-8 w-8 rounded-lg border flex items-center justify-center shrink-0 ${isActive ? 'bg-white/15 border-white/20 text-white' : item.color}`}>
              <Icon className="h-4 w-4" />
            </span>
            <span className="truncate">{item.label}</span>
          </>
        )}
      </NavLink>
    );
  };

  return (
    <>
      {/* Desktop sidebar — exactly 4 icons */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-[260px] bg-white border-r border-zinc-200 z-40 flex-col">
        {/* Brand */}
        <div className="h-[64px] flex items-center gap-3 px-5 border-b border-zinc-100 shrink-0">
          <div className="h-9 w-9 rounded-xl bg-sky-500 flex items-center justify-center text-white shadow-sm shrink-0">
            <KeyRound className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-bold tracking-tight leading-none text-zinc-900">LOCK & KEY</div>
            <div className="text-[11px] font-medium text-zinc-400 leading-none mt-1">Handover System</div>
          </div>
        </div>

        {/* Navigation — only 4 items */}
        <div className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          <div className="text-[11px] font-semibold tracking-widest uppercase text-zinc-400 px-2 mb-3">Navigate</div>
          <nav className="space-y-1.5">
            {desktopItems.map((item) => (
              <NavItem key={item.to} item={item} />
            ))}
          </nav>
      
        </div>

        {/* User */}
        <div className="border-t border-zinc-100 p-3 shrink-0 bg-zinc-50/50">
          {isAuthenticated ? (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl bg-white border border-zinc-200 shadow-sm">
                <div className="h-9 w-9 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {(currentUser?.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold leading-none truncate text-zinc-900">{currentUser?.name}</div>
                  <div className="text-xs text-zinc-500 capitalize truncate mt-0.5">{currentUser?.role || 'Staff'}</div>
                </div>
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              </div>
              <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white border border-zinc-200 text-zinc-700 text-sm font-medium hover:bg-zinc-50 transition-colors">
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <NavLink to="/login" className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-700 text-sm font-medium hover:bg-zinc-50">
                <LogIn className="h-4 w-4" /> Login
              </NavLink>
              <NavLink to="/register" className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-black">
                <UserPlus className="h-4 w-4" /> Register
              </NavLink>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile top bar */}
      <nav className="md:hidden sticky top-0 z-40 w-full bg-white/95 backdrop-blur border-b border-zinc-200">
        <div className="px-4">
          <div className="flex h-[56px] items-center justify-between gap-4">
            <NavLink to="/" className="flex items-center gap-2.5">
              <span className="h-8 w-8 rounded-xl bg-sky-500 flex items-center justify-center text-white">
                <KeyRound className="h-4 w-4" />
              </span>
              <span className="text-sm font-bold tracking-tight">LOCK & KEY</span>
            </NavLink>
            <button onClick={() => setIsOpen(!isOpen)} className="h-9 w-9 rounded-xl border border-zinc-200 bg-white flex items-center justify-center">
              {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {isOpen && (
          <div className="border-t border-zinc-100 bg-white px-4 py-4 space-y-3">
            <div className="grid grid-cols-1 gap-1.5">
              {desktopItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => { setIsOpen(false); if (item.onClick) item.onClick(); }}
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium ${isActive ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white border-zinc-200 text-zinc-700'}`}
                  >
                    <Icon className="h-4 w-4" /> {item.label}
                  </NavLink>
                );
              })}
            </div>
            {isAuthenticated ? (
              <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl border border-zinc-200 bg-white text-sm font-medium">
                <LogOut className="h-4 w-4" /> Logout — {currentUser?.name}
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <NavLink to="/login" onClick={() => setIsOpen(false)} className="flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl border border-zinc-200 bg-white text-sm font-medium"><LogIn className="h-4 w-4" /> Login</NavLink>
                <NavLink to="/register" onClick={() => setIsOpen(false)} className="flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl bg-zinc-900 text-white text-sm font-medium"><UserPlus className="h-4 w-4" /> Register</NavLink>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Mobile bottom bar — exactly 3 icons: Create, Users, Lock */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-zinc-200 px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] ">
        <div className="grid grid-cols-3 gap-2">
          {mobileItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={item.onClick}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 py-2.5 rounded-2xl border text-xs font-semibold transition-all ${isActive ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm' : 'bg-zinc-50 border-zinc-200 text-zinc-600'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`h-7 w-7 rounded-xl border flex items-center justify-center ${isActive ? 'bg-white/15 border-white/20 text-white' : item.color}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="leading-none">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    </>
  );
}
