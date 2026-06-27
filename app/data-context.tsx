"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Account, MonthSummary } from "@/lib/types";

type DataContextType = {
  months: MonthSummary[];
  accounts: Account[];
  selectedMonthId: string;
  setSelectedMonthId: (id: string) => void;
  loadingMonths: boolean;
  loadingAccounts: boolean;
  refreshMonths: () => Promise<void>;
  refreshAccounts: () => Promise<void>;
  setMonths: React.Dispatch<React.SetStateAction<MonthSummary[]>>;
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
};

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [months, setMonths] = useState<MonthSummary[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedMonthId, setSelectedMonthId] = useState<string>("");
  const [loadingMonths, setLoadingMonths] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const refreshMonths = async () => {
    setLoadingMonths(true);
    try {
      const response = await fetch("/api/months");
      const payload = await response.json();
      if (response.ok) {
        const fetchedMonths = (payload.data ?? []) as MonthSummary[];
        setMonths(fetchedMonths);
        setSelectedMonthId((current) => {
          if (fetchedMonths.length === 0) return "";
          if (current && fetchedMonths.some((m) => m.id === current)) return current;
          return fetchedMonths[0].id;
        });
      }
    } catch (error) {
      console.error("Failed to load months:", error);
    } finally {
      setLoadingMonths(false);
    }
  };

  const refreshAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const response = await fetch("/api/accounts");
      const payload = await response.json();
      if (response.ok) {
        setAccounts((payload.data ?? []) as Account[]);
      }
    } catch (error) {
      console.error("Failed to load accounts:", error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  useEffect(() => {
    void refreshMonths();
    void refreshAccounts();
  }, []);

  return (
    <DataContext.Provider
      value={{
        months,
        accounts,
        selectedMonthId,
        setSelectedMonthId,
        loadingMonths,
        loadingAccounts,
        refreshMonths,
        refreshAccounts,
        setMonths,
        setAccounts,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useDataContext() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useDataContext must be used within a DataProvider");
  }
  return context;
}
