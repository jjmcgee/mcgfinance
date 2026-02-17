"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";

type AuthShellProps = {
  children: ReactNode;
};

type AppProfile = {
  email: string;
  display_name: string | null;
};

export function AuthShell({ children }: AuthShellProps) {
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

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

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProfile(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const response = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayNameInput.trim() || null
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save display name");
      }

      const nextProfile = (payload.data ?? null) as AppProfile | null;
      setProfile(nextProfile);
      setDisplayNameInput(nextProfile?.display_name ?? "");
      setStatusMessage("Display name updated.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save display name");
    } finally {
      setSavingProfile(false);
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
      <main>
        <div className="card">
          <p className="label">Loading session...</p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main>
        <h1>Monthly Expenses</h1>
        <section className="card">
          <h2>{mode === "login" ? "Sign In" : "Create Account"}</h2>
          {errorMessage && <p className="error">{errorMessage}</p>}
          {statusMessage && <p className="label">{statusMessage}</p>}
          <form className="form-grid" onSubmit={handleAuthSubmit}>
            <label>
              Email
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </label>
            <label>
              Password
              <input
                required
                type="password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </label>
            {mode === "signup" && (
              <label>
                Display Name (optional)
                <input
                  type="text"
                  value={displayNameInput}
                  onChange={(event) => setDisplayNameInput(event.target.value)}
                  autoComplete="name"
                />
              </label>
            )}
            <button className="action" type="submit" disabled={signingIn}>
              {signingIn ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>
          <div className="session-header-actions">
            <button
              className="action ghost"
              type="button"
              disabled={signingIn}
              onClick={() => {
                setErrorMessage("");
                setStatusMessage("");
                setMode((current) => (current === "login" ? "signup" : "login"));
              }}
            >
              {mode === "login" ? "Need an account?" : "Already have an account?"}
            </button>
          </div>
        </section>
      </main>
    );
  }

  const fallbackDisplay = profile.display_name || profile.email;

  return (
    <>
      <header className="session-header">
        <div>
          <p className="label">Signed in as</p>
          <p className="session-name">{fallbackDisplay}</p>
        </div>
        <form className="session-header-actions" onSubmit={handleProfileSave}>
          <label>
            Display name
            <input
              type="text"
              value={displayNameInput}
              disabled={savingProfile}
              onChange={(event) => setDisplayNameInput(event.target.value)}
            />
          </label>
          <button className="action ghost" type="submit" disabled={savingProfile}>
            {savingProfile ? "Saving..." : "Save Name"}
          </button>
          <button className="action ghost" type="button" onClick={() => void handleSignOut()}>
            Sign Out
          </button>
        </form>
      </header>
      {statusMessage && (
        <main>
          <div className="card">
            <p className="label">{statusMessage}</p>
          </div>
        </main>
      )}
      {errorMessage && (
        <main>
          <div className="card">
            <p className="error">{errorMessage}</p>
          </div>
        </main>
      )}
      {children}
    </>
  );
}
