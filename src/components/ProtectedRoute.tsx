import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { hasActivePasswordRecoveryFlag } from "../lib/supabase";

export const ProtectedRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, isPasswordRecovery } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-10 h-10 rounded-full border-3 border-emerald-500 border-t-transparent animate-spin" />
        <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-semibold tracking-wider uppercase animate-pulse">
          Validando Sessão Segura...
        </span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isPasswordRecovery || hasActivePasswordRecoveryFlag()) {
    return <Navigate to="/reset-password" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
