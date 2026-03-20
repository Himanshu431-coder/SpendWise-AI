import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { parseExpenseFromText, getCategoryInfo } from "@/lib/ai-engine";
import { CATEGORIES, CategoryType, ParsedTransaction } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Check, Brain } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function AddTransaction() {
  const { addTransaction } = useApp();

  // NLP state
  const [nlpText, setNlpText] = useState("");
  const [parsed, setParsed] = useState<ParsedTransaction | null>(null);

  // Manual state
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<CategoryType>("Food & Dining");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleParse = () => {
    if (!nlpText.trim()) return;
    const result = parseExpenseFromText(nlpText);
    setParsed(result);
  };

  const handleNlpSubmit = () => {
    if (!parsed || parsed.amount <= 0) {
      toast.error("Could not parse amount. Please check your input.");
      return;
    }
    addTransaction({
      amount: parsed.amount,
      category: parsed.category,
      description: parsed.description,
      date: parsed.date,
      type: "expense",
    });
    triggerSuccess();
    setNlpText("");
    setParsed(null);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount."); return; }
    if (!description.trim()) { toast.error("Enter a description."); return; }
    addTransaction({ amount: amt, category, description, date, type });
    triggerSuccess();
    setAmount("");
    setDescription("");
  };

  const triggerSuccess = () => {
    setShowSuccess(true);
    toast.success("Transaction added!");
    setTimeout(() => setShowSuccess(false), 1500);
  };

  const expenseCategories = CATEGORIES.filter((c) => c.name !== "Salary/Income");
  const incomeCategories = CATEGORIES.filter((c) => c.name === "Salary/Income" || c.name === "Others");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Add Transaction</h1>
        <p className="text-muted-foreground text-sm mt-1">Use AI parsing or add manually.</p>
      </div>

      {/* Success overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <div className="w-20 h-20 rounded-full bg-success flex items-center justify-center">
              <Check className="text-success-foreground" size={40} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Tabs defaultValue="smart">
        <TabsList className="w-full grid grid-cols-2 bg-muted">
          <TabsTrigger value="smart" className="gap-2"><Brain size={16} /> Smart Input</TabsTrigger>
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
        </TabsList>

        {/* Smart NLP Input */}
        <TabsContent value="smart" className="space-y-4 mt-4">
          <div className="glass-card p-6 space-y-4">
            <Label className="text-sm font-medium">Type naturally</Label>
            <div className="flex gap-2">
              <Input
                placeholder='e.g., "Spent 500 on lunch at cafe today"'
                value={nlpText}
                onChange={(e) => { setNlpText(e.target.value); setParsed(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleParse(); }}
                className="flex-1 bg-background border-border"
              />
              <Button onClick={handleParse} className="gradient-violet text-primary-foreground gap-2">
                <Sparkles size={16} />
                Parse
              </Button>
            </div>

            <AnimatePresence>
              {parsed && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-4 rounded-xl bg-primary/10 border border-primary/20 space-y-3"
                >
                  <div className="flex items-center gap-2 text-xs text-primary font-medium">
                    <Brain size={14} />
                    AI Parsed Result (Confidence: {(parsed.confidence * 100).toFixed(0)}%)
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Amount</Label>
                      <Input
                        type="number"
                        value={parsed.amount}
                        onChange={(e) => setParsed({ ...parsed, amount: parseFloat(e.target.value) || 0 })}
                        className="bg-background"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Category</Label>
                      <Select value={parsed.category} onValueChange={(v) => setParsed({ ...parsed, category: v as CategoryType })}>
                        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {expenseCategories.map((c) => (
                            <SelectItem key={c.name} value={c.name}>{c.icon} {c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Date</Label>
                      <Input
                        type="date"
                        value={parsed.date}
                        onChange={(e) => setParsed({ ...parsed, date: e.target.value })}
                        className="bg-background"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <Input
                        value={parsed.description}
                        onChange={(e) => setParsed({ ...parsed, description: e.target.value })}
                        className="bg-background"
                      />
                    </div>
                  </div>
                  <Button onClick={handleNlpSubmit} className="w-full gradient-violet text-primary-foreground">
                    Confirm & Add
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </TabsContent>

        {/* Manual */}
        <TabsContent value="manual" className="mt-4">
          <form onSubmit={handleManualSubmit} className="glass-card p-6 space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={type === "expense" ? "default" : "outline"}
                onClick={() => { setType("expense"); setCategory("Food & Dining"); }}
                className={type === "expense" ? "gradient-rose text-primary-foreground" : ""}
              >
                Expense
              </Button>
              <Button
                type="button"
                variant={type === "income" ? "default" : "outline"}
                onClick={() => { setType("income"); setCategory("Salary/Income"); }}
                className={type === "income" ? "gradient-emerald text-primary-foreground" : ""}
              >
                Income
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Amount</Label>
                <Input type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-background" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-background" />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as CategoryType)}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(type === "expense" ? expenseCategories : incomeCategories).map((c) => (
                    <SelectItem key={c.name} value={c.name}>{c.icon} {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Input placeholder="What was this for?" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-background" />
            </div>

            <Button type="submit" className="w-full gradient-violet text-primary-foreground h-11">
              Add Transaction
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
