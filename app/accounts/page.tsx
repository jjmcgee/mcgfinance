"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Account, AccountCode } from "@/lib/types";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [editingCode, setEditingCode] = useState<AccountCode | "">("");
  const [bankName, setBankName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newBankName, setNewBankName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingCode, setDeletingCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    void loadAccounts();
  }, []);

  async function loadAccounts() {
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/accounts");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load accounts");
      }

      setAccounts((payload.data ?? []) as Account[]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }

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
      <div className="top-links">
        <Link className="action ghost" href="/">
          Home
        </Link>
        <Link className="action ghost" href="/profile">
          Profile
        </Link>
        <Link className="action ghost" href="/outgoings">
          Outgoings
        </Link>
        <Link className="action ghost" href="/transfers">
          Transfers
        </Link>
      </div>

      <h1>Accounts</h1>

      {errorMessage && (
        <div className="card">
          <p className="error">{errorMessage}</p>
        </div>
      )}

      <section className="card">
        <h2>Add Account</h2>
        <form className="form-grid" onSubmit={handleCreate}>
          <label>
            Account Letter
            <input
              required
              type="text"
              maxLength={12}
              placeholder="B"
              value={newCode}
              onChange={(event) => setNewCode(event.target.value.toUpperCase())}
            />
          </label>

          <label>
            Bank Name
            <input
              required
              type="text"
              placeholder="Bank 1"
              value={newBankName}
              onChange={(event) => setNewBankName(event.target.value)}
            />
          </label>

          <button className="action" type="submit" disabled={creating}>
            {creating ? "Saving..." : "Add Account"}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Manage Accounts</h2>

        {loading ? (
          <p className="label">Loading accounts...</p>
        ) : (
          <div className="account-list">
            {accounts.map((account) => {
              const isEditing = editingCode === account.code;

              if (isEditing) {
                return (
                  <form key={account.code} className="account-row" onSubmit={handleSave}>
                    <p className="account-code">{account.code}</p>
                    <label>
                      Bank Name
                      <input
                        required
                        type="text"
                        value={bankName}
                        onChange={(event) => setBankName(event.target.value)}
                      />
                    </label>
                    <div className="account-actions">
                      <button className="action" type="submit" disabled={saving}>
                        {saving ? "Saving..." : "Save"}
                      </button>
                      <button
                        className="action ghost"
                        type="button"
                        onClick={() => {
                          setEditingCode("");
                          setBankName("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                );
              }

              return (
                <article key={account.code} className="account-row">
                  <p className="account-code">{account.code}</p>
                  <p className="account-name">{account.bank_name}</p>
                  <div className="account-actions">
                    <button className="action ghost" type="button" onClick={() => startEdit(account)}>
                      Edit
                    </button>
                    <button
                      className="action danger"
                      type="button"
                      onClick={() => void handleDelete(account.code)}
                      disabled={deletingCode === account.code}
                    >
                      {deletingCode === account.code ? "Removing..." : "Remove"}
                    </button>
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
