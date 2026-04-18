import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0C]">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-end h-10 text-[#E28C22]">
            <span className="mini-bar" style={{ height: 20, animationDelay: "0ms" }} />
            <span className="mini-bar" style={{ height: 32, animationDelay: "120ms" }} />
            <span className="mini-bar" style={{ height: 24, animationDelay: "240ms" }} />
            <span className="mini-bar" style={{ height: 36, animationDelay: "360ms" }} />
          </div>
          <div className="label-overline">Loading</div>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}
