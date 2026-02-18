"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Account, AccountCode, ExpenseItem, MonthSummary } from "@/lib/types";

type OutgoingFormState = {
  name: string;
  due_day: string;
  account_code: AccountCode;
  amount: string;
  is_recurring: boolean;
};

const defaultOutgoingForm: OutgoingFormState = {
  name: "",
  due_day: "",
  account_code: "B",
  amount: "",
  is_recurring: true
};

const fallbackAccounts: Account[] = [
  { code: "N", bank_name: "Bank not set" },
  { code: "B", bank_name: "Bank not set" },
  { code: "C", bank_name: "Bank not set" }
];

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP"
});

export default function OutgoingsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [months, setMonths] = useState<MonthSummary[]>([]);
  const [selectedMonthId, setSelectedMonthId] = useState<string>("");
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [form, setForm] = useState<OutgoingFormState>(defaultOutgoingForm);
  const [editingId, setEditingId] = useState<string>("");
  const [editForm, setEditForm] = useState<OutgoingFormState>(defaultOutgoingForm);
  const [loadingMonths, setLoadingMonths] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    void loadMonths();
    void loadAccounts();
  }, []);

  useEffect(() => {
    if (!selectedMonthId) {
      setItems([]);
      return;
    }

    void loadOutgoings(selectedMonthId);
  }, [selectedMonthId]);

  const totalOut = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.amount), 0),
    [items]
  );

  const accountsForView = accounts.length > 0 ? accounts : fallbackAccounts;

  const accountNameByCode = useMemo(
    () => new Map(accountsForView.map((account) => [account.code, account.bank_name])),
    [accountsForView]
  );

  async function loadMonths() {
    setLoadingMonths(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/months");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load months");
      }

      const fetchedMonths = (payload.data ?? []) as MonthSummary[];
      setMonths(fetchedMonths);

      if (fetchedMonths.length > 0) {
        setSelectedMonthId((current) => current || fetchedMonths[0].id);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load months");
    } finally {
      setLoadingMonths(false);
    }
  }

  async function loadAccounts() {
    setErrorMessage("");

    try {
      const response = await fetch("/api/accounts");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load accounts");
      }

      const fetched = (payload.data ?? []) as Account[];
      setAccounts(fetched);
      if (fetched.length > 0) {
        setForm((current) => {
          if (fetched.some((account) => account.code === current.account_code)) {
            return current;
          }

          return { ...current, account_code: fetched[0].code };
        });
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load accounts");
    }
  }

  async function loadOutgoings(monthId: string) {
    setLoadingItems(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/expenses?month_id=${monthId}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load monthly outgoings");
      }

      setItems((payload.data ?? []) as ExpenseItem[]);
    } catch (error) {
      setItems([]);
      setErrorMessage(error instanceof Error ? error.message : "Failed to load monthly outgoings");
    } finally {
      setLoadingItems(false);
    }
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedMonthId) {
      setErrorMessage("Create a month first.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month_id: selectedMonthId,
          name: form.name.trim(),
          due_day: Number(form.due_day),
          account_code: form.account_code,
          amount: Number(form.amount),
          is_recurring: form.is_recurring
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to add monthly outgoing");
      }

      const created = payload.data as ExpenseItem;
      setItems((current) => [...current, created].sort((a, b) => Number(a.due_day) - Number(b.due_day)));
      setForm(defaultOutgoingForm);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to add monthly outgoing");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(item: ExpenseItem) {
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      due_day: String(item.due_day),
      account_code: item.account_code,
      amount: String(item.amount),
      is_recurring: item.is_recurring
    });
  }

  async function handleUpdate() {
    if (!editingId) {
      return;
    }

    setUpdating(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/expenses/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          due_day: Number(editForm.due_day),
          account_code: editForm.account_code,
          amount: Number(editForm.amount),
          is_recurring: editForm.is_recurring
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to update monthly outgoing");
      }

      const updated = payload.data as ExpenseItem;
      setItems((current) =>
        current
          .map((item) => (item.id === updated.id ? updated : item))
          .sort((a, b) => Number(a.due_day) - Number(b.due_day))
      );
      setEditingId("");
      setEditForm(defaultOutgoingForm);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update monthly outgoing");
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: "DELETE"
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to remove monthly outgoing");
      }

      setItems((current) => current.filter((item) => item.id !== id));
      if (editingId === id) {
        setEditingId("");
        setEditForm(defaultOutgoingForm);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to remove monthly outgoing");
    } finally {
      setDeletingId("");
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
        <Link className="action ghost" href="/accounts">
          Accounts
        </Link>
        <Link className="action ghost" href="/transfers">
          Transfers
        </Link>
      </div>

      <h1>Monthly Outgoings</h1>

      {errorMessage && (
        <div className="card">
          <p className="error">{errorMessage}</p>
        </div>
      )}

      <section className="card">
        <h2>Add Outgoing</h2>

        <label className="stacked">
          Month
          <select
            value={selectedMonthId}
            disabled={loadingMonths || months.length === 0 || submitting}
            onChange={(event) => setSelectedMonthId(event.target.value)}
          >
            {months.length === 0 ? (
              <option value="">No month created yet</option>
            ) : (
              months.map((month) => (
                <option key={month.id} value={month.id}>
                  {month.month_label}
                </option>
              ))
            )}
          </select>
        </label>

        <form className="form-grid" onSubmit={handleAdd}>
          <label>
            Name
            <input
              required
              type="text"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </label>

          <label>
            Due Day
            <input
              required
              type="number"
              min="1"
              max="31"
              value={form.due_day}
              onChange={(event) => setForm((current) => ({ ...current, due_day: event.target.value }))}
            />
          </label>

          <label>
            Account
            <select
              value={form.account_code}
              onChange={(event) =>
                setForm((current) => ({ ...current, account_code: event.target.value as AccountCode }))
              }
            >
              {accountsForView.map((account) => (
                <option key={account.code} value={account.code}>
                  {account.code} - {account.bank_name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Amount
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
            />
          </label>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.is_recurring}
              onChange={(event) => setForm((current) => ({ ...current, is_recurring: event.target.checked }))}
            />
            Recurring
          </label>

          <button className="action" type="submit" disabled={months.length === 0 || submitting}>
            {submitting ? "Saving..." : "Add Outgoing"}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Outgoing List</h2>
        {loadingItems ? (
          <p className="label">Loading monthly outgoings...</p>
        ) : items.length === 0 ? (
          <p className="label">No monthly outgoings entered yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Due</th>
                <th>Account</th>
                <th>Recurring</th>
                <th className="amount">Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isEditing = editingId === item.id;

                if (isEditing) {
                  return (
                    <tr key={item.id}>
                      <td>
                        <input
                          required
                          type="text"
                          value={editForm.name}
                          onChange={(event) =>
                            setEditForm((current) => ({ ...current, name: event.target.value }))
                          }
                        />
                      </td>
                      <td>
                        <input
                          required
                          type="number"
                          min="1"
                          max="31"
                          value={editForm.due_day}
                          onChange={(event) =>
                            setEditForm((current) => ({ ...current, due_day: event.target.value }))
                          }
                        />
                      </td>
                      <td>
                        <select
                          value={editForm.account_code}
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              account_code: event.target.value as AccountCode
                            }))
                          }
                        >
                          {accountsForView.map((account) => (
                            <option key={account.code} value={account.code}>
                              {account.code} - {account.bank_name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <label className="checkbox table-check">
                          <input
                            type="checkbox"
                            checked={editForm.is_recurring}
                            onChange={(event) =>
                              setEditForm((current) => ({ ...current, is_recurring: event.target.checked }))
                            }
                          />
                          Yes
                        </label>
                      </td>
                      <td className="amount">
                        <input
                          required
                          type="number"
                          min="0"
                          step="0.01"
                          value={editForm.amount}
                          onChange={(event) =>
                            setEditForm((current) => ({ ...current, amount: event.target.value }))
                          }
                        />
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="action"
                            type="button"
                            disabled={updating}
                            onClick={() => void handleUpdate()}
                          >
                            {updating ? "Saving..." : "Save"}
                          </button>
                          <button
                            className="action ghost"
                            type="button"
                            onClick={() => {
                              setEditingId("");
                              setEditForm(defaultOutgoingForm);
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.due_day}</td>
                    <td>{item.account_code} - {accountNameByCode.get(item.account_code) ?? "Unknown"}</td>
                    <td>{item.is_recurring ? "Yes" : "No"}</td>
                    <td className="amount">{currency.format(Number(item.amount))}</td>
                    <td>
                      <div className="table-actions">
                        <button className="action ghost" type="button" onClick={() => startEdit(item)}>
                          Edit
                        </button>
                        <button
                          className="action danger"
                          type="button"
                          disabled={deletingId === item.id}
                          onClick={() => void handleDelete(item.id)}
                        >
                          {deletingId === item.id ? "Removing..." : "Remove"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="outgoing-total">
          <p className="outgoing-total-label">Total Monthly Outgoing</p>
          <p className="outgoing-total-value">{currency.format(totalOut)}</p>
        </div>
      </section>
    </main>
  );
}
