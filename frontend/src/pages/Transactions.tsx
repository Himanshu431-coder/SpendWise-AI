import { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { CATEGORIES, CategoryType, Transaction } from "@/types";
import { getCategoryInfo } from "@/lib/ai-engine";
import { exportToCSV, exportToPDF } from "@/lib/export-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, Download, FileText, Search, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";

type SortField = "date" | "amount" | "category";
type SortDir = "asc" | "desc";

export default function Transactions() {
  const { transactions, deleteTransaction, updateTransaction, currency } = useApp();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterRange, setFilterRange] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [editTxn, setEditTxn] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 15;

  const filtered = useMemo(() => {
    let list = [...transactions];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
    }
    if (filterCat !== "all") list = list.filter((t) => t.category === filterCat);
    if (filterType !== "all") list = list.filter((t) => t.type === filterType);

    if (filterRange !== "all") {
      const now = new Date();
      let start: Date;
      if (filterRange === "week") { start = new Date(now); start.setDate(now.getDate() - 7); }
      else if (filterRange === "month") { start = new Date(now); start.setMonth(now.getMonth() - 1); }
      else { start = new Date(now); start.setMonth(now.getMonth() - 3); }
      list = list.filter((t) => new Date(t.date) >= start);
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "date") cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      else if (sortField === "amount") cmp = a.amount - b.amount;
      else cmp = a.category.localeCompare(b.category);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [transactions, search, filterCat, filterType, filterRange, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalAmount = filtered.reduce((s, t) => s + (t.type === "expense" ? -t.amount : t.amount), 0);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  };

  const handleDelete = () => {
    if (deleteId) { deleteTransaction(deleteId); setDeleteId(null); toast.success("Deleted."); }
  };

  const handleEditSave = () => {
    if (editTxn) { updateTransaction(editTxn); setEditTxn(null); toast.success("Updated."); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground text-sm mt-1">{filtered.length} transactions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportToCSV(filtered, currency)} className="gap-2">
            <Download size={14} /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportToPDF(filtered, currency)} className="gap-2">
            <FileText size={14} /> PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9 bg-background" />
        </div>
        <Select value={filterCat} onValueChange={(v) => { setFilterCat(v); setPage(1); }}>
          <SelectTrigger className="w-[160px] bg-background"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c.name} value={c.name}>{c.icon} {c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(1); }}>
          <SelectTrigger className="w-[130px] bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterRange} onValueChange={(v) => { setFilterRange(v); setPage(1); }}>
          <SelectTrigger className="w-[150px] bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="3months">Last 3 Months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs">
                {([["date", "Date"], ["category", "Category"], ["description", "Description"], ["type", "Type"], ["amount", "Amount"]] as [SortField | string, string][]).map(([field, label]) => (
                  <th
                    key={field}
                    className="px-4 py-3 text-left font-medium cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => (field === "date" || field === "amount" || field === "category") && toggleSort(field as SortField)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {label}
                      {(field === "date" || field === "amount" || field === "category") && <ArrowUpDown size={12} />}
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((t) => {
                const cat = getCategoryInfo(t.category);
                return (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3 tabular-nums">{new Date(t.date).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium" style={{ backgroundColor: cat.color + "20", color: cat.color }}>
                        {cat.icon} {t.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{t.description}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${t.type === "income" ? "text-success" : "text-destructive"}`}>
                        {t.type}
                      </span>
                    </td>
                    <td className={`px-4 py-3 tabular-nums font-semibold ${t.type === "income" ? "text-success" : "text-destructive"}`}>
                      {t.type === "income" ? "+" : "-"}₹{t.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditTxn({ ...t })}>
                          <Pencil size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(t.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted-foreground">
          <span>Total: ₹{Math.abs(totalAmount).toLocaleString()} {totalAmount >= 0 ? "net positive" : "net negative"}</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <span className="flex items-center">{page}/{totalPages || 1}</span>
            <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editTxn} onOpenChange={() => setEditTxn(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Edit Transaction</DialogTitle></DialogHeader>
          {editTxn && (
            <div className="space-y-3">
              <div><Label className="text-xs">Amount</Label><Input type="number" value={editTxn.amount} onChange={(e) => setEditTxn({ ...editTxn, amount: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label className="text-xs">Description</Label><Input value={editTxn.description} onChange={(e) => setEditTxn({ ...editTxn, description: e.target.value })} /></div>
              <div><Label className="text-xs">Date</Label><Input type="date" value={editTxn.date} onChange={(e) => setEditTxn({ ...editTxn, date: e.target.value })} /></div>
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={editTxn.category} onValueChange={(v) => setEditTxn({ ...editTxn, category: v as CategoryType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.name} value={c.name}>{c.icon} {c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTxn(null)}>Cancel</Button>
            <Button onClick={handleEditSave} className="gradient-violet text-primary-foreground">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Confirm Delete</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
