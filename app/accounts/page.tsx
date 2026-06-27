"use client";

import { FormEvent, useEffect, useState } from "react";
import { Account, AccountCode } from "@/lib/types";
import { useDataContext } from "@/app/data-context";

export default function AccountsPage() {
  const {
    accounts,
    setAccounts,
    loadingAccounts: loading
  } = useDataContext();

  const [editingCode, setEditingCode] = useState<AccountCode | "">("");
  const [bankName, setBankName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newBankName, setNewBankName] = useState("");
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingCode, setDeletingCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function startEdit(account: Account) {
    setEditingCode(account.code);
    setBankName(account.bank_name);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingCode) {
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/accounts/${editingCode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_name: bankName.trim()
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to update account");
      }

      const updated = payload.data as Account;
      setAccounts((current) => current.map((item) => (item.code === updated.code ? updated : item)));
      setEditingCode("");
      setBankName("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update account");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setCreating(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCode.trim().toUpperCase(),
          bank_name: newBankName.trim()
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to add account");
      }

      const created = payload.data as Account;
      setAccounts((current) => [...current, created].sort((a, b) => a.code.localeCompare(b.code)));
      setNewCode("");
      setNewBankName("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to add account");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(code: string) {
    setDeletingCode(code);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/accounts/${code}`, {
        method: "DELETE"
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to remove account");
      }

      setAccounts((current) => current.filter((account) => account.code !== code));
      if (editingCode === code) {
        setEditingCode("");
        setBankName("");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to remove account");
    } finally {
      setDeletingCode("");
    }
  }

  return (
    <main>
      <h1>Accounts Dashboard</h1>

      {errorMessage && (
        <div className="error">
          <p>{errorMessage}</p>
        </div>
      )}

      {/* Add Account Card */}
      <section className="card highlight" style={{ marginBottom: "2rem" }}>
        <h2>Create Funding Account</h2>
        <form className="form-grid full-width-btn" onSubmit={handleCreate}>
          <label htmlFor="account-code">
            Account Identifer (Single Letter/Word)
            <input
              required
              id="account-code"
              name="code"
              type="text"
              maxLength={12}
              placeholder="e.g. B (Bills), N (Nest)"
              value={newCode}
              onChange={(event) => setNewCode(event.target.value.toUpperCase())}
              autoComplete="off"
            />
          </label>

          <label htmlFor="account-bank-name">
            Bank / Purpose Name
            <input
              required
              id="account-bank-name"
              name="bank_name"
              type="text"
              placeholder="e.g. Barclays, Monzo Savings"
              value={newBankName}
              onChange={(event) => setNewBankName(event.target.value)}
              autoComplete="organization"
            />
          </label>

          <button className="action" type="submit" disabled={creating}>
            {creating ? "Adding..." : "Add Account"}
          </button>
        </form>
      </section>

      {/* Manage Accounts Grid */}
      <section className="card">
        <h2 style={{ marginBottom: "1.5rem" }}>Active Accounts</h2>

        {loading ? (
          <p className="label">Loading funding accounts...</p>
        ) : accounts.length === 0 ? (
          <p className="label">No funding accounts set up yet.</p>
        ) : (
          <div className="bank-cards-grid">
            {accounts.map((account) => {
              const isEditing = editingCode === account.code;

              if (isEditing) {
                return (
                  <form 
                    key={account.code} 
                    className="bank-card" 
                    onSubmit={handleSave}
                    style={{ 
                      background: "rgba(99, 102, 241, 0.05)", 
                      borderColor: "var(--accent)", 
                      height: "auto" 
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "0.75rem" }}>
                      <span className="bank-card-code">{account.code}</span>
                      <span className="badge success">Editing</span>
                    </div>
                    <label htmlFor={`edit-account-bank-name-${account.code}`} style={{ width: "100%", marginBottom: "1rem" }}>
                      Bank Name
                      <input
                        required
                        id={`edit-account-bank-name-${account.code}`}
                        name="bank_name"
                        type="text"
                        value={bankName}
                        onChange={(event) => setBankName(event.target.value)}
                        style={{ height: "34px", padding: "0 0.5rem" }}
                        autoComplete="organization"
                      />
                    </label>
                    <div className="account-actions" style={{ display: "flex", gap: "0.5rem", width: "100%" }}>
                      <button className="action" type="submit" disabled={saving} style={{ height: "32px", fontSize: "0.82rem", flexGrow: 1 }}>
                        {saving ? "Saving..." : "Save"}
                      </button>
                      <button
                        className="action ghost"
                        type="button"
                        onClick={() => {
                          setEditingCode("");
                          setBankName("");
                        }}
                        style={{ height: "32px", fontSize: "0.82rem" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                );
              }

              // Normal Card View
              return (
                <article key={account.code} className="bank-card">
                  <div className="bank-card-header">
                    <div className="bank-card-chip" />
                    <span className="bank-card-code">{account.code}</span>
                  </div>
                  
                  <div className="bank-card-footer">
                    <span className="bank-card-label">Bank Institution</span>
                    <span className="bank-card-name">{account.bank_name}</span>
                    
                    <div className="account-actions" style={{ marginTop: "0.75rem", display: "flex", gap: "0.45rem" }}>
                      <button 
                        className="action ghost" 
                        type="button" 
                        onClick={() => startEdit(account)}
                        style={{ height: "30px", fontSize: "0.78rem", padding: "0 0.65rem", flexGrow: 1 }}
                      >
                        Rename
                      </button>
                      <button
                        className="action danger"
                        type="button"
                        onClick={() => void handleDelete(account.code)}
                        disabled={deletingCode === account.code}
                        style={{ height: "30px", fontSize: "0.78rem", padding: "0 0.65rem" }}
                      >
                        {deletingCode === account.code ? "..." : "Remove"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
