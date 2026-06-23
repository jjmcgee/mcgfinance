"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Account, AccountCode, MonthSummary, TransferItem } from "@/lib/types";

type TransferFormState = {
  to_account_code: AccountCode;
  amount: string;
  note: string;
};

const defaultTransferForm: TransferFormState = {
  to_account_code: "B",
  amount: "",
  note: ""
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

export default function TransfersPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [months, setMonths] = useState<MonthSummary[]>([]);
  const [selectedMonthId, setSelectedMonthId] = useState<string>("");
  const [items, setItems] = useState<TransferItem[]>([]);
  const [form, setForm] = useState<TransferFormState>(defaultTransferForm);
  const [editingId, setEditingId] = useState<string>("");
  const [editForm, setEditForm] = useState<TransferFormState>(defaultTransferForm);
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

    void loadTransfers(selectedMonthId);
  }, [selectedMonthId]);

  const totalTransfers = useMemo(
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
          if (fetched.some((account) => account.code === current.to_account_code)) {
            return current;
          }

          return { ...current, to_account_code: fetched[0].code };
        });
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load accounts");
    }
  }

  async function loadTransfers(monthId: string) {
    setLoadingItems(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/transfers?month_id=${monthId}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load transfers");
      }

      setItems((payload.data ?? []) as TransferItem[]);
    } catch (error) {
      setItems([]);
      setErrorMessage(error instanceof Error ? error.message : "Failed to load transfers");
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
      const response = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month_id: selectedMonthId,
          to_account_code: form.to_account_code,
          amount: Number(form.amount),
          note: form.note.trim() || null
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to add transfer");
      }

      const created = payload.data as TransferItem;
      setItems((current) => [...current, created]);
      setForm((current) => ({
        ...defaultTransferForm,
        to_account_code: current.to_account_code // Keep current selected account code
      }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to add transfer");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(item: TransferItem) {
    setEditingId(item.id);
    setEditForm({
      to_account_code: item.to_account_code,
      amount: String(item.amount),
      note: item.note ?? ""
    });
  }

  async function handleUpdate() {
    if (!editingId) {
      return;
    }

    setUpdating(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/transfers/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_account_code: editForm.to_account_code,
          amount: Number(editForm.amount),
          note: editForm.note.trim() || null
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to update transfer");
      }

      const updated = payload.data as TransferItem;
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setEditingId("");
      setEditForm(defaultTransferForm);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update transfer");
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/transfers/${id}`, {
        method: "DELETE"
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to remove transfer");
      }

      setItems((current) => current.filter((item) => item.id !== id));
      if (editingId === id) {
        setEditingId("");
        setEditForm(defaultTransferForm);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to remove transfer");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <main>
      <h1>Manage Transfers</h1>

      {errorMessage && (
        <div className="error">
          <p>{errorMessage}</p>
        </div>
      )}

      {/* Selector & Add Transfer Section */}
      <section className="card highlight">
        <h2 style={{ marginBottom: "1.25rem" }}>Select Month & Record Transfer</h2>

        <label htmlFor="transfer-month-select" className="stacked" style={{ marginBottom: "1.25rem" }}>
          Budget Month
          <select
            id="transfer-month-select"
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
          <label htmlFor="transfer-to-account">
            Transfer To Account
            <select
              id="transfer-to-account"
              name="to_account_code"
              value={form.to_account_code}
              onChange={(event) =>
                setForm((current) => ({ ...current, to_account_code: event.target.value as AccountCode }))
              }
            >
              {accountsForView.map((account) => (
                <option key={account.code} value={account.code}>
                  Transfer to {account.code} - {account.bank_name}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="transfer-amount">
            Amount (GBP)
            <input
              required
              id="transfer-amount"
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

          <label htmlFor="transfer-note" style={{ gridColumn: "span 2" }}>
            Note / Description
            <input
              id="transfer-note"
              name="note"
              type="text"
              placeholder="e.g. Savings allocation (Optional)"
              value={form.note}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              autoComplete="off"
            />
          </label>

          <button className="action" type="submit" disabled={months.length === 0 || submitting}>
            {submitting ? "Adding..." : "Add Transfer"}
          </button>
        </form>
      </section>

      {/* Transfer List Table */}
      <section className="card">
        <h2>Transfers List</h2>

        {loadingItems ? (
          <p className="label" style={{ padding: "1.5rem 0" }}>Loading transfers...</p>
        ) : items.length === 0 ? (
          <p className="label" style={{ padding: "1.5rem 0" }}>No transfers recorded for this month yet.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Destination Account</th>
                  <th>Note</th>
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
                          <select
                            id={`edit-transfer-to-account-${item.id}`}
                            name="to_account_code"
                            value={editForm.to_account_code}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                to_account_code: event.target.value as AccountCode
                              }))
                            }
                            style={{ height: "34px", padding: "0 0.5rem" }}
                          >
                            {accountsForView.map((account) => (
                              <option key={account.code} value={account.code}>
                                Transfer to {account.code} - {account.bank_name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            id={`edit-transfer-note-${item.id}`}
                            name="note"
                            type="text"
                            value={editForm.note}
                            onChange={(event) => setEditForm((current) => ({ ...current, note: event.target.value }))}
                            style={{ height: "34px", padding: "0 0.5rem" }}
                            autoComplete="off"
                          />
                        </td>
                        <td className="amount">
                          <input
                            required
                            id={`edit-transfer-amount-${item.id}`}
                            name="amount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={editForm.amount}
                            onChange={(event) => setEditForm((current) => ({ ...current, amount: event.target.value }))}
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
                                setEditForm(defaultTransferForm);
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
                      <td style={{ fontWeight: "500", color: "#fff" }}>
                        Transfer to <span style={{ color: "var(--accent)" }}>{item.to_account_code}</span> 
                        <span style={{ color: "var(--muted)", fontSize: "0.8rem", marginLeft: "0.4rem" }}>
                          ({accountNameByCode.get(item.to_account_code) ?? "Unknown"})
                        </span>
                      </td>
                      <td style={{ color: "var(--muted)" }}>{item.note || "-"}</td>
                      <td className="amount" style={{ color: "var(--accent)", fontWeight: "700" }}>{currency.format(Number(item.amount))}</td>
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
          <p className="outgoing-total-label" style={{ fontSize: "0.85rem" }}>Total Transfers Routed</p>
          <p className="outgoing-total-value" style={{ fontSize: "1.5rem", color: "var(--accent)" }}>{currency.format(totalTransfers)}</p>
        </div>
      </section>
    </main>
  );
}
