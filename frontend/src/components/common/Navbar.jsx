import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { KeyRound, History, PlusCircle, Home, Menu, X, LogOut, LogIn, UserPlus } from 'lucide-react';
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

  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/wizard', label: 'New', icon: PlusCircle },
    { to: '/history', label: 'History', icon: History },
  ];

  const linkCls = ({ isActive }) =>
    `flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wide rounded-md border ${
      isActive ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-900'
    }`;

  const sidebarLinkCls = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-3 rounded-md border text-xs font-mono uppercase tracking-wide transition-colors ${
      isActive ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-900'
    }`;

  return (
    <>
      {/* Desktop vertical sidebar — icons only, hover to reveal names */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-16 hover:w-56 bg-white border-r border-zinc-200 z-40 flex-col group/sidebar overflow-hidden transition-all duration-200 ease-out">
        {/* logo */}
        <div className="h-14 flex items-center gap-3 px-3 border-b border-zinc-200 shrink-0 overflow-hidden">
          <span className="h-8 w-8 border border-zinc-900 rounded-md flex items-center justify-center bg-white shrink-0">
            <KeyRound className="h-4 w-4" />
          </span>
          <span className="font-sans text-sm font-semibold tracking-tight whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">LOCK & KEY</span>
        </div>

        {/* nav */}
        <nav className="flex-1 flex flex-col gap-2 p-2 pt-4 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={item.to === '/wizard' ? handleNewClick : undefined}
              className={sidebarLinkCls}
              title={item.label}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap overflow-hidden opacity-0 w-0 group-hover/sidebar:opacity-100 group-hover/sidebar:w-auto transition-all duration-200">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* auth / user */}
        <div className="border-t border-zinc-200 p-2 flex flex-col gap-2 shrink-0 overflow-hidden">
          {isAuthenticated ? (
            <>
              <div className="flex items-center gap-3 px-2 py-2 overflow-hidden">
                <span className="h-7 w-7 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-mono shrink-0">
                  {(currentUser?.name || 'U').charAt(0).toUpperCase()}
                </span>
                <div className="flex flex-col overflow-hidden opacity-0 w-0 group-hover/sidebar:opacity-100 group-hover/sidebar:w-auto transition-all duration-200">
                  <span className="text-xs font-mono font-medium truncate leading-none">{currentUser?.name}</span>
                  <span className="text-[10px] font-mono text-zinc-500 truncate">{currentUser?.role}</span>
                </div>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-zinc-900 bg-white text-zinc-900 text-xs font-mono uppercase tracking-wide hover:bg-zinc-900 hover:text-white transition-colors w-full" title="Logout">
                <LogOut className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap overflow-hidden opacity-0 w-0 group-hover/sidebar:opacity-100 group-hover/sidebar:w-auto transition-all duration-200">Logout</span>
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-zinc-200 bg-white text-zinc-700 text-xs font-mono uppercase tracking-wide hover:border-zinc-900 transition-colors" title="Login">
                <LogIn className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap overflow-hidden opacity-0 w-0 group-hover/sidebar:opacity-100 group-hover/sidebar:w-auto transition-all duration-200">Login</span>
              </NavLink>
              <NavLink to="/register" className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-zinc-900 bg-zinc-900 text-white text-xs font-mono uppercase tracking-wide" title="Register">
                <UserPlus className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap overflow-hidden opacity-0 w-0 group-hover/sidebar:opacity-100 group-hover/sidebar:w-auto transition-all duration-200">Register</span>
              </NavLink>
            </>
          )}
          <div className="hidden group-hover/sidebar:flex text-[10px] font-mono text-zinc-400 px-2 whitespace-nowrap overflow-hidden opacity-0 group-hover/sidebar:opacity-100 transition-opacity">Hover to expand</div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <nav className="md:hidden sticky top-0 z-40 w-full bg-white border-b border-zinc-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-4">
            <NavLink to="/" className="flex items-center gap-2">
              <span className="h-8 w-8 border border-zinc-900 rounded-md flex items-center justify-center bg-white">
                <KeyRound className="h-4 w-4" />
              </span>
              <span className="font-sans text-sm font-semibold tracking-tight">LOCK & KEY</span>
            </NavLink>
            <button onClick={() => setIsOpen(!isOpen)} className="h-9 w-9 border border-zinc-900 rounded-md flex items-center justify-center bg-white">
              {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {isOpen && (
          <div className="border-t border-zinc-200 bg-white px-4 py-3 space-y-2">
            <div className="flex gap-2">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} onClick={() => { setIsOpen(false); if (item.to === '/wizard') handleNewClick(); }} className={linkCls}>
                  <item.icon className="h-3.5 w-3.5" />{item.label}
                </NavLink>
              ))}
            </div>
            {isAuthenticated ? (
              <button onClick={handleLogout} className="w-full wire-btn justify-between text-xs">
                Logout — {currentUser?.name} <LogOut className="h-3.5 w-3.5" />
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <NavLink to="/login" onClick={() => setIsOpen(false)} className="wire-btn text-xs"><LogIn className="h-3.5 w-3.5" /> Login</NavLink>
                <NavLink to="/register" onClick={() => setIsOpen(false)} className="wire-btn wire-btn-primary text-xs"><UserPlus className="h-3.5 w-3.5" /> Register</NavLink>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Mobile bottom */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-zinc-200 px-2 py-2">
        <div className="flex gap-1">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} onClick={item.to === '/wizard' ? handleNewClick : undefined} className={({ isActive }) => `flex-1 flex flex-col items-center gap-1 py-2 rounded-md border text-[11px] font-mono uppercase ${isActive ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white border-zinc-200'}`}>
              <item.icon className="h-4 w-4" />{item.label}
            </NavLink>
          ))}
        </div>
      </div>
    </>
  );
}
