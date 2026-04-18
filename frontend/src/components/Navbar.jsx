import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogOut, Music4 } from "lucide-react";

export default function Navbar({ variant = "app" }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="glass border-b border-[#2A2A35] sticky top-0 z-40" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group" data-testid="nav-logo">
          <div className="w-8 h-8 rounded-md bg-[#E28C22] flex items-center justify-center text-[#0A0A0C] group-hover:rotate-12 transition-transform">
            <Music4 size={18} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-xl font-black tracking-tight" style={{ fontFamily: "Outfit" }}>
              Sonically
            </span>
            <span className="label-overline text-[8px] mt-0.5 text-[#A855F7]">
              by Neural Melodies
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8 label-overline">
          {variant === "landing" ? (
            <>
              <a href="#presets" data-testid="nav-presets">Presets</a>
              <a href="#pricing" data-testid="nav-pricing">Pricing</a>
              <a href="#engineers" data-testid="nav-engineers">Engineers</a>
            </>
          ) : (
            <>
              <Link to="/dashboard" data-testid="nav-dashboard">Dashboard</Link>
              <Link to="/pricing" data-testid="nav-app-pricing">Pricing</Link>
              {user?.is_admin && (
                <Link to="/admin" data-testid="nav-admin" className="text-[#A855F7]">Admin</Link>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="hidden sm:inline-block text-sm text-white/80 hover:text-white"
                data-testid="nav-user-name"
              >
                {user.name}
              </Link>
              <span className="hidden md:inline-block label-overline text-[#E28C22]" data-testid="nav-tier">
                {user.subscription_tier}
              </span>
              <button
                onClick={() => { logout(); navigate("/"); }}
                className="p-2 rounded-md border border-[#2A2A35] hover:border-[#E28C22] hover:text-[#E28C22] transition"
                data-testid="nav-logout"
                aria-label="Logout"
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm text-white/80 hover:text-white"
                data-testid="nav-login"
              >
                Log in
              </Link>
              <Link
                to="/login?mode=signup"
                className="bg-[#E28C22] text-[#0A0A0C] font-semibold px-4 py-2 rounded-md hover:bg-[#F5A138] transition text-sm"
                data-testid="nav-signup"
              >
                Launch App
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
