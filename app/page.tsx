"use client";

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



  // Cashflow widths for money router flow bars
  const flowPercentages = useMemo(() => {
    const totalAllocated = totalTransfers || 1;
    return {
      b: (transferToB / totalAllocated) * 100,
      n: (transferToN / totalAllocated) * 100,
      c: (transferToC / totalAllocated) * 100,
      l: (transferToL / totalAllocated) * 100,
    };
  }, [totalTransfers, transferToB, transferToN, transferToC, transferToL]);

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
      <h1>Monthly Summary</h1>

      {errorMessage && (
        <div className="error">
          <p>{errorMessage}</p>
        </div>
      )}

      {/* Month Selection Card */}
      <section className="card highlight">
        <label htmlFor="dashboard-month-select" className="stacked">
          <span style={{ fontSize: "1.05rem", fontWeight: "600", color: "#fff", marginBottom: "0.2rem", display: "block" }}>Selected Budget Month</span>
          <select
            id="dashboard-month-select"
            name="selected_month_id"
            value={selectedMonthId}
            disabled={loadingMonths || months.length === 0}
            onChange={(event) => setSelectedMonthId(event.target.value)}
            style={{ height: "46px", fontSize: "1.05rem" }}
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

      {/* Main stats layout */}
      <section className="grid" style={{ marginBottom: "1.5rem" }}>
        <article className="stat positive">
          <p className="label">Wage (Salary)</p>
          <p className="value">{currency.format(selectedMonth?.wage ?? 0)}</p>
        </article>
        <article className="stat">
          <p className="label">Float Amount</p>
          <p className="value">{currency.format(selectedMonth?.float_amount ?? 0)}</p>
        </article>
        <article className="stat">
          <p className="label">Starting Point</p>
          <p className="value">{currency.format(selectedMonth?.starting_point ?? 0)}</p>
        </article>
        <article className="stat danger">
          <p className="label">Total Outgoings</p>
          <p className="value">{currency.format(totalOut)}</p>
        </article>
      </section>



      {/* cashflow Routing Router & Transfer Summary */}
      <section className="card" style={{ marginBottom: "1.5rem" }}>
        <h2>Transfer Summary</h2>
        {loadingItems ? (
          <p className="label" style={{ padding: "1rem 0" }}>Loading transfer summaries...</p>
        ) : (
          <div className="grid-2" style={{ gap: "2rem" }}>
            {/* Table side */}
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Destination Account</th>
                    <th className="amount">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: "500" }}>Starting Balance</td>
                    <td className="amount" style={{ color: "var(--muted)" }}>{currency.format(startingBalance)}</td>
                  </tr>
                  <tr>
                    <td>Transfer to {accountNameByCode.get("B") ?? "B"}</td>
                    <td className="amount">{currency.format(transferToB)}</td>
                  </tr>
                  <tr>
                    <td>Transfer to {accountNameByCode.get("N") ?? "N"}</td>
                    <td className="amount">{currency.format(transferToN)}</td>
                  </tr>
                  <tr>
                    <td>Transfer to {accountNameByCode.get("C") ?? "C"} (Float)</td>
                    <td className="amount">{currency.format(transferToC)}</td>
                  </tr>
                  <tr style={{ borderTop: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.01)" }}>
                    <td style={{ fontWeight: "600", color: "var(--money)" }}>Leftover to {accountNameByCode.get("L") ?? "L"}</td>
                    <td className="amount" style={{ color: "var(--money)" }}>{currency.format(transferToL)}</td>
                  </tr>
                </tbody>
              </table>
              <div className="outgoing-total" style={{ padding: "1rem" }}>
                <p className="outgoing-total-label">Total Allocated Transfers</p>
                <p className="outgoing-total-value" style={{ color: "var(--accent)" }}>{currency.format(totalTransfers)}</p>
              </div>
            </div>

            {/* Money Router Flow side */}
            <div className="cashflow-visualizer">
              <h3 style={{ fontSize: "1.05rem", fontWeight: "600", marginBottom: "0.5rem" }}>Visual Fund Allocations</h3>
              
              <div className="flow-step">
                <div className="flow-label">{accountNameByCode.get("B") ?? "B"}</div>
                <div className="flow-bar-container">
                  <div className="flow-bar-bg">
                    <div className="flow-bar-fill" style={{ width: `${flowPercentages.b}%`, background: "var(--accent)" }} />
                  </div>
                  <span className="flow-value">{currency.format(transferToB)}</span>
                </div>
              </div>

              <div className="flow-step">
                <div className="flow-label">{accountNameByCode.get("N") ?? "N"}</div>
                <div className="flow-bar-container">
                  <div className="flow-bar-bg">
                    <div className="flow-bar-fill" style={{ width: `${flowPercentages.n}%`, background: "var(--accent)" }} />
                  </div>
                  <span className="flow-value">{currency.format(transferToN)}</span>
                </div>
              </div>

              <div className="flow-step">
                <div className="flow-label">{accountNameByCode.get("C") ?? "C"}</div>
                <div className="flow-bar-container">
                  <div className="flow-bar-bg">
                    <div className="flow-bar-fill" style={{ width: `${flowPercentages.c}%`, background: "#818cf8" }} />
                  </div>
                  <span className="flow-value">{currency.format(transferToC)}</span>
                </div>
              </div>

              <div className="flow-step">
                <div className="flow-label">{accountNameByCode.get("L") ?? "L"}</div>
                <div className="flow-bar-container">
                  <div className="flow-bar-bg">
                    <div className="flow-bar-fill" style={{ width: `${flowPercentages.l}%`, background: "var(--money)" }} />
                  </div>
                  <span className="flow-value" style={{ color: "var(--money)" }}>{currency.format(transferToL)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Add Month form */}
      <section className="card">
        <h2>Create Budget Month</h2>
        <form className="form-grid full-width-btn" onSubmit={handleMonthSubmit}>
          <label htmlFor="month-label">
            Month Label
            <input
              required
              id="month-label"
              name="month_label"
              type="text"
              placeholder="e.g. February 2026"
              value={monthForm.month_label}
              onChange={(event) =>
                setMonthForm((current) => ({ ...current, month_label: event.target.value }))
              }
              autoComplete="off"
            />
          </label>

          <label htmlFor="month-wage">
            Wage (Salary)
            <input
              required
              id="month-wage"
              name="wage"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={monthForm.wage}
              onChange={(event) => setMonthForm((current) => ({ ...current, wage: event.target.value }))}
              autoComplete="transaction-amount"
            />
          </label>

          <label htmlFor="month-float-amount" style={{ gridColumn: "span 2" }}>
            Float Amount
            <input
              required
              id="month-float-amount"
              name="float_amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={monthForm.float_amount}
              onChange={(event) =>
                setMonthForm((current) => ({ ...current, float_amount: event.target.value }))
              }
              autoComplete="transaction-amount"
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
