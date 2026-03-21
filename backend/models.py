"""SpendWise AI — Data Models"""

from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
from enum import Enum
import uuid


class CategoryInfo:
    CATEGORIES = {
        "Food & Dining": {
            "icon": "🍔", "color": "#f97316",
            "keywords": [
                "food", "lunch", "dinner", "breakfast", "snack",
                "restaurant", "cafe", "coffee", "tea", "pizza",
                "burger", "zomato", "swiggy", "groceries", "meal",
                "biryani", "canteen", "mess", "dominos", "mcdonalds",
                "kfc", "starbucks", "chai", "milk", "bread"
            ],
            "monthly_benchmark": 8000
        },
        "Transportation": {
            "icon": "🚗", "color": "#3b82f6",
            "keywords": [
                "uber", "ola", "cab", "taxi", "bus", "metro",
                "fuel", "petrol", "diesel", "parking", "train",
                "flight", "auto", "rickshaw", "transport", "toll"
            ],
            "monthly_benchmark": 3000
        },
        "Entertainment": {
            "icon": "🎬", "color": "#ec4899",
            "keywords": [
                "movie", "netflix", "spotify", "gaming", "concert",
                "party", "outing", "subscription", "hotstar", "prime",
                "youtube", "premium", "club", "pub", "bar"
            ],
            "monthly_benchmark": 2000
        },
        "Shopping": {
            "icon": "🛍️", "color": "#a855f7",
            "keywords": [
                "amazon", "flipkart", "clothes", "shoes", "electronics",
                "gadget", "mall", "shopping", "bought", "purchase",
                "myntra", "ajio", "meesho", "nykaa", "accessories"
            ],
            "monthly_benchmark": 5000
        },
        "Housing": {
            "icon": "🏠", "color": "#eab308",
            "keywords": [
                "rent", "maintenance", "electricity", "water", "gas",
                "internet", "wifi", "phone", "recharge", "bill",
                "broadband", "jio", "airtel", "society", "flat"
            ],
            "monthly_benchmark": 15000
        },
        "Healthcare": {
            "icon": "💊", "color": "#ef4444",
            "keywords": [
                "medicine", "doctor", "hospital", "gym", "pharmacy",
                "medical", "health", "clinic", "dentist", "checkup"
            ],
            "monthly_benchmark": 2000
        },
        "Education": {
            "icon": "📚", "color": "#06b6d4",
            "keywords": [
                "book", "course", "udemy", "tutorial", "stationery",
                "tuition", "fees", "college", "school", "exam",
                "coursera", "certification", "workshop", "notes"
            ],
            "monthly_benchmark": 3000
        },
        "Travel": {
            "icon": "✈️", "color": "#14b8a6",
            "keywords": [
                "trip", "hotel", "booking", "travel", "vacation",
                "holiday", "tour", "airbnb", "resort", "oyo"
            ],
            "monthly_benchmark": 5000
        },
        "Investments": {
            "icon": "📈", "color": "#22c55e",
            "keywords": [
                "sip", "mutual fund", "stocks", "invest", "fd",
                "rd", "ppf", "crypto", "trading", "gold"
            ],
            "monthly_benchmark": 10000
        },
        "Others": {
            "icon": "📦", "color": "#6b7280",
            "keywords": [],
            "monthly_benchmark": 2000
        }
    }

    @classmethod
    def get_all_names(cls):
        return list(cls.CATEGORIES.keys())

    @classmethod
    def get_info(cls, category):
        return cls.CATEGORIES.get(category, cls.CATEGORIES["Others"])

    @classmethod
    def get_keywords_map(cls):
        return {cat: info["keywords"] for cat, info in cls.CATEGORIES.items()}


class TransactionType(str, Enum):
    INCOME = "income"
    EXPENSE = "expense"


class TransactionInput(BaseModel):
    date: str
    category: str
    description: str
    amount: float = Field(gt=0)
    type: TransactionType = TransactionType.EXPENSE
    tags: list[str] = []


class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    date: str
    category: str
    description: str
    amount: float
    type: TransactionType
    tags: list[str] = []
    sentiment: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    ai_category_confidence: float = 0.0


class NLPParseResult(BaseModel):
    amount: Optional[float] = None
    category: str = "Others"
    description: str = ""
    date: str = ""
    type: TransactionType = TransactionType.EXPENSE
    confidence: float = 0.0
    detected_keywords: list[str] = []
    sentiment: str = "necessary"


class InsightItem(BaseModel):
    type: Literal["info", "warning", "success", "alert", "prediction"]
    title: str
    message: str
    severity: int = Field(ge=1, le=5, default=3)
    data: Optional[dict] = None


class FinancialHealthScore(BaseModel):
    score: int = Field(ge=0, le=100)
    grade: str
    savings_ratio: float
    expense_stability: float
    budget_adherence: float
    category_diversity: float
    verdict: str
    recommendations: list[str]


class SpendingForecast(BaseModel):
    period: str
    predicted_total: float
    predicted_by_category: dict[str, float]
    confidence_interval: dict[str, float]
    trend: str
    trend_percentage: float


class AnomalyItem(BaseModel):
    transaction_id: str
    date: str
    category: str
    amount: float
    description: str
    expected_amount: float
    deviation_factor: float
    severity: str


class BudgetSuggestion(BaseModel):
    category: str
    suggested_limit: float
    average_spending: float
    max_spending: float
    min_spending: float
    rationale: str


class NLQueryResult(BaseModel):
    query: str
    answer: str
    data: Optional[dict] = None
    visualization_type: Optional[str] = None
