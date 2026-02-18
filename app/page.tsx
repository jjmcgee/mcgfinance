"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Account, MonthSummary, ExpenseItem } from "@/lib/types";

type MonthFormState = {
  month_label: string;
  wage: string;
  float_amount: string;
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
  const [loadingMonths, setLoadingMonths] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [submittingMonth, setSubmittingMonth] = useState(false);
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

      setAccounts((payload.data ?? []) as Account[]);
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

  return (
    <main>
      <div className="top-links">
        <Link className="action ghost" href="/outgoings">
          Outgoings
        </Link>
        <Link className="action ghost" href="/accounts">
          Accounts
        </Link>
        <Link className="action ghost" href="/transfers">
          Transfers
        </Link>
        <Link className="action ghost" href="/profile">
          Profile
        </Link>
      </div>

      <h1>Monthly Summary</h1>

      {errorMessage && (
        <div className="card">
          <p className="error">{errorMessage}</p>
        </div>
      )}

      <section className="card">
        <h2>Month</h2>
        <label className="stacked">
          Select Month
          <select
            value={selectedMonthId}
            disabled={loadingMonths || months.length === 0}
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
        <h2>Transfer Summary</h2>
        {loadingItems ? (
          <p className="label">Loading transfer summary...</p>
        ) : (
          <>
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
          </>
        )}
      </section>

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
    </main>
  );
}
