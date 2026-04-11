import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Transaction, Budget, Settings, CurrencyCode, CategoryType, CURRENCY_SYMBOLS } from "@/types";
import { api, TransactionAPI } from "@/services/api";
import { toast } from "sonner";

interface AppContextType {
  transactions: Transaction[];
  budgets: Budget[];
  settings: Settings;
  currency: CurrencyCode;
  currencySymbol: string;
  loading: boolean;
  addTransaction: (t: Omit<Transaction, "id" | "createdAt">) => Promise<void>;
  updateTransaction: (t: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  setBudget: (category: CategoryType, limit: number, month: string) => void;
  updateSettings: (s: Partial<Settings>) => void;
  loadDemoData: () => Promise<void>;
  clearAllData: () => void;
  importTransactions: (txns: Transaction[]) => void;
  refreshTransactions: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function mapTransaction(t: TransactionAPI): Transaction {
  return {
    id: t.id,
    date: t.date,
    category: t.category as CategoryType,
    description: t.description,
    amount: t.amount,
    type: t.type,
    createdAt: t.created_at,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>(() =>
    loadFromStorage("sw_budgets", [])
  );
  const [settings, setSettings] = useState<Settings>(() =>
    loadFromStorage("sw_settings", { currency: "INR" as CurrencyCode, theme: "dark" as const })
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem("sw_budgets", JSON.stringify(budgets));
  }, [budgets]);

  useEffect(() => {
    localStorage.setItem("sw_settings", JSON.stringify(settings));
    document.documentElement.classList.toggle("light", settings.theme === "light");
  }, [settings]);

  useEffect(() => {
    document.documentElement.classList.toggle("light", settings.theme === "light");
  }, []);

  const refreshTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getTransactions();
      const mapped = response.transactions.map(mapTransaction);
      setTransactions(mapped);
    } catch (error: any) {
      console.error("Failed to load transactions:", error);
      toast.error("Could not connect to backend. Using local data.");
      setTransactions(loadFromStorage("sw_transactions", []));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshTransactions();
  }, [refreshTransactions]);

  const addTransaction = useCallback(
    async (t: Omit<Transaction, "id" | "createdAt">) => {
      try {
        await api.addTransaction({
          date: t.date,
          category: t.category,
          description: t.description,
          amount: t.amount,
          type: t.type,
          tags: [],
        });
        await refreshTransactions();
        toast.success("Transaction added!");
      } catch (error: any) {
        toast.error("Failed to add transaction: " + error.message);
        const newT: Transaction = {
          ...t,
          id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
          createdAt: new Date().toISOString(),
        };
        setTransactions((prev) => [newT, ...prev]);
      }
    },
    [refreshTransactions]
  );

  const updateTransaction = useCallback(
    async (t: Transaction) => {
      try {
        await api.updateTransaction(t.id, {
          date: t.date,
          category: t.category,
          description: t.description,
          amount: t.amount,
          type: t.type,
          tags: [],
        });
        await refreshTransactions();
        toast.success("Transaction updated!");
      } catch (error: any) {
        toast.error("Failed to update: " + error.message);
        setTransactions((prev) => prev.map((x) => (x.id === t.id ? t : x)));
      }
    },
    [refreshTransactions]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      try {
        await api.deleteTransaction(id);
        await refreshTransactions();
        toast.success("Transaction deleted!");
      } catch (error: any) {
        toast.error("Failed to delete: " + error.message);
        setTransactions((prev) => prev.filter((x) => x.id !== id));
      }
    },
    [refreshTransactions]
  );

  const setBudgetFn = useCallback(
    (category: CategoryType, limit: number, month: string) => {
      setBudgets((prev) => {
        const existing = prev.findIndex(
          (b) => b.category === category && b.month === month
        );
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { ...updated[existing], limit };
          return updated;
        }
        return [
          ...prev,
          {
            id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
            category,
            limit,
            month,
          },
        ];
      });
    },
    []
  );

  const updateSettings = useCallback((s: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...s }));
  }, []);

  const loadDemoData = useCallback(async () => {
    try {
      const result = await api.loadDemoData();
      toast.success(result.message);
      await refreshTransactions();
    } catch (error: any) {
      toast.error("Failed to load demo data: " + error.message);
      const { generateDemoData } = await import("@/lib/demo-data");
      setTransactions(generateDemoData());
    }
  }, [refreshTransactions]);

  const clearAllData = useCallback(async () => {
    try {
      await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/transactions`,
        { method: "DELETE" }
      );
      setTransactions([]);
      setBudgets([]);
      toast.success("All data cleared!");
    } catch {
      setTransactions([]);
      setBudgets([]);
      toast.info("Data cleared locally.");
    }
  }, []);

  const importTransactions = useCallback((txns: Transaction[]) => {
    setTransactions((prev) =>
      [...prev, ...txns].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    );
  }, []);

  return (
    <AppContext.Provider
      value={{
        transactions,
        budgets,
        settings,
        currency: settings.currency,
        currencySymbol: CURRENCY_SYMBOLS[settings.currency],
        loading,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        setBudget: setBudgetFn,
        updateSettings,
        loadDemoData,
        clearAllData,
        importTransactions,
        refreshTransactions,
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