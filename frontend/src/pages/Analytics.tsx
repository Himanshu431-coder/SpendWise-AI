import { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { generateInsights, getCategoryInfo } from "@/lib/ai-engine";
import { motion } from "framer-motion";
import { Brain, TrendingUp, Calendar, AlertTriangle, PiggyBank, BarChart3, Zap } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, Area, AreaChart as ReAreaChart,
} from "recharts";

const iconMap: Record<string, React.ElementType> = { TrendingUp, Calendar, AlertTriangle, PiggyBank, BarChart3, Zap, Calculator: BarChart3 };

export default function Analytics() {
  const { transactions, currencySymbol } = useApp();
  const expenses = transactions.filter((t) => t.type === "expense");
  const insights = generateInsights(transactions);

  // Monthly overview (last 6 months)
  const monthlyData = useMemo(() => {
    const months: { name: string; income: number; expense: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString("en", { month: "short", year: "2-digit" });
      const income = transactions.filter((t) => t.date.startsWith(key) && t.type === "income").reduce((s, t) => s + t.amount, 0);
      const expense = transactions.filter((t) => t.date.startsWith(key) && t.type === "expense").reduce((s, t) => s + t.amount, 0);
      months.push({ name: label, income, expense });
    }
    return months;
  }, [transactions]);

  // Category breakdown horizontal
  const catData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((t) => { map[t.category] = (map[t.category] || 0) + t.amount; });
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(map)
      .map(([name, value]) => ({ name, value, pct: ((value / total) * 100).toFixed(1), color: getCategoryInfo(name).color }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  // Heatmap data (last 35 days)
  const heatmapData = useMemo(() => {
    const days: { date: string; amount: number; day: number; week: number }[] = [];
    const now = new Date();
    const maxSpend = Math.max(1, ...expenses.map((t) => t.amount));
    for (let i = 34; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const amount = expenses.filter((t) => t.date === dateStr).reduce((s, t) => s + t.amount, 0);
      days.push({ date: dateStr, amount, day: d.getDay(), week: Math.floor(i / 7) });
    }
    return { days, max: Math.max(1, ...days.map((d) => d.amount)) };
  }, [expenses]);

  // Income vs Expense trend
  const trendData = useMemo(() => {
    const weeks: { name: string; income: number; expense: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const weekEnd = new Date(now); weekEnd.setDate(now.getDate() - i * 7);
      const weekStart = new Date(weekEnd); weekStart.setDate(weekEnd.getDate() - 6);
      const label = weekStart.toLocaleDateString("en", { month: "short", day: "numeric" });
      const inc = transactions.filter((t) => { const d = new Date(t.date); return d >= weekStart && d <= weekEnd && t.type === "income"; }).reduce((s, t) => s + t.amount, 0);
      const exp = transactions.filter((t) => { const d = new Date(t.date); return d >= weekStart && d <= weekEnd && t.type === "expense"; }).reduce((s, t) => s + t.amount, 0);
      weeks.push({ name: label, income: inc, expense: exp });
    }
    return weeks;
  }, [transactions]);

  const ttStyle = { backgroundColor: "hsl(222 47% 13%)", border: "1px solid hsl(217 33% 20%)", borderRadius: "12px", fontSize: 12 };

  if (transactions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        <p>Add transactions to see analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Analytics & AI Insights</h1>

      {/* Monthly Overview */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-5">
        <h3 className="text-sm font-semibold mb-4">Monthly Overview</h3>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <XAxis dataKey="name" stroke="hsl(215 20% 45%)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(215 20% 45%)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${currencySymbol}${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={ttStyle} formatter={(v: number) => [`${currencySymbol}${v.toLocaleString()}`, ""]} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="income" fill="#22c55e" radius={[6, 6, 0, 0]} name="Income" />
              <Bar dataKey="expense" fill="#f43f5e" radius={[6, 6, 0, 0]} name="Expense" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4">Category Breakdown</h3>
          <div className="space-y-3">
            {catData.map((cat) => (
              <div key={cat.name} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{getCategoryInfo(cat.name).icon} {cat.name}</span>
                  <span className="tabular-nums text-muted-foreground">{currencySymbol}{cat.value.toLocaleString()} ({cat.pct}%)</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${cat.pct}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Heatmap */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4">Spending Heatmap (35 Days)</h3>
          <div className="grid grid-cols-7 gap-1.5">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <span key={d} className="text-[10px] text-muted-foreground text-center">{d}</span>
            ))}
            {heatmapData.days.map((d) => {
              const intensity = d.amount / heatmapData.max;
              return (
                <div
                  key={d.date}
                  className="aspect-square rounded-sm relative group cursor-default"
                  style={{ backgroundColor: d.amount > 0 ? `rgba(139,92,246,${0.15 + intensity * 0.85})` : "hsl(217 33% 17%)" }}
                  title={`${d.date}: ${currencySymbol}${d.amount.toLocaleString()}`}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-card border border-border px-2 py-1 rounded text-[10px] whitespace-nowrap z-10">
                    {d.date}: {currencySymbol}{d.amount.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* AI Insights */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="glass-card p-5 border-primary/30">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Brain size={18} className="text-primary animate-pulse_glow" />
          AI Financial Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {insights.map((ins) => {
            const Icon = iconMap[ins.icon] || Brain;
            return (
              <motion.div
                key={ins.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl border ${
                  ins.type === "warning" ? "bg-warning/10 border-warning/20" :
                  ins.type === "danger" ? "bg-destructive/10 border-destructive/20" :
                  ins.type === "success" ? "bg-success/10 border-success/20" :
                  "bg-primary/10 border-primary/20"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={16} className={
                    ins.type === "warning" ? "text-warning" :
                    ins.type === "danger" ? "text-destructive" :
                    ins.type === "success" ? "text-success" : "text-primary"
                  } />
                  <h4 className="font-medium text-sm">{ins.title}</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{ins.description}</p>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Income vs Expense Trend */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="glass-card p-5">
        <h3 className="text-sm font-semibold mb-4">Income vs Expense Trend</h3>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ReAreaChart data={trendData}>
              <defs>
                <linearGradient id="gradInc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="hsl(215 20% 45%)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(215 20% 45%)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${currencySymbol}${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={ttStyle} formatter={(v: number) => [`${currencySymbol}${v.toLocaleString()}`, ""]} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#gradInc)" name="Income" />
              <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#gradExp)" name="Expense" />
            </ReAreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
