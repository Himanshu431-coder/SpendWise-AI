import { Transaction, CategoryType } from "@/types";

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function randomDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysAgo));
  return d.toISOString().split("T")[0];
}

const sampleExpenses: { desc: string; cat: CategoryType; minAmt: number; maxAmt: number }[] = [
  { desc: "Lunch at office cafeteria", cat: "Food & Dining", minAmt: 150, maxAmt: 400 },
  { desc: "Starbucks coffee", cat: "Food & Dining", minAmt: 200, maxAmt: 500 },
  { desc: "Groceries from BigBasket", cat: "Food & Dining", minAmt: 800, maxAmt: 3000 },
  { desc: "Dinner at Italian restaurant", cat: "Food & Dining", minAmt: 1200, maxAmt: 3500 },
  { desc: "Uber ride to office", cat: "Transport", minAmt: 150, maxAmt: 500 },
  { desc: "Metro monthly pass", cat: "Transport", minAmt: 800, maxAmt: 1500 },
  { desc: "Petrol refill", cat: "Transport", minAmt: 1500, maxAmt: 4000 },
  { desc: "Flight tickets to Goa", cat: "Transport", minAmt: 4000, maxAmt: 8000 },
  { desc: "Netflix subscription", cat: "Entertainment", minAmt: 199, maxAmt: 649 },
  { desc: "Spotify Premium", cat: "Entertainment", minAmt: 119, maxAmt: 179 },
  { desc: "Movie tickets – Cinepolis", cat: "Entertainment", minAmt: 500, maxAmt: 1200 },
  { desc: "Amazon shopping", cat: "Shopping", minAmt: 800, maxAmt: 5000 },
  { desc: "New shoes from Myntra", cat: "Shopping", minAmt: 1500, maxAmt: 4000 },
  { desc: "Electricity bill", cat: "Bills & Utilities", minAmt: 1200, maxAmt: 3500 },
  { desc: "WiFi recharge", cat: "Bills & Utilities", minAmt: 700, maxAmt: 1500 },
  { desc: "Mobile recharge", cat: "Bills & Utilities", minAmt: 299, maxAmt: 799 },
  { desc: "Rent payment", cat: "Bills & Utilities", minAmt: 12000, maxAmt: 25000 },
  { desc: "Gym membership", cat: "Health", minAmt: 1500, maxAmt: 3500 },
  { desc: "Doctor consultation", cat: "Health", minAmt: 500, maxAmt: 2000 },
  { desc: "Pharmacy – medicines", cat: "Health", minAmt: 200, maxAmt: 1000 },
  { desc: "Udemy course purchase", cat: "Education", minAmt: 400, maxAmt: 1200 },
  { desc: "Books from Amazon", cat: "Education", minAmt: 300, maxAmt: 1500 },
  { desc: "Miscellaneous expense", cat: "Others", minAmt: 100, maxAmt: 2000 },
];

export function generateDemoData(): Transaction[] {
  const transactions: Transaction[] = [];

  // Add 3 months of salary income
  for (let i = 0; i < 3; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    d.setDate(1);
    transactions.push({
      id: uuid(),
      date: d.toISOString().split("T")[0],
      category: "Salary/Income",
      amount: 75000 + Math.floor(Math.random() * 10000),
      description: "Monthly salary",
      type: "income",
      createdAt: d.toISOString(),
    });
    // Freelance
    if (Math.random() > 0.4) {
      const fd = new Date(d); fd.setDate(15);
      transactions.push({
        id: uuid(),
        date: fd.toISOString().split("T")[0],
        category: "Salary/Income",
        amount: 5000 + Math.floor(Math.random() * 15000),
        description: "Freelance project payment",
        type: "income",
        createdAt: fd.toISOString(),
      });
    }
  }

  // Add ~45 expenses spread over 90 days
  for (let i = 0; i < 45; i++) {
    const sample = sampleExpenses[Math.floor(Math.random() * sampleExpenses.length)];
    const amount = Math.floor(sample.minAmt + Math.random() * (sample.maxAmt - sample.minAmt));
    const date = randomDate(90);
    transactions.push({
      id: uuid(),
      date,
      category: sample.cat,
      amount,
      description: sample.desc,
      type: "expense",
      createdAt: new Date(date).toISOString(),
    });
  }

  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
