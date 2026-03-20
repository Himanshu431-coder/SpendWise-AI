import { Transaction, CURRENCY_SYMBOLS, CurrencyCode } from "@/types";

export function exportToCSV(transactions: Transaction[], currency: CurrencyCode) {
  const sym = CURRENCY_SYMBOLS[currency];
  const header = "Date,Category,Description,Type,Amount\n";
  const rows = transactions.map(
    (t) => `${t.date},"${t.category}","${t.description}",${t.type},${sym}${t.amount}`
  ).join("\n");

  const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `spendwise-transactions-${new Date().toISOString().slice(0, 10)}.csv`);
}

export function exportToPDF(transactions: Transaction[], currency: CurrencyCode) {
  const sym = CURRENCY_SYMBOLS[currency];
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const rows = transactions.map(t =>
    `<tr>
      <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0">${t.date}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0">${t.category}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0">${t.description}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;color:${t.type === 'income' ? '#22c55e' : '#ef4444'}">${t.type}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;text-align:right">${sym}${t.amount.toLocaleString()}</td>
    </tr>`
  ).join('');

  const html = `
    <html><head><title>SpendWise AI Report</title></head>
    <body style="font-family:system-ui;padding:40px;color:#1e293b">
      <h1 style="font-size:24px;margin-bottom:4px">SpendWise AI – Transaction Report</h1>
      <p style="color:#64748b;margin-bottom:24px">Generated on ${new Date().toLocaleDateString()}</p>
      <div style="display:flex;gap:24px;margin-bottom:24px">
        <div style="padding:12px 20px;background:#f0fdf4;border-radius:8px"><strong>Total Income:</strong> ${sym}${totalIncome.toLocaleString()}</div>
        <div style="padding:12px 20px;background:#fef2f2;border-radius:8px"><strong>Total Expenses:</strong> ${sym}${totalExpense.toLocaleString()}</div>
        <div style="padding:12px 20px;background:#f5f3ff;border-radius:8px"><strong>Net:</strong> ${sym}${(totalIncome - totalExpense).toLocaleString()}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:#f8fafc">
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e2e8f0">Date</th>
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e2e8f0">Category</th>
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e2e8f0">Description</th>
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e2e8f0">Type</th>
          <th style="padding:8px 12px;text-align:right;border-bottom:2px solid #e2e8f0">Amount</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.print();
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseCSVImport(text: string): Partial<Transaction>[] {
  const lines = text.trim().split("\n").slice(1);
  return lines.map((line) => {
    const parts = line.split(",");
    if (parts.length < 5) return null;
    return {
      date: parts[0].trim(),
      category: parts[1].replace(/"/g, "").trim(),
      description: parts[2].replace(/"/g, "").trim(),
      type: parts[3].trim().toLowerCase() as "income" | "expense",
      amount: parseFloat(parts[4].replace(/[^0-9.]/g, "")),
    };
  }).filter(Boolean) as Partial<Transaction>[];
}
