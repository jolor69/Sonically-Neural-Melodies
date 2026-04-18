import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash || "";
    const match = hash.match(/session_id=([^&]+)/);
    if (!match) {
      navigate("/login", { replace: true });
      return;
    }
    const sessionId = match[1];

    (async () => {
      try {
        const res = await api.post("/auth/oauth/session", { session_id: sessionId });
        setUser(res.data.user);
        // Remove hash and navigate to dashboard
        window.history.replaceState({}, document.title, "/dashboard");
        navigate("/dashboard", { replace: true, state: { user: res.data.user } });
      } catch (e) {
        navigate("/login?error=oauth_failed", { replace: true });
      }
    })();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0C]">
      <div className="flex flex-col items-center gap-3 text-white">
        <div className="flex items-end h-10 text-[#E28C22]">
          <span className="mini-bar" style={{ height: 20, animationDelay: "0ms" }} />
          <span className="mini-bar" style={{ height: 32, animationDelay: "120ms" }} />
          <span className="mini-bar" style={{ height: 24, animationDelay: "240ms" }} />
          <span className="mini-bar" style={{ height: 36, animationDelay: "360ms" }} />
        </div>
        <div className="label-overline">Signing you in</div>
      </div>
    </div>
  );
}
