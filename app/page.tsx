"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Account, AccountCode, ExpenseItem, MonthSummary } from "@/lib/types";

type MonthFormState = {
  month_label: string;
  wage: string;
  float_amount: string;
};

type ExpenseFormState = {
  name: string;
  due_day: string;
  account_code: AccountCode;
  amount: string;
  is_recurring: boolean;
};

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP"
});

const defaultMonthForm: MonthFormState = {
  month_label: "",
  wage: "",
  float_amount: ""
};

const defaultExpenseForm: ExpenseFormState = {
  name: "",
  due_day: "",
  account_code: "B",
  amount: "",
  is_recurring: true
};

const fallbackAccounts: Account[] = [
  { code: "N", bank_name: "Bank not set" },
  { code: "B", bank_name: "Bank not set" },
  { code: "C", bank_name: "Bank not set" },
  { code: "L", bank_name: "Bank not set" }
];

export default function HomePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [months, setMonths] = useState<MonthSummary[]>([]);
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [selectedMonthId, setSelectedMonthId] = useState<string>("");
  const [monthForm, setMonthForm] = useState<MonthFormState>(defaultMonthForm);
  const [editMonthForm, setEditMonthForm] = useState<MonthFormState>(defaultMonthForm);
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState>(defaultExpenseForm);
  const [editingMonthId, setEditingMonthId] = useState<string>("");
  const [deleteWarningMonthId, setDeleteWarningMonthId] = useState<string>("");
  const [loadingMonths, setLoadingMonths] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [submittingMonth, setSubmittingMonth] = useState(false);
  const [updatingMonth, setUpdatingMonth] = useState(false);
  const [deletingMonth, setDeletingMonth] = useState(false);
  const [submittingExpense, setSubmittingExpense] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    void loadMonths();
    void loadAccounts();
  }, []);

  useEffect(() => {
    if (!selectedMonthId) {
      setItems([]);
      return;
    }

    void loadExpenses(selectedMonthId);
  }, [selectedMonthId]);

  const selectedMonth = useMemo(
    () => months.find((month) => month.id === selectedMonthId) ?? null,
    [months, selectedMonthId]
  );

  const totalOut = useMemo(() => items.reduce((sum, item) => sum + Number(item.amount), 0), [items]);
  const startingBalance = selectedMonth?.starting_point ?? 0;
  const transferToB = useMemo(
    () =>
      items
        .filter((item) => item.account_code === "B")
        .reduce((sum, item) => sum + Number(item.amount), 0),
    [items]
  );
  const transferToN = useMemo(
    () =>
      items
        .filter((item) => item.account_code === "N")
        .reduce((sum, item) => sum + Number(item.amount), 0),
    [items]
  );
  const transferToC = selectedMonth?.float_amount ?? 0;
  const transferToL = startingBalance - totalOut;
  const totalTransfers = transferToB + transferToN + transferToC + transferToL;
  const accountsForView = accounts.length > 0 ? accounts : fallbackAccounts;
  const accountNameByCode = useMemo(
    () => new Map(accountsForView.map((account) => [account.code, account.bank_name])),
    [accountsForView]
  );

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
        setExpenseForm((current) => {
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
      setSelectedMonthId((current) => {
        if (fetchedMonths.length === 0) {
          return "";
        }

        if (current && fetchedMonths.some((month) => month.id === current)) {
          return current;
        }

        return fetchedMonths[0].id;
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load months");
    } finally {
      setLoadingMonths(false);
    }
  }

  async function loadExpenses(monthId: string) {
    setLoadingItems(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/expenses?month_id=${monthId}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load expenses");
      }

      setItems((payload.data ?? []) as ExpenseItem[]);
    } catch (error) {
      setItems([]);
      setErrorMessage(error instanceof Error ? error.message : "Failed to load expenses");
    } finally {
      setLoadingItems(false);
    }
  }

  async function handleMonthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingMonth(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/months", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month_label: monthForm.month_label.trim(),
          wage: Number(monthForm.wage),
          float_amount: Number(monthForm.float_amount)
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create month");
      }

      const createdMonth = payload.data as MonthSummary;
      setMonths((current) => [createdMonth, ...current]);
      setSelectedMonthId(createdMonth.id);
      setMonthForm(defaultMonthForm);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create month");
    } finally {
      setSubmittingMonth(false);
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

      setMonths((current) => {
        const nextMonths = current.filter((month) => month.id !== monthId);

        if (selectedMonthId === monthId) {
          setSelectedMonthId(nextMonths[0]?.id ?? "");
        }

        return nextMonths;
      });

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

  async function handleExpenseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedMonthId) {
      setErrorMessage("Create a month first before adding monthly outgoing items.");
      return;
    }

    setSubmittingExpense(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month_id: selectedMonthId,
          name: expenseForm.name.trim(),
          due_day: Number(expenseForm.due_day),
          account_code: expenseForm.account_code,
          amount: Number(expenseForm.amount),
          is_recurring: expenseForm.is_recurring
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to add monthly outgoing item");
      }

      const createdExpense = payload.data as ExpenseItem;
      setItems((current) => [...current, createdExpense].sort((a, b) => Number(a.due_day) - Number(b.due_day)));
      setExpenseForm(defaultExpenseForm);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to add monthly outgoing item");
    } finally {
      setSubmittingExpense(false);
    }
  }

  return (
    <main>
      <div className="top-links">
        <Link className="action ghost" href="/outgoings">
          Manage Outgoings
        </Link>
        <Link className="action ghost" href="/accounts">
          Accounts
        </Link>
        <Link className="action ghost" href="/transfers">
          Transfers
        </Link>
      </div>

      <h1>Monthly Expenses</h1>

      {errorMessage && (
        <div className="card">
          <p className="error">{errorMessage}</p>
        </div>
      )}

      <section className="card">
        <h2>Add Month</h2>
        <form className="form-grid" onSubmit={handleMonthSubmit}>
          <label>
            Month Label
            <input
              required
              type="text"
              placeholder="February 2026"
              value={monthForm.month_label}
              onChange={(event) =>
                setMonthForm((current) => ({ ...current, month_label: event.target.value }))
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
              value={monthForm.wage}
              onChange={(event) => setMonthForm((current) => ({ ...current, wage: event.target.value }))}
            />
          </label>

          <label>
            Float Amount
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={monthForm.float_amount}
              onChange={(event) =>
                setMonthForm((current) => ({ ...current, float_amount: event.target.value }))
              }
            />
          </label>

          <button className="action" type="submit" disabled={submittingMonth}>
            {submittingMonth ? "Saving..." : "Add Month"}
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
                      <button
                        type="button"
                        className="month-select"
                        onClick={() => setSelectedMonthId(month.id)}
                      >
                        <span className="month-title">{month.month_label}</span>
                        <span className="month-meta">
                          Wage {currency.format(Number(month.wage))} | Float {currency.format(Number(month.float_amount))}
                        </span>
                      </button>

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

      <section className="card">
        <h2>Monthly Outgoing</h2>

        <label className="stacked">
          Month
          <select
            value={selectedMonthId}
            disabled={months.length === 0 || submittingExpense}
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

        <form className="form-grid" onSubmit={handleExpenseSubmit}>
          <label>
            Name
            <input
              required
              type="text"
              placeholder="Rent"
              value={expenseForm.name}
              onChange={(event) =>
                setExpenseForm((current) => ({ ...current, name: event.target.value }))
              }
            />
          </label>

          <label>
            Due Day
            <input
              required
              type="number"
              min="1"
              max="31"
              value={expenseForm.due_day}
              onChange={(event) =>
                setExpenseForm((current) => ({ ...current, due_day: event.target.value }))
              }
            />
          </label>

          <label>
            Account
            <select
              value={expenseForm.account_code}
              onChange={(event) =>
                setExpenseForm((current) => ({
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
          </label>

          <label>
            Amount
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={expenseForm.amount}
              onChange={(event) =>
                setExpenseForm((current) => ({ ...current, amount: event.target.value }))
              }
            />
          </label>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={expenseForm.is_recurring}
              onChange={(event) =>
                setExpenseForm((current) => ({ ...current, is_recurring: event.target.checked }))
              }
            />
            Recurring
          </label>

          <button
            className="action"
            type="submit"
            disabled={months.length === 0 || submittingExpense}
          >
            {submittingExpense ? "Saving..." : "Add Monthly Outgoing"}
          </button>
        </form>
      </section>

      <section className="card grid">
        <article className="stat">
          <p className="label">Wage</p>
          <p className="value">{currency.format(selectedMonth?.wage ?? 0)}</p>
        </article>
        <article className="stat">
          <p className="label">Float</p>
          <p className="value">{currency.format(selectedMonth?.float_amount ?? 0)}</p>
        </article>
        <article className="stat">
          <p className="label">Starting Point</p>
          <p className="value">{currency.format(selectedMonth?.starting_point ?? 0)}</p>
        </article>
        <article className="stat">
          <p className="label">Total Out</p>
          <p className="value">{currency.format(totalOut)}</p>
        </article>
      </section>

      <section className="card">
        <h2>{selectedMonth?.month_label ?? "No month selected"}</h2>
        {loadingItems ? (
          <p className="label">Loading monthly outgoing values...</p>
        ) : items.length === 0 ? (
          <p className="label">No monthly outgoing values entered yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Due</th>
                <th>Account</th>
                <th>Recurring</th>
                <th className="amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.due_day}</td>
                  <td>{item.account_code}</td>
                  <td>{item.is_recurring ? "Yes" : "No"}</td>
                  <td className="amount">{currency.format(Number(item.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="outgoing-total">
          <p className="outgoing-total-label">Total Monthly Outgoing</p>
          <p className="outgoing-total-value">{currency.format(totalOut)}</p>
        </div>
      </section>

      <section className="card">
        <h2>Transfer Summary</h2>
        <table>
          <tbody>
            <tr>
              <th>Starting Balance</th>
              <td className="amount">{currency.format(startingBalance)}</td>
            </tr>
            <tr>
              <th>Transfer to {accountNameByCode.get("B") ?? "B"}</th>
              <td className="amount">{currency.format(transferToB)}</td>
            </tr>
            <tr>
              <th>Transfer to {accountNameByCode.get("N") ?? "N"}</th>
              <td className="amount">{currency.format(transferToN)}</td>
            </tr>
            <tr>
              <th>Transfer to {accountNameByCode.get("C") ?? "C"}</th>
              <td className="amount">{currency.format(transferToC)}</td>
            </tr>
            <tr>
              <th>Transfer to {accountNameByCode.get("L") ?? "L"}</th>
              <td className="amount">{currency.format(transferToL)}</td>
            </tr>
          </tbody>
        </table>

        <div className="outgoing-total">
          <p className="outgoing-total-label">Total Transfers</p>
          <p className="outgoing-total-value">{currency.format(totalTransfers)}</p>
        </div>
      </section>
    </main>
  );
}
