import { useApp } from "@/context/AppContext";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { motion } from "framer-motion";
import { Wallet, TrendingDown, TrendingUp, Brain } from "lucide-react";
import { generateInsights, calculateSavingsScore, getCategoryInfo } from "@/lib/ai-engine";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { useMemo } from "react";

export default function Dashboard() {
  const { transactions, budgets, currencySymbol, loading } = useApp();

  // ALL HOOKS MUST COME FIRST - before any conditional returns
  const totalIncome = useMemo(() => transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0), [transactions]);
  const totalExpense = useMemo(() => transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0), [transactions]);
  const balance = totalIncome - totalExpense;
  const savingsScore = useMemo(() => calculateSavingsScore(transactions, budgets), [transactions, budgets]);
  const insights = useMemo(() => generateInsights(transactions), [transactions]);

  const spendTrend = useMemo(() => {
    const now = new Date();
    const days: { name: string; spend: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const daySpend = transactions.filter((t) => t.date === dateStr && t.type === "expense").reduce((s, t) => s + t.amount, 0);
      days.push({ name: d.toLocaleDateString("en", { month: "short", day: "numeric" }), spend: daySpend });
    }
    return days;
  }, [transactions]);

  const catBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.filter((t) => t.type === "expense").forEach((t) => { map[t.category] = (map[t.category] || 0) + t.amount; });
    return Object.entries(map).map(([name, value]) => ({
      name, value, color: getCategoryInfo(name).color,
    })).sort((a, b) => b.value - a.value);
  }, [transactions]);

  const recentTxns = useMemo(() => transactions.slice(0, 10), [transactions]);

  // NOW conditional returns are safe (after all hooks)
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your financial data...</p>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) return <WelcomeScreen />;

  const summaryCards = [
    { label: "Total Balance", value: balance, icon: Wallet, gradient: balance >= 0 ? "gradient-emerald" : "gradient-rose", color: balance >= 0 ? "text-success" : "text-destructive" },
    { label: "Total Income", value: totalIncome, icon: TrendingUp, gradient: "gradient-emerald", color: "text-success" },
    { label: "Total Expenses", value: totalExpense, icon: TrendingDown, gradient: "gradient-rose", color: "text-destructive" },
    { label: "AI Savings Score", value: savingsScore.score, icon: Brain, gradient: "gradient-violet", color: "text-primary", isScore: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Financial Intelligence</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {savingsScore.grade === "A" || savingsScore.grade === "B" ? "Your finances are looking great." : "Let's improve your financial health."}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card p-5 hover-scale">
            <div className={`w-10 h-10 rounded-xl ${card.gradient} flex items-center justify-center mb-3`}>
              <card.icon className="text-primary-foreground" size={20} />
            </div>
            <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
            <h3 className={`text-2xl font-bold mt-1 ${card.color}`}>
              {(card as any).isScore ? (
                <><AnimatedNumber value={card.value} /><span className="text-sm font-normal text-muted-foreground">/100</span></>
              ) : (
                <AnimatedNumber value={card.value} prefix={currencySymbol} />
              )}
            </h3>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="lg:col-span-3 glass-card p-5">
          <h3 className="text-sm font-semibold mb-4">Spending Trend (30 Days)</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spendTrend}>
                <defs>
                  <linearGradient id="gradSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="hsl(215 20% 45%)" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis stroke="hsl(215 20% 45%)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${currencySymbol}${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(222 47% 13%)", border: "1px solid hsl(217 33% 20%)", borderRadius: "12px", fontSize: 12 }} formatter={(value: number) => [`${currencySymbol}${value.toLocaleString()}`, "Spend"]} />
                <Area type="monotone" dataKey="spend" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#gradSpend)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="lg:col-span-2 glass-card p-5">
          <h3 className="text-sm font-semibold mb-4">Category Distribution</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={catBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                  {catBreakdown.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(222 47% 13%)", border: "1px solid hsl(217 33% 20%)", borderRadius: "12px", fontSize: 12 }} formatter={(value: number) => [`${currencySymbol}${value.toLocaleString()}`, ""]} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Recent + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 glass-card p-5">
          <h3 className="text-sm font-semibold mb-4">Recent Transactions</h3>
          <div className="space-y-1 max-h-[360px] overflow-y-auto scrollbar-thin">
            {recentTxns.map((t) => {
              const cat = getCategoryInfo(t.category);
              return (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors">
                  <span className="text-lg">{cat.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.description}</p>
                    <p className="text-xs text-muted-foreground">{t.category} · {new Date(t.date).toLocaleDateString("en", { month: "short", day: "numeric" })}</p>
                  </div>
                  <span className={`text-sm font-semibold tabular-nums ${t.type === "income" ? "text-success" : "text-destructive"}`}>
                    {t.type === "income" ? "+" : "-"}{currencySymbol}{t.amount.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Brain size={16} className="text-primary animate-pulse_glow" />
            AI Insights
          </h3>
          {insights.map((ins) => (
            <motion.div key={ins.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className={`p-4 rounded-xl border ${
              ins.type === "warning" ? "bg-warning/10 border-warning/20" :
              ins.type === "danger" ? "bg-destructive/10 border-destructive/20" :
              ins.type === "success" ? "bg-success/10 border-success/20" :
              "bg-primary/10 border-primary/20"
            }`}>
              <h4 className="font-medium text-sm">{ins.title}</h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{ins.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}