import {
  Transaction, Budget, CategoryType, CATEGORIES, Insight,
  BudgetSuggestion, SavingsScore, ParsedTransaction,
} from "@/types";

// ──────────────────── Natural Language Parser ────────────────────

export function parseExpenseFromText(text: string): ParsedTransaction {
  const lowerText = text.toLowerCase();

  // Extract amount
  const amountMatch = text.match(/(?:₹|rs\.?|rupees?|\$|€|£)\s*(\d[\d,]*\.?\d*)/i)
    || text.match(/(\d[\d,]*\.?\d*)\s*(?:₹|rs\.?|rupees?|\$|€|£)/i)
    || text.match(/(\d[\d,]*\.?\d*)/);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, "")) : 0;

  // Detect category
  let category: CategoryType = "Others";
  let confidence = 0.5;
  for (const cat of CATEGORIES) {
    if (cat.keywords.some((kw) => lowerText.includes(kw))) {
      category = cat.name;
      confidence = 0.85;
      break;
    }
  }

  // Detect date
  let date = new Date().toISOString().split("T")[0];
  if (lowerText.includes("yesterday")) {
    const d = new Date(); d.setDate(d.getDate() - 1);
    date = d.toISOString().split("T")[0];
    confidence += 0.05;
  } else if (lowerText.includes("last week")) {
    const d = new Date(); d.setDate(d.getDate() - 7);
    date = d.toISOString().split("T")[0];
  }

  // Build description – remove the amount portion
  let description = text
    .replace(/(?:₹|rs\.?|rupees?|\$|€|£)\s*\d[\d,]*\.?\d*/gi, "")
    .replace(/\d[\d,]*\.?\d*\s*(?:₹|rs\.?|rupees?|\$|€|£)/gi, "")
    .replace(/\b\d[\d,]*\.?\d*\b/, "")
    .replace(/\b(yesterday|today|last week)\b/gi, "")
    .trim();
  if (description.length < 2) description = text;
  description = description.charAt(0).toUpperCase() + description.slice(1);

  if (amount > 0) confidence += 0.1;

  return { amount, category, date, description, confidence: Math.min(confidence, 1) };
}

// ──────────────────── Insight Generator ────────────────────

export function generateInsights(transactions: Transaction[]): Insight[] {
  if (transactions.length === 0) return [];

  const expenses = transactions.filter((t) => t.type === "expense");
  const incomes = transactions.filter((t) => t.type === "income");
  const insights: Insight[] = [];
  const now = new Date();

  // Top spending category
  const catSpend: Record<string, number> = {};
  expenses.forEach((t) => { catSpend[t.category] = (catSpend[t.category] || 0) + t.amount; });
  const sortedCats = Object.entries(catSpend).sort((a, b) => b[1] - a[1]);
  if (sortedCats.length > 0) {
    insights.push({
      id: "top-category",
      type: "info",
      title: "Top Spending Category",
      description: `Your highest spending is in ${sortedCats[0][0]} at ${formatCur(sortedCats[0][1])}.`,
      icon: "TrendingUp",
    });
  }

  // Week-over-week comparison
  const thisWeekStart = new Date(now); thisWeekStart.setDate(now.getDate() - now.getDay());
  const lastWeekStart = new Date(thisWeekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const thisWeek = expenses.filter((t) => new Date(t.date) >= thisWeekStart).reduce((s, t) => s + t.amount, 0);
  const lastWeek = expenses.filter((t) => { const d = new Date(t.date); return d >= lastWeekStart && d < thisWeekStart; }).reduce((s, t) => s + t.amount, 0);
  if (lastWeek > 0) {
    const pctChange = ((thisWeek - lastWeek) / lastWeek * 100).toFixed(0);
    insights.push({
      id: "weekly-compare",
      type: Number(pctChange) > 20 ? "warning" : "success",
      title: "Weekly Trend",
      description: Number(pctChange) > 0
        ? `You spent ${pctChange}% more this week compared to last week.`
        : `Great! You spent ${Math.abs(Number(pctChange))}% less this week.`,
      icon: "BarChart3",
    });
  }

  // Daily average
  const uniqueDays = new Set(expenses.map((t) => t.date)).size || 1;
  const dailyAvg = expenses.reduce((s, t) => s + t.amount, 0) / uniqueDays;
  insights.push({
    id: "daily-avg",
    type: "info",
    title: "Daily Average",
    description: `Your average daily spending is ${formatCur(dailyAvg)}.`,
    icon: "Calculator",
  });

  // Anomaly detection
  const catAvg: Record<string, { total: number; count: number }> = {};
  expenses.forEach((t) => {
    if (!catAvg[t.category]) catAvg[t.category] = { total: 0, count: 0 };
    catAvg[t.category].total += t.amount;
    catAvg[t.category].count++;
  });
  for (const t of expenses) {
    const avg = catAvg[t.category].total / catAvg[t.category].count;
    if (t.amount >= avg * 2 && t.amount > 500) {
      insights.push({
        id: `anomaly-${t.id}`,
        type: "danger",
        title: "Unusual Expense",
        description: `${formatCur(t.amount)} on ${t.category} (${t.description}) is ${(t.amount / avg).toFixed(1)}x your average.`,
        icon: "AlertTriangle",
      });
      break;
    }
  }

  // Savings forecast
  const thisMonth = now.toISOString().slice(0, 7);
  const monthIncome = incomes.filter((t) => t.date.startsWith(thisMonth)).reduce((s, t) => s + t.amount, 0);
  const monthExpense = expenses.filter((t) => t.date.startsWith(thisMonth)).reduce((s, t) => s + t.amount, 0);
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projectedExpense = (monthExpense / dayOfMonth) * daysInMonth;
  const projectedSavings = monthIncome - projectedExpense;
  if (monthIncome > 0) {
    insights.push({
      id: "savings-forecast",
      type: projectedSavings > 0 ? "success" : "danger",
      title: "Savings Forecast",
      description: projectedSavings > 0
        ? `On track to save ${formatCur(projectedSavings)} this month.`
        : `Warning: projected overspend of ${formatCur(Math.abs(projectedSavings))} this month.`,
      icon: "PiggyBank",
    });
  }

  // Highest spending day of week
  const dayTotals = [0, 0, 0, 0, 0, 0, 0];
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  expenses.forEach((t) => { const d = new Date(t.date).getDay(); dayTotals[d] += t.amount; dayCounts[d]++; });
  const maxDay = dayTotals.indexOf(Math.max(...dayTotals));
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  if (Math.max(...dayTotals) > 0) {
    insights.push({
      id: "peak-day",
      type: "info",
      title: "Peak Spending Day",
      description: `You tend to spend most on ${dayNames[maxDay]}s.`,
      icon: "Calendar",
    });
  }

  return insights.slice(0, 6);
}

// ──────────────────── Budget Suggester ────────────────────

export function suggestBudgets(transactions: Transaction[]): BudgetSuggestion[] {
  const now = new Date();
  const threeMonthsAgo = new Date(now); threeMonthsAgo.setMonth(now.getMonth() - 3);

  const recent = transactions.filter(
    (t) => t.type === "expense" && new Date(t.date) >= threeMonthsAgo
  );

  const catSpend: Record<string, number> = {};
  recent.forEach((t) => { catSpend[t.category] = (catSpend[t.category] || 0) + t.amount; });

  return Object.entries(catSpend).map(([category, total]) => {
    const avg = total / 3;
    return {
      category: category as CategoryType,
      suggestedBudget: Math.ceil((avg * 1.1) / 100) * 100,
      averageSpend: Math.round(avg),
    };
  }).sort((a, b) => b.averageSpend - a.averageSpend);
}

// ──────────────────── Savings Score ────────────────────

export function calculateSavingsScore(
  transactions: Transaction[],
  budgets: Budget[]
): SavingsScore {
  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  if (totalIncome === 0) return { score: 50, grade: "C", message: "Add income to calculate your score." };

  // Income to expense ratio (40%)
  const ratio = 1 - totalExpense / totalIncome;
  const ratioScore = Math.max(0, Math.min(40, ratio * 100));

  // Consistency – how many months had positive savings (30%)
  const months = new Set(transactions.map((t) => t.date.slice(0, 7)));
  let posMonths = 0;
  months.forEach((m) => {
    const inc = transactions.filter((t) => t.date.startsWith(m) && t.type === "income").reduce((s, t) => s + t.amount, 0);
    const exp = transactions.filter((t) => t.date.startsWith(m) && t.type === "expense").reduce((s, t) => s + t.amount, 0);
    if (inc > exp) posMonths++;
  });
  const consistencyScore = months.size > 0 ? (posMonths / months.size) * 30 : 15;

  // Budget adherence (30%)
  let adherenceScore = 15; // default if no budgets
  if (budgets.length > 0) {
    const now = new Date().toISOString().slice(0, 7);
    const monthBudgets = budgets.filter((b) => b.month === now);
    if (monthBudgets.length > 0) {
      let within = 0;
      monthBudgets.forEach((b) => {
        const spent = transactions.filter((t) => t.type === "expense" && t.category === b.category && t.date.startsWith(now)).reduce((s, t) => s + t.amount, 0);
        if (spent <= b.limit) within++;
      });
      adherenceScore = (within / monthBudgets.length) * 30;
    }
  }

  const score = Math.round(ratioScore + consistencyScore + adherenceScore);
  let grade: SavingsScore["grade"] = "F";
  if (score >= 80) grade = "A";
  else if (score >= 65) grade = "B";
  else if (score >= 50) grade = "C";
  else if (score >= 35) grade = "D";

  const messages: Record<string, string> = {
    A: "Excellent! You're a financial rockstar. 🌟",
    B: "Good job! Your finances are in solid shape.",
    C: "Fair. There's room for improvement.",
    D: "Needs attention. Consider cutting discretionary spending.",
    F: "Critical. Your expenses significantly exceed income.",
  };

  return { score, grade, message: messages[grade] };
}

// ──────────────────── Helpers ────────────────────

function formatCur(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function getCategoryInfo(name: string) {
  return CATEGORIES.find((c) => c.name === name) || CATEGORIES[CATEGORIES.length - 1];
}
