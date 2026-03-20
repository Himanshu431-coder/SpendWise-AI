import { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { CATEGORIES, CategoryType } from "@/types";
import { suggestBudgets, getCategoryInfo } from "@/lib/ai-engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, Sparkles, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function BudgetPlanner() {
  const { transactions, budgets, setBudget, currencySymbol } = useApp();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const expenses = transactions.filter((t) => t.type === "expense" && t.date.startsWith(currentMonth));

  const expenseCategories = CATEGORIES.filter((c) => c.name !== "Salary/Income");

  const budgetData = useMemo(() => {
    return expenseCategories.map((cat) => {
      const budget = budgets.find((b) => b.category === cat.name && b.month === currentMonth);
      const spent = expenses.filter((t) => t.category === cat.name).reduce((s, t) => s + t.amount, 0);
      const limit = budget?.limit || 0;
      const pct = limit > 0 ? (spent / limit) * 100 : 0;
      return { ...cat, spent, limit, pct };
    }).filter((b) => b.limit > 0 || b.spent > 0);
  }, [transactions, budgets, currentMonth]);

  const overBudget = budgetData.filter((b) => b.pct > 90 && b.limit > 0);
  const totalBudget = budgetData.reduce((s, b) => s + b.limit, 0);
  const totalSpent = budgetData.reduce((s, b) => s + b.spent, 0);
  const totalPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const handleSuggest = () => {
    const suggestions = suggestBudgets(transactions);
    suggestions.forEach((s) => setBudget(s.category, s.suggestedBudget, currentMonth));
    toast.success(`AI suggested budgets for ${suggestions.length} categories.`);
  };

  const [editCat, setEditCat] = useState<CategoryType | null>(null);
  const [editVal, setEditVal] = useState("");

  const handleSetBudget = () => {
    if (editCat && editVal) {
      setBudget(editCat, parseFloat(editVal), currentMonth);
      setEditCat(null);
      setEditVal("");
      toast.success("Budget set.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Budget Planner</h1>
          <p className="text-muted-foreground text-sm mt-1">{new Date().toLocaleDateString("en", { month: "long", year: "numeric" })}</p>
        </div>
        <Button onClick={handleSuggest} className="gradient-violet text-primary-foreground gap-2">
          <Sparkles size={16} />
          AI Suggest Budgets
        </Button>
      </div>

      {/* Alerts */}
      {overBudget.length > 0 && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3">
          <AlertTriangle className="text-destructive flex-shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-sm font-medium">Budget Alert</p>
            <p className="text-xs text-muted-foreground mt-1">
              {overBudget.map((b) => b.name).join(", ")} {overBudget.length === 1 ? "is" : "are"} near or over budget.
            </p>
          </div>
        </div>
      )}

      {/* Overall progress */}
      {totalBudget > 0 && (
        <div className="glass-card p-5">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">Overall Monthly Budget</span>
            <span className="tabular-nums text-muted-foreground">{currencySymbol}{totalSpent.toLocaleString()} / {currencySymbol}{totalBudget.toLocaleString()}</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(totalPct, 100)}%` }}
              transition={{ duration: 0.8 }}
              className={`h-full rounded-full ${totalPct > 90 ? "bg-destructive" : totalPct > 75 ? "bg-warning" : "bg-success"}`}
            />
          </div>
        </div>
      )}

      {/* Budget Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {expenseCategories.map((cat) => {
          const data = budgetData.find((b) => b.name === cat.name);
          const spent = data?.spent || 0;
          const limit = data?.limit || 0;
          const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
          const remaining = Math.max(0, limit - spent);
          const isEditing = editCat === cat.name;

          return (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-5 hover-scale"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{cat.icon}</span>
                <div>
                  <p className="text-sm font-medium">{cat.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {limit > 0 ? `${currencySymbol}${remaining.toLocaleString()} remaining` : "No budget set"}
                  </p>
                </div>
              </div>

              {/* Circular progress */}
              <div className="flex items-center gap-4 mb-3">
                <div className="relative w-16 h-16">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(217 33% 20%)" strokeWidth="3" />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={pct > 90 ? "#ef4444" : pct > 75 ? "#f59e0b" : "#22c55e"}
                      strokeWidth="3"
                      strokeDasharray={`${pct}, 100`}
                      className="transition-all duration-700"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums">
                    {limit > 0 ? `${Math.round(pct)}%` : "—"}
                  </span>
                </div>
                <div>
                  <p className="text-lg font-bold tabular-nums">{currencySymbol}{spent.toLocaleString()}</p>
                  {limit > 0 && <p className="text-xs text-muted-foreground tabular-nums">of {currencySymbol}{limit.toLocaleString()}</p>}
                </div>
              </div>

              {isEditing ? (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Budget limit"
                    value={editVal}
                    onChange={(e) => setEditVal(e.target.value)}
                    className="bg-background text-sm h-8"
                    autoFocus
                  />
                  <Button size="sm" onClick={handleSetBudget} className="h-8">Set</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditCat(null)} className="h-8">✕</Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => { setEditCat(cat.name); setEditVal(limit > 0 ? String(limit) : ""); }}
                >
                  {limit > 0 ? "Edit Budget" : "Set Budget"}
                </Button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
