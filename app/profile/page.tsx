"use client";

import Link from "next/link";
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

  useEffect(() => {
    void loadProfile();
    void loadMonths();
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

  if (loadingProfile) {
    return (
      <main>
        <div className="card">
          <p className="label">Loading profile...</p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="top-links">
        <Link className="action ghost" href="/">
          Home
        </Link>
        <Link className="action ghost" href="/outgoings">
          Outgoings
        </Link>
        <Link className="action ghost" href="/accounts">
          Accounts
        </Link>
        <Link className="action ghost" href="/transfers">
          Transfers
        </Link>
      </div>

      <h1>Profile</h1>

      {statusMessage && (
        <div className="card">
          <p className="label">{statusMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="card">
          <p className="error">{errorMessage}</p>
        </div>
      )}

      <section className="card">
        <h2>Your Details</h2>
        <form className="form-grid" onSubmit={handleProfileSave}>
          <label>
            Email
            <input type="email" value={profile?.email ?? ""} disabled />
          </label>
          <label>
            Display Name
            <input
              type="text"
              value={displayNameInput}
              disabled={savingProfile}
              onChange={(event) => setDisplayNameInput(event.target.value)}
            />
          </label>
          <button className="action" type="submit" disabled={savingProfile}>
            {savingProfile ? "Saving..." : "Save Name"}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Months Created</h2>
        {loadingMonths ? (
          <p className="label">Loading months...</p>
        ) : months.length === 0 ? (
          <p className="label">No months created yet.</p>
        ) : (
          <div className="month-list">
            {months.map((month) => {
              const isEditing = editingMonthId === month.id;
              const showDeleteWarning = deleteWarningMonthId === month.id;

              return (
                <article key={month.id} className="month-row">
                  {!isEditing ? (
                    <>
                      <div>
                        <span className="month-title">{month.month_label}</span>
                        <span className="month-meta">
                          Wage {currency.format(Number(month.wage))} | Float {currency.format(Number(month.float_amount))}
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
                    </>
                  ) : (
                    <form className="month-edit-form" onSubmit={handleMonthUpdate}>
                      <label>
                        Month Label
                        <input
                          required
                          type="text"
                          value={editMonthForm.month_label}
                          onChange={(event) =>
                            setEditMonthForm((current) => ({ ...current, month_label: event.target.value }))
                          }
                        />
                      </label>

                      <label>
                        Wage
                        <input
                          required
                          type="number"
                          min="0"
                          step="0.01"
                          value={editMonthForm.wage}
                          onChange={(event) =>
                            setEditMonthForm((current) => ({ ...current, wage: event.target.value }))
                          }
                        />
                      </label>

                      <label>
                        Float
                        <input
                          required
                          type="number"
                          min="0"
                          step="0.01"
                          value={editMonthForm.float_amount}
                          onChange={(event) =>
                            setEditMonthForm((current) => ({ ...current, float_amount: event.target.value }))
                          }
                        />
                      </label>

                      <div className="month-actions">
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
                    <p className="warning">Delete again to remove this month and all monthly outgoing values.</p>
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
