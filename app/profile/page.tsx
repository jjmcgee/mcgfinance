"use client";

import { FormEvent, useEffect, useState } from "react";
import { MonthSummary } from "@/lib/types";

type AppProfile = {
  email: string;
  display_name: string | null;
};

type MonthFormState = {
  month_label: string;
  wage: string;
  float_amount: string;
};

const defaultMonthForm: MonthFormState = {
  month_label: "",
  wage: "",
  float_amount: ""
};

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP"
});

export default function ProfilePage() {
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [months, setMonths] = useState<MonthSummary[]>([]);
  const [editMonthForm, setEditMonthForm] = useState<MonthFormState>(defaultMonthForm);
  const [editingMonthId, setEditingMonthId] = useState<string>("");
  const [deleteWarningMonthId, setDeleteWarningMonthId] = useState<string>("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingMonths, setLoadingMonths] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [updatingMonth, setUpdatingMonth] = useState(false);
  const [deletingMonth, setDeletingMonth] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  // PWA installation triggers
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Theme settings state
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme") as "light" | "dark" | "system" | null;
      if (stored) {
        setTheme(stored);
      }
    }
  }, []);

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
  };

  const applyTheme = (t: "light" | "dark" | "system") => {
    if (t === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else if (t === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    }
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  useEffect(() => {
    void loadProfile();
    void loadMonths();

    // Listen for mobile/desktop PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Detect if already installed/standalone
    const standaloneMode = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(standaloneMode);
    if (standaloneMode) {
      setShowInstallBtn(false);
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice && !standaloneMode);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  async function loadProfile() {
    setLoadingProfile(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/auth/me");
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
      setLoadingProfile(false);
    }
  }

  async function loadMonths() {
    setLoadingMonths(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/months");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load months");
      }

      setMonths((payload.data ?? []) as MonthSummary[]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load months");
    } finally {
      setLoadingMonths(false);
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

  function startMonthEdit(month: MonthSummary) {
    setEditingMonthId(month.id);
    setDeleteWarningMonthId("");
    setEditMonthForm({
      month_label: month.month_label,
      wage: String(month.wage),
      float_amount: String(month.float_amount)
    });
  }

  async function handleMonthUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingMonthId) {
      return;
    }

    setUpdatingMonth(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/months/${editingMonthId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month_label: editMonthForm.month_label.trim(),
          wage: Number(editMonthForm.wage),
          float_amount: Number(editMonthForm.float_amount)
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to update month");
      }

      const updatedMonth = payload.data as MonthSummary;
      setMonths((current) => current.map((month) => (month.id === updatedMonth.id ? updatedMonth : month)));
      setEditingMonthId("");
      setEditMonthForm(defaultMonthForm);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update month");
    } finally {
      setUpdatingMonth(false);
    }
  }

  async function handleMonthDelete(monthId: string) {
    if (deletingMonth) {
      return;
    }

    if (deleteWarningMonthId !== monthId) {
      setDeleteWarningMonthId(monthId);
      return;
    }

    setDeletingMonth(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/months/${monthId}`, {
        method: "DELETE"
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete month");
      }

      setMonths((current) => current.filter((month) => month.id !== monthId));
      if (editingMonthId === monthId) {
        setEditingMonthId("");
        setEditMonthForm(defaultMonthForm);
      }
      setDeleteWarningMonthId("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete month");
    } finally {
      setDeletingMonth(false);
    }
  }

  async function triggerPWAInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA installation outcome: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  }

  if (loadingProfile) {
    return (
      <main>
        <p className="label">Loading profile settings...</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Profile Settings</h1>

      {statusMessage && (
        <div className="badge success" style={{ marginBottom: "1rem", display: "inline-block" }}>
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div className="error">
          <p>{errorMessage}</p>
        </div>
      )}

      {/* PWA installation Card */}
      {(showInstallBtn || isIOS || isStandalone) && (
        <section className="card highlight" style={{ borderLeft: "4px solid var(--accent)", marginBottom: "1.5rem" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>📲</span>
            <span>Install MCG Finance App</span>
          </h2>
          
          {isStandalone ? (
            <p className="label" style={{ color: "var(--money)", fontWeight: "500", marginTop: "0.5rem" }}>
              ✓ You are running the installed application in standalone mode.
            </p>
          ) : (
            <div style={{ marginTop: "0.5rem" }}>
              <p className="label" style={{ color: "#fff", marginBottom: "1rem" }}>
                Add this application to your home screen or desktop launcher for quick access, offline mode support, and an app icon in your taskbar.
              </p>
              
              {showInstallBtn && (
                <button className="action" type="button" onClick={() => void triggerPWAInstall()}>
                  Install Application
                </button>
              )}

              {isIOS && (
                <div className="warning" style={{ margin: "0.5rem 0 0" }}>
                  <strong>iOS Safari User:</strong> Tap the share icon <span style={{ fontSize: "1.1rem" }}>⎋</span> at the bottom of Safari, and select <strong>Add to Home Screen</strong>.
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Profile Details Card */}
      <section className="card" style={{ marginBottom: "1.5rem" }}>
        <h2>User Details</h2>
        <form className="form-grid full-width-btn" onSubmit={handleProfileSave}>
          <label htmlFor="profile-email">
            Email Address
            <input
              id="profile-email"
              name="email"
              type="email"
              value={profile?.email ?? ""}
              disabled
              style={{ cursor: "not-allowed", opacity: 0.6 }}
              autoComplete="email"
            />
          </label>
          <label htmlFor="profile-display-name">
            Display Name
            <input
              id="profile-display-name"
              name="display_name"
              type="text"
              value={displayNameInput}
              disabled={savingProfile}
              placeholder="e.g. John Doe"
              onChange={(event) => setDisplayNameInput(event.target.value)}
              autoComplete="name"
            />
          </label>
          <button className="action" type="submit" disabled={savingProfile}>
            {savingProfile ? "Saving..." : "Save Name"}
          </button>
        </form>
      </section>

      {/* Theme Settings Card */}
      <section className="card" style={{ marginBottom: "1.5rem" }}>
        <h2>Theme Preference</h2>
        <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
          <label htmlFor="profile-theme-select">
            Interface Style
            <select
              id="profile-theme-select"
              name="theme"
              value={theme}
              onChange={(event) => handleThemeChange(event.target.value as "light" | "dark" | "system")}
              style={{ height: "42px", fontSize: "0.95rem" }}
            >
              <option value="light">☀️ Light Theme</option>
              <option value="dark">🌙 Dark Theme</option>
              <option value="system">🖥️ Follow System Preferences</option>
            </select>
          </label>
        </div>
      </section>

      {/* Months Created Card */}
      <section className="card">
        <h2>Months List & Budgets</h2>
        {loadingMonths ? (
          <p className="label">Loading months...</p>
        ) : months.length === 0 ? (
          <p className="label">No budget months created yet.</p>
        ) : (
          <div className="month-list">
            {months.map((month) => {
              const isEditing = editingMonthId === month.id;
              const showDeleteWarning = deleteWarningMonthId === month.id;

              return (
                <article key={month.id} className="month-row" style={{ flexDirection: "column", alignItems: "stretch", gap: "0.5rem" }}>
                  {!isEditing ? (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span className="month-title">{month.month_label}</span>
                        <span className="month-meta">
                          Wage: <strong style={{ color: "#fff" }}>{currency.format(Number(month.wage))}</strong> | Float: <strong style={{ color: "#fff" }}>{currency.format(Number(month.float_amount))}</strong>
                        </span>
                      </div>

                      <div className="month-actions">
                        <button type="button" className="action ghost" onClick={() => startMonthEdit(month)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="action danger"
                          onClick={() => void handleMonthDelete(month.id)}
                          disabled={deletingMonth}
                        >
                          {showDeleteWarning ? "Confirm Delete" : "Delete"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form className="form-grid full-width-btn" onSubmit={handleMonthUpdate} style={{ marginTop: "0.5rem" }}>
                      <label htmlFor={`edit-month-label-${month.id}`}>
                        Month Label
                        <input
                          required
                          id={`edit-month-label-${month.id}`}
                          name="month_label"
                          type="text"
                          value={editMonthForm.month_label}
                          onChange={(event) =>
                            setEditMonthForm((current) => ({ ...current, month_label: event.target.value }))
                          }
                          style={{ height: "36px" }}
                          autoComplete="off"
                        />
                      </label>

                      <label htmlFor={`edit-month-wage-${month.id}`}>
                        Wage (Salary)
                        <input
                          required
                          id={`edit-month-wage-${month.id}`}
                          name="wage"
                          type="number"
                          min="0"
                          step="0.01"
                          value={editMonthForm.wage}
                          onChange={(event) =>
                            setEditMonthForm((current) => ({ ...current, wage: event.target.value }))
                          }
                          style={{ height: "36px" }}
                          autoComplete="transaction-amount"
                        />
                      </label>

                      <label htmlFor={`edit-month-float-${month.id}`} style={{ gridColumn: "span 2" }}>
                        Float Amount
                        <input
                          required
                          id={`edit-month-float-${month.id}`}
                          name="float_amount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={editMonthForm.float_amount}
                          onChange={(event) =>
                            setEditMonthForm((current) => ({ ...current, float_amount: event.target.value }))
                          }
                          style={{ height: "36px" }}
                          autoComplete="transaction-amount"
                        />
                      </label>

                      <div className="month-actions" style={{ gridColumn: "span 2", display: "flex", gap: "0.5rem", width: "100%", justifyContent: "flex-end" }}>
                        <button className="action" type="submit" disabled={updatingMonth}>
                          {updatingMonth ? "Saving..." : "Save"}
                        </button>
                        <button
                          className="action ghost"
                          type="button"
                          onClick={() => {
                            setEditingMonthId("");
                            setEditMonthForm(defaultMonthForm);
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {showDeleteWarning && !isEditing && (
                    <p className="warning" style={{ margin: "0.5rem 0 0" }}>
                      ⚠️ Warning: Deleting this month will permanently delete all associated expenses and transfers for {month.month_label}. Click Delete again to confirm.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
