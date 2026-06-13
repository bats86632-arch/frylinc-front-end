import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Role } from "../types";
import { Flame } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { currentUser, userData, loading, hasRole } = useAuth();
  const location = useLocation();

  // Kick off the Dashboard chunk download as soon as this component mounts.
  // On cache-miss visits this runs during the auth loading phase, so the chunk
  // is ready (or nearly ready) the moment auth resolves and the router renders it.
  useEffect(() => {
    void import("../pages/Dashboard");
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center console-bg">
        <div className="flex flex-col items-center gap-5 animate-fade-in">
          <div className="relative">
            <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-gradient-to-br from-red-500 to-amber-400 shadow-lg shadow-red-950/40 ring-1 ring-white/10">
              <Flame className="h-7 w-7 text-white" />
            </div>
            <div className="absolute -inset-2 animate-pulse-ring rounded-[18px] border border-amber-400/20" />
          </div>
          <div className="flex items-center gap-2.5">
            <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[13px] font-medium text-slate-400">
              Loading Fyrlinc…
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Neither the Firebase SDK nor the localStorage cache has a user → send to login.
  // This covers both: clean logouts and first-ever visits with no cache.
  if (!currentUser && !userData) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
