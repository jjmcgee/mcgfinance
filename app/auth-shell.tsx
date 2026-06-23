"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, ReactNode, useEffect, useState } from "react";

type AuthShellProps = {
  children: ReactNode;
};

type AppProfile = {
  email: string;
  display_name: string | null;
};

// Navigation SVGs
const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
  </svg>
);

const OutgoingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const TransfersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
  </svg>
);

const AccountsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
  </svg>
);

const ProfileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export function AuthShell({ children }: AuthShellProps) {
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const pathname = usePathname();

  useEffect(() => {
    void loadProfile();
  }, []);

  async function loadProfile() {
    setLoadingSession(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/auth/me");
      if (response.status === 401) {
        setProfile(null);
        return;
      }

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load profile");
      }

      const nextProfile = (payload.data ?? null) as AppProfile | null;
      setProfile(nextProfile);
      setDisplayNameInput(nextProfile?.display_name ?? "");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load profile");
    } finally {
      setLoadingSession(false);
    }
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSigningIn(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          display_name: displayNameInput.trim() || null
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Authentication failed");
      }

      const nextProfile = (payload.data ?? null) as AppProfile | null;
      setProfile(nextProfile);
      setDisplayNameInput(nextProfile?.display_name ?? "");
      setPassword("");
      setStatusMessage(mode === "login" ? "" : "Account created.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setSigningIn(false);
    }
  }

  async function handleSignOut() {
    setErrorMessage("");
    setStatusMessage("");
    await fetch("/api/auth/logout", { method: "POST" });
    setProfile(null);
    setPassword("");
  }

  if (loadingSession) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
        <p className="label" style={{ fontSize: "1.1rem" }}>Verifying session...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <main className="auth-landing">
        <section className="auth-hero">
          <div className="auth-hero-header">
            <div className="auth-hero-logo">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="#fff" style={{ width: "24px", height: "24px" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="brand-name" style={{ fontSize: "1.5rem" }}>MCG Finance</span>
          </div>
          <h1>Take Control of Your Cashflow</h1>
          <p className="hero-copy">
            Keep recurring bills, multiple accounts, and monthly budgets clear in a professional, high-performance financial dashboard.
          </p>
          <div className="hero-highlights">
            <p>
              <span style={{ fontSize: "1.25rem" }}>💷</span> 
              <span>Track salary and allocate monthly spending floats</span>
            </p>
            <p>
              <span style={{ fontSize: "1.25rem" }}>🏦</span> 
              <span>Route funds and monitor starting balances by account</span>
            </p>
            <p>
              <span style={{ fontSize: "1.25rem" }}>🧾</span> 
              <span>Never miss recurring commitments with smart registers</span>
            </p>
          </div>
        </section>

        <section className="auth-card-wrapper">
          <div className="auth-card card highlight">
            <h2>{mode === "login" ? "Sign In" : "Create Account"}</h2>
            {errorMessage && <p className="error" style={{ marginTop: "0.5rem" }}>{errorMessage}</p>}
            {statusMessage && <p className="badge success" style={{ marginBottom: "1rem", display: "inline-block" }}>{statusMessage}</p>}
            
            <form className="form-grid full-width-btn" onSubmit={handleAuthSubmit} style={{ marginTop: "1rem" }}>
              <label htmlFor="auth-email" style={{ gridColumn: "span 2" }}>
                Email
                <input
                  required
                  id="auth-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                />
              </label>
              <label htmlFor="auth-password" style={{ gridColumn: "span 2" }}>
                Password
                <input
                  required
                  id="auth-password"
                  name="password"
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
              </label>
              {mode === "signup" && (
                <label htmlFor="auth-display-name" style={{ gridColumn: "span 2" }}>
                  Display Name (optional)
                  <input
                    id="auth-display-name"
                    name="display_name"
                    type="text"
                    value={displayNameInput}
                    onChange={(event) => setDisplayNameInput(event.target.value)}
                    autoComplete="name"
                  />
                </label>
              )}
              <button className="action" type="submit" disabled={signingIn}>
                {signingIn ? "Please wait..." : mode === "login" ? "Sign In" : "Register"}
              </button>
            </form>
            
            <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
              <button
                className="action ghost"
                style={{ width: "100%", height: "38px", fontSize: "0.88rem" }}
                type="button"
                disabled={signingIn}
                onClick={() => {
                  setErrorMessage("");
                  setStatusMessage("");
                  setMode((current) => (current === "login" ? "signup" : "login"));
                }}
              >
                {mode === "login" ? "Create a new account" : "Back to Sign In"}
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const userMonogram = (profile.display_name || profile.email).substring(0, 2).toUpperCase();
  const userDisplayName = profile.display_name || profile.email.split("@")[0];

  const menuItems = [
    { name: "Dashboard", href: "/", icon: <HomeIcon /> },
    { name: "Outgoings", href: "/outgoings", icon: <OutgoingsIcon /> },
    { name: "Transfers", href: "/transfers", icon: <TransfersIcon /> },
    { name: "Accounts", href: "/accounts", icon: <AccountsIcon /> },
    { name: "Profile", href: "/profile", icon: <ProfileIcon /> }
  ];

  return (
    <div className="app-layout">
      {/* Desktop Sidebar Navigation */}
      <aside className="desktop-sidebar">
        <div className="brand-section">
          <div className="brand-logo">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="#fff" style={{ width: "20px", height: "20px" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="brand-name">MCG Finance</span>
        </div>

        <nav className="nav-menu">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${pathname === item.href ? "active" : ""}`}
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="user-profile-summary">
            <div className="user-avatar">{userMonogram}</div>
            <div className="user-details">
              <span className="user-name">{userDisplayName}</span>
              <span className="user-email">{profile.email}</span>
            </div>
          </div>
          <button className="action ghost" style={{ height: "36px", fontSize: "0.85rem" }} type="button" onClick={() => void handleSignOut()}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header (Fixed Top) */}
      <header className="mobile-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div className="brand-logo" style={{ width: "28px", height: "28px", fontSize: "1rem" }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="#fff" style={{ width: "16px", height: "16px" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="brand-name" style={{ fontSize: "1.1rem" }}>MCG Finance</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
          <div className="user-avatar" style={{ width: "28px", height: "28px", fontSize: "0.75rem" }}>{userMonogram}</div>
          <button 
            onClick={() => void handleSignOut()} 
            style={{ background: "none", border: "none", color: "var(--danger)", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer", padding: "0.2rem" }}
          >
            Exit
          </button>
        </div>
      </header>

      {/* Main Page Layout Wrapper */}
      <div className="main-wrapper">
        {statusMessage && (
          <div style={{ padding: "1rem 2rem 0" }}>
            <p className="badge success">{statusMessage}</p>
          </div>
        )}
        {errorMessage && (
          <div style={{ padding: "1rem 2rem 0" }}>
            <p className="error">{errorMessage}</p>
          </div>
        )}
        {children}
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-nav-bar">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-nav-item ${pathname === item.href ? "active" : ""}`}
          >
            {item.icon}
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
