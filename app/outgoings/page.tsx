"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Account, AccountCode, ExpenseItem, MonthSummary } from "@/lib/types";
import { useDataContext } from "@/app/data-context";

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
  const {
    accounts,
    months,
    selectedMonthId,
    setSelectedMonthId,
    loadingMonths
  } = useDataContext();

  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [form, setForm] = useState<OutgoingFormState>(defaultOutgoingForm);
  const [editingId, setEditingId] = useState<string>("");
  const [editForm, setEditForm] = useState<OutgoingFormState>(defaultOutgoingForm);
  const [loadingItems, setLoadingItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (accounts.length > 0) {
      setForm((current) => {
        if (accounts.some((account) => account.code === current.account_code)) {
          return current;
        }
        return { ...current, account_code: accounts[0].code };
      });
    }
  }, [accounts]);

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

  // Month and Account loading is managed by DataContext

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
      setForm((current) => ({
        ...defaultOutgoingForm,
        account_code: current.account_code // Keep current selected account code for convenience
      }));
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
      <h1>Monthly Outgoings</h1>

      {errorMessage && (
        <div className="error">
          <p>{errorMessage}</p>
        </div>
      )}

      {/* Selector & Add Outgoing Section */}
      <section className="card highlight">
        <h2 style={{ marginBottom: "1.25rem" }}>Select Month & Record Outgoing</h2>
        
        <label htmlFor="outgoing-month-select" className="stacked" style={{ marginBottom: "1.25rem" }}>
          Budget Month
          <select
            id="outgoing-month-select"
            name="month_id"
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

        <form className="form-grid full-width-btn" onSubmit={handleAdd}>
          <label htmlFor="outgoing-name">
            Name (Payee/Bill Name)
            <input
              required
              id="outgoing-name"
              name="name"
              type="text"
              placeholder="e.g. Council Tax"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              autoComplete="organization"
            />
          </label>

          <label htmlFor="outgoing-due-day">
            Due Day of Month
            <input
              required
              id="outgoing-due-day"
              name="due_day"
              type="number"
              min="1"
              max="31"
              placeholder="1"
              value={form.due_day}
              onChange={(event) => setForm((current) => ({ ...current, due_day: event.target.value }))}
              autoComplete="off"
            />
          </label>

          <label htmlFor="outgoing-account-code">
            Debit Account
            <select
              id="outgoing-account-code"
              name="account_code"
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

          <label htmlFor="outgoing-amount">
            Amount (GBP)
            <input
              required
              id="outgoing-amount"
              name="amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
              autoComplete="transaction-amount"
            />
          </label>

          <label htmlFor="outgoing-recurring" className="checkbox" style={{ gridColumn: "span 2", padding: "0.25rem 0" }}>
            <input
              id="outgoing-recurring"
              name="is_recurring"
              type="checkbox"
              checked={form.is_recurring}
              onChange={(event) => setForm((current) => ({ ...current, is_recurring: event.target.checked }))}
              autoComplete="off"
            />
            Recurring monthly bill
          </label>

          <button className="action" type="submit" disabled={months.length === 0 || submitting}>
            {submitting ? "Adding..." : "Add Outgoing"}
          </button>
        </form>
      </section>

      {/* Outgoing List */}
      <section className="card">
        <h2>Outgoing Bills List</h2>
        
        {loadingItems ? (
          <p className="label" style={{ padding: "1.5rem 0" }}>Loading outgoings...</p>
        ) : items.length === 0 ? (
          <p className="label" style={{ padding: "1.5rem 0" }}>No outgoings entered for this month yet.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th style={{ width: "85px" }}>Due Day</th>
                  <th>Account</th>
                  <th style={{ width: "120px" }}>Recurring</th>
                  <th className="amount">Amount</th>
                  <th style={{ width: "160px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isEditing = editingId === item.id;

                  if (isEditing) {
                    return (
                      <tr key={item.id} style={{ background: "rgba(99, 102, 241, 0.02)" }}>
                        <td>
                          <input
                            required
                            id={`edit-outgoing-name-${item.id}`}
                            name="name"
                            type="text"
                            value={editForm.name}
                            onChange={(event) =>
                              setEditForm((current) => ({ ...current, name: event.target.value }))
                            }
                            style={{ height: "34px", padding: "0 0.5rem" }}
                            autoComplete="organization"
                          />
                        </td>
                        <td>
                          <input
                            required
                            id={`edit-outgoing-due-day-${item.id}`}
                            name="due_day"
                            type="number"
                            min="1"
                            max="31"
                            value={editForm.due_day}
                            onChange={(event) =>
                              setEditForm((current) => ({ ...current, due_day: event.target.value }))
                            }
                            style={{ height: "34px", padding: "0 0.5rem" }}
                            autoComplete="off"
                          />
                        </td>
                        <td>
                          <select
                            id={`edit-outgoing-account-${item.id}`}
                            name="account_code"
                            value={editForm.account_code}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                account_code: event.target.value as AccountCode
                              }))
                            }
                            style={{ height: "34px", padding: "0 0.5rem" }}
                          >
                            {accountsForView.map((account) => (
                              <option key={account.code} value={account.code}>
                                {account.code} - {account.bank_name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <label htmlFor={`edit-outgoing-recurring-${item.id}`} className="checkbox table-check" style={{ fontSize: "0.85rem" }}>
                            <input
                              id={`edit-outgoing-recurring-${item.id}`}
                              name="is_recurring"
                              type="checkbox"
                              checked={editForm.is_recurring}
                              onChange={(event) =>
                                setEditForm((current) => ({ ...current, is_recurring: event.target.checked }))
                              }
                              autoComplete="off"
                            />
                            Yes
                          </label>
                        </td>
                        <td className="amount">
                          <input
                            required
                            id={`edit-outgoing-amount-${item.id}`}
                            name="amount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={editForm.amount}
                            onChange={(event) =>
                              setEditForm((current) => ({ ...current, amount: event.target.value }))
                            }
                            style={{ height: "34px", padding: "0 0.5rem", width: "100px", textAlign: "right" }}
                            autoComplete="transaction-amount"
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
                      <td style={{ fontWeight: "500", color: "var(--text-heading)" }}>{item.name}</td>
                      <td>
                        <span className="badge neutral">Day {item.due_day}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: "600", color: "var(--accent)" }}>{item.account_code}</span>
                        <span style={{ color: "var(--muted)", fontSize: "0.8rem", marginLeft: "0.4rem" }}>
                          ({accountNameByCode.get(item.account_code) ?? "Unknown"})
                        </span>
                      </td>
                      <td>
                        {item.is_recurring ? (
                          <span className="badge success">Recurring</span>
                        ) : (
                          <span className="badge neutral">One-off</span>
                        )}
                      </td>
                      <td className="amount" style={{ color: "var(--danger)" }}>{currency.format(Number(item.amount))}</td>
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
          </div>
        )}

        <div className="outgoing-total" style={{ borderTop: "1px solid var(--panel-border)", marginTop: "1.25rem", paddingTop: "1rem" }}>
          <p className="outgoing-total-label" style={{ fontSize: "0.85rem" }}>Total Committed Outgoings</p>
          <p className="outgoing-total-value" style={{ fontSize: "1.5rem", color: "var(--danger)" }}>{currency.format(totalOut)}</p>
        </div>
      </section>
    </main>
  );
}
