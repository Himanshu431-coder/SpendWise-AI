import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Transaction, Budget, Settings, CurrencyCode, CategoryType, CURRENCY_SYMBOLS } from "@/types";

interface AppContextType {
  transactions: Transaction[];
  budgets: Budget[];
  settings: Settings;
  currency: CurrencyCode;
  currencySymbol: string;
  addTransaction: (t: Omit<Transaction, "id" | "createdAt">) => void;
  updateTransaction: (t: Transaction) => void;
  deleteTransaction: (id: string) => void;
  setBudget: (category: CategoryType, limit: number, month: string) => void;
  updateSettings: (s: Partial<Settings>) => void;
  loadDemoData: () => void;
  clearAllData: () => void;
  importTransactions: (txns: Transaction[]) => void;
}

const AppContext = createContext<AppContextType | null>(null);

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadFromStorage("sw_transactions", []));
  const [budgets, setBudgets] = useState<Budget[]>(() => loadFromStorage("sw_budgets", []));
  const [settings, setSettings] = useState<Settings>(() => loadFromStorage("sw_settings", { currency: "INR" as CurrencyCode, theme: "dark" as const }));

  useEffect(() => { localStorage.setItem("sw_transactions", JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem("sw_budgets", JSON.stringify(budgets)); }, [budgets]);
  useEffect(() => {
    localStorage.setItem("sw_settings", JSON.stringify(settings));
    document.documentElement.classList.toggle("light", settings.theme === "light");
  }, [settings]);

  // Apply theme on mount
  useEffect(() => {
    document.documentElement.classList.toggle("light", settings.theme === "light");
  }, []);

  const addTransaction = useCallback((t: Omit<Transaction, "id" | "createdAt">) => {
    const newT: Transaction = { ...t, id: crypto.randomUUID?.() || Math.random().toString(36).slice(2), createdAt: new Date().toISOString() };
    setTransactions((prev) => [newT, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  }, []);

  const updateTransaction = useCallback((t: Transaction) => {
    setTransactions((prev) => prev.map((x) => (x.id === t.id ? t : x)));
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const setBudgetFn = useCallback((category: CategoryType, limit: number, month: string) => {
    setBudgets((prev) => {
      const existing = prev.findIndex((b) => b.category === category && b.month === month);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], limit };
        return updated;
      }
      return [...prev, { id: crypto.randomUUID?.() || Math.random().toString(36).slice(2), category, limit, month }];
    });
  }, []);

  const updateSettings = useCallback((s: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...s }));
  }, []);

  const loadDemoData = useCallback(async () => {
    const { generateDemoData } = await import("@/lib/demo-data");
    setTransactions(generateDemoData());
  }, []);

  const clearAllData = useCallback(() => {
    setTransactions([]);
    setBudgets([]);
  }, []);

  const importTransactions = useCallback((txns: Transaction[]) => {
    setTransactions((prev) => [...prev, ...txns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  }, []);

  return (
    <AppContext.Provider
      value={{
        transactions, budgets, settings,
        currency: settings.currency,
        currencySymbol: CURRENCY_SYMBOLS[settings.currency],
        addTransaction, updateTransaction, deleteTransaction,
        setBudget: setBudgetFn, updateSettings, loadDemoData, clearAllData, importTransactions,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
