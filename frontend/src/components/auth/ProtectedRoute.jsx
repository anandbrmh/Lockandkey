import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { selectIsAuthenticated, selectCurrentUser } from '../../features/auth/authSlice';
import { checkStaffProfile, selectStaff } from '../../features/staff/staffSlice';

export default function ProtectedRoute({ children, requireStaffComplete = false, allowIncompleteStaff = false }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectCurrentUser);
  const { completed, checked, loading } = useSelector(selectStaff);
  const dispatch = useDispatch();

  useEffect(() => {
    if (isAuthenticated && user?.role === 'staff' && !checked && !loading) {
      dispatch(checkStaffProfile());
    }
  }, [isAuthenticated, user, checked, loading, dispatch]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Staff gate: if user is staff and profile not completed, force to /staff/complete
  // Except when allowIncompleteStaff is true (the onboarding page itself)
  if (user?.role === 'staff' && !allowIncompleteStaff && checked && !completed) {
    return <Navigate to="/staff/complete" replace />;
  }

  // Optional: require staff completion for certain routes (wizard/history)
  if (requireStaffComplete && user?.role === 'staff' && checked && !completed) {
    return <Navigate to="/staff/complete" replace />;
  }

  return children;
}

// Dedicated gate for staff onboarding — redirects completed staff away from onboarding to wizard
export function StaffCompleteGate({ children }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectCurrentUser);
  const { completed, checked } = useSelector(selectStaff);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // Non-staff users don't need this page — send to wizard
  if (user?.role !== 'staff' && checked) {
    return <Navigate to="/wizard" replace />;
  }
  return children;
}
