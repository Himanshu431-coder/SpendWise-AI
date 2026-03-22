# main.py
# the actual server - runs the API and handles all requests

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from datetime import datetime, date, timedelta
from collections import defaultdict
import json
import os
import uuid
import csv
import io
import random

from models import (
    Transaction, TransactionInput, TransactionType,
    CategoryInfo
)
from ai_engine import SpendWiseAI


# set up the app
app = FastAPI(
    title="SpendWise AI",
    description="Backend API for the expense tracker",
    version="2.0.0"
)

# allow the frontend to talk to this server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# load up the AI engine
ai = SpendWiseAI()

# where we store the data
DATA_FILE = "spendwise_data.json"


# --- data loading and saving ---

def load_data():
    if not os.path.exists(DATA_FILE) or os.path.getsize(DATA_FILE) == 0:
        return {"transactions": []}
    try:
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {"transactions": []}


def save_data(data):
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)


def get_transactions():
    data = load_data()
    return [Transaction(**t) for t in data["transactions"]]


# --- basic routes ---

@app.get("/")
def root():
    return {
        "app": "SpendWise AI",
        "version": "2.0.0",
        "status": "running",
        "message": "Backend is live. Go to /docs for the API playground."
    }


@app.get("/api/transactions")
def list_transactions():
    data = load_data()
    return {"transactions": data["transactions"], "count": len(data["transactions"])}


@app.post("/api/transactions")
def add_transaction(expense: TransactionInput):
    data = load_data()

    sentiment = ai._analyze_spending_sentiment(
        expense.description.lower(), expense.category
    )

    new_txn = {
        "id": str(uuid.uuid4())[:8],
        "date": expense.date,
        "category": expense.category,
        "description": expense.description,
        "amount": expense.amount,
        "type": expense.type.value,
        "tags": expense.tags,
        "sentiment": sentiment,
        "created_at": datetime.now().isoformat(),
        "ai_category_confidence": 0.0
    }

    data["transactions"].append(new_txn)
    save_data(data)

    return {"message": "Transaction added!", "transaction": new_txn}


@app.put("/api/transactions/{txn_id}")
def update_transaction(txn_id: str, expense: TransactionInput):
    data = load_data()

    for i, t in enumerate(data["transactions"]):
        if t["id"] == txn_id:
            data["transactions"][i].update({
                "date": expense.date,
                "category": expense.category,
                "description": expense.description,
                "amount": expense.amount,
                "type": expense.type.value,
                "tags": expense.tags
            })
            save_data(data)
            return {"message": "Updated!", "transaction": data["transactions"][i]}

    raise HTTPException(status_code=404, detail="Transaction not found")


@app.delete("/api/transactions/{txn_id}")
def delete_transaction(txn_id: str):
    data = load_data()
    original_count = len(data["transactions"])

    data["transactions"] = [
        t for t in data["transactions"]
        if t["id"] != txn_id
    ]

    if len(data["transactions"]) == original_count:
        raise HTTPException(status_code=404, detail="Not found")

    save_data(data)
    return {"message": "Deleted!"}


# --- summary endpoint for the dashboard ---

@app.get("/api/summary")
def get_full_summary():
    transactions = get_transactions()

    total_income = sum(t.amount for t in transactions if t.type == TransactionType.INCOME)
    total_expense = sum(t.amount for t in transactions if t.type == TransactionType.EXPENSE)
    balance = total_income - total_expense

    # category breakdown
    cat_totals = defaultdict(float)
    cat_counts = defaultdict(int)
    for t in transactions:
        if t.type == TransactionType.EXPENSE:
            cat_totals[t.category] += t.amount
            cat_counts[t.category] += 1

    categories = [
        {
            "name": cat,
            "total": round(amount, 2),
            "count": cat_counts[cat],
            "percentage": round((amount / total_expense * 100) if total_expense > 0 else 0, 1),
            "icon": CategoryInfo.get_info(cat).get("icon", "O"),
            "color": CategoryInfo.get_info(cat).get("color", "#6b7280")
        }
        for cat, amount in sorted(cat_totals.items(), key=lambda x: x[1], reverse=True)
    ]

    # monthly trend
    monthly = defaultdict(lambda: {"income": 0, "expense": 0})
    for t in transactions:
        try:
            dt = datetime.strptime(t.date, '%Y-%m-%d')
            month_key = dt.strftime('%Y-%m')
        except ValueError:
            continue

        if t.type == TransactionType.INCOME:
            monthly[month_key]["income"] += t.amount
        else:
            monthly[month_key]["expense"] += t.amount

    monthly_trend = [
        {
            "month": month,
            "income": round(d["income"], 2),
            "expense": round(d["expense"], 2),
            "savings": round(d["income"] - d["expense"], 2)
        }
        for month, d in sorted(monthly.items())
    ]

    # daily trend (last 30 days)
    daily = defaultdict(float)
    for t in transactions:
        if t.type == TransactionType.EXPENSE:
            daily[t.date] += t.amount

    daily_trend = [
        {"date": d, "amount": round(amt, 2)}
        for d, amt in sorted(daily.items())
    ][-30:]

    # health score
    health = ai.calculate_financial_health(transactions)

    return {
        "total_income": round(total_income, 2),
        "total_expense": round(total_expense, 2),
        "balance": round(balance, 2),
        "transaction_count": len(transactions),
        "categories": categories,
        "monthly_trend": monthly_trend,
        "daily_trend": daily_trend,
        "health_score": health.dict(),
        "recent_transactions": [
            t.dict() for t in sorted(
                transactions, key=lambda x: x.created_at, reverse=True
            )[:10]
        ]
    }


# --- AI endpoints ---

class TextInput(BaseModel):
    text: str


@app.post("/api/ai/parse")
def ai_parse_expense(input_data: TextInput):
    result = ai.parse_expense_text(input_data.text)
    return result.dict()


@app.get("/api/ai/insights")
def ai_get_insights():
    transactions = get_transactions()
    insights = ai.generate_insights(transactions)
    return {"insights": [i.dict() for i in insights]}


@app.get("/api/ai/health-score")
def ai_health_score():
    transactions = get_transactions()
    health = ai.calculate_financial_health(transactions)
    return health.dict()


@app.get("/api/ai/forecast")
def ai_forecast(days: int = 30):
    transactions = get_transactions()
    forecast = ai.forecast_spending(transactions, days_ahead=days)
    return forecast.dict()


@app.get("/api/ai/anomalies")
def ai_anomalies():
    transactions = get_transactions()
    anomalies = ai.detect_anomalies(transactions)
    return {
        "anomalies": [a.dict() for a in anomalies],
        "count": len(anomalies)
    }


@app.get("/api/ai/suggest-budgets")
def ai_suggest_budgets():
    transactions = get_transactions()
    suggestions = ai.suggest_budgets(transactions)
    return {
        "suggestions": [s.dict() for s in suggestions],
        "count": len(suggestions)
    }


@app.post("/api/ai/query")
def ai_query(input_data: TextInput):
    transactions = get_transactions()
    result = ai.answer_query(input_data.text, transactions)
    return result.dict()


# --- utility stuff ---

@app.get("/api/categories")
def get_categories():
    return {
        cat: {
            "icon": info["icon"],
            "color": info["color"],
            "benchmark": info["monthly_benchmark"]
        }
        for cat, info in CategoryInfo.CATEGORIES.items()
    }


@app.get("/api/export/csv")
def export_csv():
    data = load_data()
    txns = data["transactions"]

    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=["id", "date", "category", "description", "amount", "type", "sentiment"]
    )
    writer.writeheader()
    for t in txns:
        writer.writerow({
            "id": t.get("id", ""),
            "date": t.get("date", ""),
            "category": t.get("category", ""),
            "description": t.get("description", ""),
            "amount": t.get("amount", 0),
            "type": t.get("type", "expense"),
            "sentiment": t.get("sentiment", "")
        })

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=spendwise_export.csv"}
    )


@app.post("/api/demo/load")
def load_demo_data():
    # generates a bunch of fake transactions so the app has something to show
    sample_items = {
        "Food & Dining": [
            ("Lunch at canteen", 150, 300),
            ("Zomato order", 200, 600),
            ("Groceries", 500, 2000),
            ("Coffee", 100, 300),
        ],
        "Transportation": [
            ("Uber to office", 100, 400),
            ("Metro recharge", 500, 500),
            ("Petrol", 1000, 3000),
        ],
        "Entertainment": [
            ("Netflix subscription", 649, 649),
            ("Movie tickets", 200, 600),
        ],
        "Shopping": [
            ("Amazon purchase", 500, 5000),
            ("New shoes", 1500, 4000),
        ],
        "Housing": [
            ("Monthly rent", 12000, 12000),
            ("Electricity bill", 800, 2000),
        ],
        "Healthcare": [
            ("Gym membership", 1500, 1500),
            ("Medicines", 200, 800),
        ],
        "Education": [
            ("Online course", 999, 3000),
            ("Books", 300, 1500),
        ],
    }

    transactions = []
    today = date.today()

    # create 60 days worth of transactions
    for days_ago in range(60):
        current_date = today - timedelta(days=days_ago)
        date_str = current_date.isoformat()

        # 2 to 5 expenses per day
        num_txns = random.randint(2, 5)
        for _ in range(num_txns):
            cat = random.choice(list(sample_items.keys()))
            item = random.choice(sample_items[cat])
            desc, min_amt, max_amt = item
            amount = random.randint(min_amt, max_amt)

            sentiment = ai._analyze_spending_sentiment(desc.lower(), cat)

            transactions.append({
                "id": str(uuid.uuid4())[:8],
                "date": date_str,
                "category": cat,
                "description": desc,
                "amount": amount,
                "type": "expense",
                "tags": [],
                "sentiment": sentiment,
                "created_at": datetime.now().isoformat(),
                "ai_category_confidence": 0.9
            })

    # add a couple salary entries too
    for month_offset in range(2):
        salary_date = today.replace(day=1) - timedelta(days=month_offset * 30)
        transactions.append({
            "id": str(uuid.uuid4())[:8],
            "date": salary_date.isoformat(),
            "category": "Salary",
            "description": "Monthly Salary",
            "amount": random.choice([40000, 50000, 60000]),
            "type": "income",
            "tags": ["salary"],
            "sentiment": "necessary",
            "created_at": datetime.now().isoformat(),
            "ai_category_confidence": 1.0
        })

    data = {"transactions": transactions}
    save_data(data)

    return {
        "message": "Loaded " + str(len(transactions)) + " demo transactions!",
        "count": len(transactions)
    }


# --- run the server ---

if __name__ == "__main__":
    import uvicorn
    print("=" * 55)
    print("  SpendWise AI - Backend Server")
    print("  Server: http://localhost:8000")
    print("  API Docs: http://localhost:8000/docs")
    print("  Demo data: POST /api/demo/load")
    print("=" * 55)
    uvicorn.run(app, host="0.0.0.0", port=8000)
