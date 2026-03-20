export interface Transaction {
  id: string;
  date: string;
  category: CategoryType;
  amount: number;
  description: string;
  type: "income" | "expense";
  createdAt: string;
}

export interface Budget {
  id: string;
  category: CategoryType;
  limit: number;
  month: string; // YYYY-MM
}

export interface Settings {
  currency: CurrencyCode;
  theme: "dark" | "light";
}

export type CurrencyCode = "INR" | "USD" | "EUR" | "GBP";

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

export type CategoryType =
  | "Food & Dining"
  | "Transport"
  | "Entertainment"
  | "Shopping"
  | "Bills & Utilities"
  | "Health"
  | "Education"
  | "Salary/Income"
  | "Others";

export interface CategoryInfo {
  name: CategoryType;
  icon: string;
  color: string;
  keywords: string[];
}

export const CATEGORIES: CategoryInfo[] = [
  { name: "Food & Dining", icon: "🍔", color: "#f97316", keywords: ["lunch", "dinner", "breakfast", "restaurant", "cafe", "coffee", "groceries", "food", "snack", "pizza", "burger", "zomato", "swiggy", "starbucks", "dominos"] },
  { name: "Transport", icon: "🚗", color: "#3b82f6", keywords: ["uber", "ola", "cab", "taxi", "bus", "metro", "fuel", "petrol", "diesel", "parking", "train", "flight", "lyft"] },
  { name: "Entertainment", icon: "🎬", color: "#ec4899", keywords: ["movie", "netflix", "spotify", "gaming", "concert", "party", "outing", "subscription", "steam", "hulu", "disney"] },
  { name: "Shopping", icon: "🛍️", color: "#a855f7", keywords: ["amazon", "flipkart", "clothes", "shoes", "electronics", "gadget", "mall", "myntra", "online", "purchase"] },
  { name: "Bills & Utilities", icon: "📱", color: "#eab308", keywords: ["electricity", "water", "gas", "internet", "wifi", "phone", "recharge", "rent", "maintenance", "bill", "utility"] },
  { name: "Health", icon: "💊", color: "#ef4444", keywords: ["medicine", "doctor", "hospital", "gym", "pharmacy", "medical", "health", "dentist", "clinic"] },
  { name: "Education", icon: "📚", color: "#06b6d4", keywords: ["book", "course", "udemy", "tutorial", "stationery", "tuition", "fees", "school", "college", "training"] },
  { name: "Salary/Income", icon: "💰", color: "#22c55e", keywords: ["salary", "freelance", "bonus", "dividend", "interest", "refund", "cashback", "income", "payment received"] },
  { name: "Others", icon: "📦", color: "#6b7280", keywords: [] },
];

export interface Insight {
  id: string;
  type: "info" | "warning" | "success" | "danger";
  title: string;
  description: string;
  icon: string;
}

export interface BudgetSuggestion {
  category: CategoryType;
  suggestedBudget: number;
  averageSpend: number;
}

export interface SavingsScore {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  message: string;
}

export interface ParsedTransaction {
  amount: number;
  category: CategoryType;
  date: string;
  description: string;
  confidence: number;
}
