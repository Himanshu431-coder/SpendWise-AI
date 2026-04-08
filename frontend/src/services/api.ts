// src/services/api.ts
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface TransactionAPI {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  tags: string[];
  sentiment: string | null;
  created_at: string;
  ai_category_confidence: number;
}

export interface NLPParseResult {
  amount: number | null;
  category: string;
  description: string;
  date: string;
  type: "income" | "expense";
  confidence: number;
  detected_keywords: string[];
  sentiment: string;
}

export interface InsightItem {
  type: "info" | "warning" | "success" | "alert" | "prediction";
  title: string;
  message: string;
  severity: number;
  data: Record<string, any> | null;
}

export interface HealthScore {
  score: number;
  grade: string;
  savings_ratio: number;
  expense_stability: number;
  budget_adherence: number;
  category_diversity: number;
  verdict: string;
  recommendations: string[];
}

export interface SummaryData {
  total_income: number;
  total_expense: number;
  balance: number;
  transaction_count: number;
  categories: Array<{
    name: string;
    total: number;
    count: number;
    percentage: number;
    icon: string;
    color: string;
  }>;
  monthly_trend: Array<{
    month: string;
    income: number;
    expense: number;
    savings: number;
  }>;
  daily_trend: Array<{
    date: string;
    amount: number;
  }>;
  health_score: HealthScore;
  recent_transactions: TransactionAPI[];
}

export interface BudgetSuggestion {
  category: string;
  suggested_limit: number;
  average_spending: number;
  max_spending: number;
  min_spending: number;
  rationale: string;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const config: RequestInit = {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  };

  const response = await fetch(url, config);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }
  return response.json();
}

export const api = {
  // Transactions
  getTransactions: () =>
    request<{ transactions: TransactionAPI[]; count: number }>("/api/transactions"),

  addTransaction: (data: {
    date: string;
    category: string;
    description: string;
    amount: number;
    type: "income" | "expense";
    tags?: string[];
  }) =>
    request<{ message: string; transaction: TransactionAPI }>("/api/transactions", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateTransaction: (id: string, data: {
    date: string;
    category: string;
    description: string;
    amount: number;
    type: "income" | "expense";
    tags?: string[];
  }) =>
    request<{ message: string; transaction: TransactionAPI }>(
      `/api/transactions/${id}`,
      { method: "PUT", body: JSON.stringify(data) }
    ),

  deleteTransaction: (id: string) =>
    request<{ message: string }>(`/api/transactions/${id}`, { method: "DELETE" }),

  // Dashboard
  getSummary: () => request<SummaryData>("/api/summary"),

  // AI
  parseExpense: (text: string) =>
    request<NLPParseResult>("/api/ai/parse", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  getInsights: () => request<{ insights: InsightItem[] }>("/api/ai/insights"),

  getHealthScore: () => request<HealthScore>("/api/ai/health-score"),

  getBudgetSuggestions: () =>
    request<{ suggestions: BudgetSuggestion[]; count: number }>(
      "/api/ai/suggest-budgets"
    ),

  // Utility
  loadDemoData: () =>
    request<{ message: string; count: number }>("/api/demo/load", {
      method: "POST",
    }),

  exportCSV: () => {
    window.open(`${API_BASE}/api/export/csv`, "_blank");
  },

  checkHealth: async (): Promise<boolean> => {
    try {
      await request("/");
      return true;
    } catch {
      return false;
    }
  },
};