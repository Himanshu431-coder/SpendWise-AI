import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { CurrencyCode, CURRENCY_SYMBOLS } from "@/types";
import { exportToCSV, parseCSVImport } from "@/lib/export-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Download, Upload, Trash2, Moon, Sun, Github } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { settings, updateSettings, transactions, clearAllData, importTransactions, currency } = useApp();
  const [showClear, setShowClear] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleThemeToggle = () => {
    updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSVImport(text);
      const txns = parsed.map((p) => ({
        id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
        date: p.date || new Date().toISOString().split("T")[0],
        category: (p.category as any) || "Others",
        amount: p.amount || 0,
        description: p.description || "",
        type: (p.type as any) || "expense",
        createdAt: new Date().toISOString(),
      }));
      importTransactions(txns);
      toast.success(`Imported ${txns.length} transactions.`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleClear = () => {
    if (confirmText === "DELETE ALL") {
      clearAllData();
      setShowClear(false);
      setConfirmText("");
      toast.success("All data cleared.");
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>

      {/* Currency */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-semibold">Currency</h3>
        <Select value={settings.currency} onValueChange={(v) => updateSettings({ currency: v as CurrencyCode })}>
          <SelectTrigger className="bg-background w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.entries(CURRENCY_SYMBOLS) as [CurrencyCode, string][]).map(([code, sym]) => (
              <SelectItem key={code} value={code}>{sym} {code}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Theme */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
            <div>
              <h3 className="text-sm font-semibold">Dark Mode</h3>
              <p className="text-xs text-muted-foreground">Toggle between dark and light theme</p>
            </div>
          </div>
          <Switch checked={settings.theme === "dark"} onCheckedChange={handleThemeToggle} />
        </div>
      </div>

      {/* Data Management */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-semibold">Data Management</h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" onClick={() => exportToCSV(transactions, currency)} className="gap-2">
            <Download size={14} /> Export All Data
          </Button>
          <div>
            <input id="csv-import" type="file" accept=".csv" className="hidden" onChange={handleImport} />
            <Button variant="outline" size="sm" onClick={() => document.getElementById("csv-import")?.click()} className="gap-2">
              <Upload size={14} /> Import CSV
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowClear(true)} className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10">
            <Trash2 size={14} /> Clear All Data
          </Button>
        </div>
      </div>

      {/* About */}
      <div className="glass-card p-5 space-y-3">
        <h3 className="text-sm font-semibold">About SpendWise AI</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          An AI-powered personal expense tracker built with React, TypeScript, Tailwind CSS, and Recharts.
          Features intelligent NLP parsing, smart analytics, and beautiful data visualization.
        </p>
        <div className="flex flex-wrap gap-2">
          {["React", "TypeScript", "Tailwind CSS", "Recharts", "Framer Motion", "shadcn/ui"].map((t) => (
            <span key={t} className="px-2 py-1 text-[10px] font-medium rounded-md bg-primary/10 text-primary">{t}</span>
          ))}
        </div>
        <a href="https://github.com/Himanshu431-coder" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Github size={14} /> View on GitHub
        </a>
      </div>

      {/* Clear Dialog */}
      <Dialog open={showClear} onOpenChange={setShowClear}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Clear All Data</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently delete all transactions and budgets. Type <strong>DELETE ALL</strong> to confirm.</p>
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE ALL" />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowClear(false); setConfirmText(""); }}>Cancel</Button>
            <Button variant="destructive" disabled={confirmText !== "DELETE ALL"} onClick={handleClear}>Delete Everything</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
