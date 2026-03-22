# ai_engine.py
# handles parsing, anomaly detection, forecasting and other smart features

import re
import numpy as np
from datetime import datetime, timedelta, date
from collections import defaultdict
from models import (
    Transaction,
    TransactionType,
    CategoryInfo,
    NLPParseResult,
    InsightItem,
    FinancialHealthScore,
    SpendingForecast,
    AnomalyItem,
    BudgetSuggestion,
    NLQueryResult
)


class SpendWiseAI:

    def __init__(self):
        self.category_info = CategoryInfo()
        self.keywords_map = CategoryInfo.get_keywords_map()

    def parse_expense_text(self, text):
        original_text = text
        text_lower = text.lower().strip()
        confidence = 0.0
        detected_keywords = []

        income_keywords = [
            "salary", "received", "earned", "income", "credited",
            "bonus", "refund", "cashback", "got paid"
        ]

        tx_type = TransactionType.EXPENSE
        for word in income_keywords:
            if word in text_lower:
                tx_type = TransactionType.INCOME
                detected_keywords.append(word)
                confidence += 0.15
                break

        amount = None
        amount_patterns = [
            r'₹\s*(\d+(?:\.\d+)?)',
            r'rs\.?\s*(\d+(?:\.\d+)?)',
            r'rupees?\s*(\d+(?:\.\d+)?)',
            r'(?:spent|paid|cost|received|earned)\s*(\d+(?:\.\d+)?)',
            r'(\d+(?:\.\d+)?)\s*(?:rs|rupees?)',
            r'(\d+(?:\.\d+)?)\s*k\b',
            r'\b(\d{2,6})\b'
        ]

        for pattern in amount_patterns:
            match = re.search(pattern, text_lower)
            if match:
                try:
                    amount = float(match.group(1))
                    if "k" in text_lower and amount < 1000:
                        amount = amount * 1000
                    confidence += 0.35
                    break
                except:
                    amount = None

        today = date.today()
        extracted_date = today.isoformat()

        if "yesterday" in text_lower:
            extracted_date = (today - timedelta(days=1)).isoformat()
            detected_keywords.append("yesterday")
            confidence += 0.10
        elif "today" in text_lower:
            extracted_date = today.isoformat()
            detected_keywords.append("today")
            confidence += 0.10
        elif "tomorrow" in text_lower:
            extracted_date = (today + timedelta(days=1)).isoformat()
            detected_keywords.append("tomorrow")
            confidence += 0.05

        category, cat_confidence, cat_keywords = self._classify_category(text_lower)
        confidence += cat_confidence
        detected_keywords.extend(cat_keywords)

        description = original_text
        description = re.sub(r'₹\s*\d+(?:\.\d+)?', '', description, flags=re.IGNORECASE)
        description = re.sub(r'rs\.?\s*\d+(?:\.\d+)?', '', description, flags=re.IGNORECASE)
        description = re.sub(r'rupees?\s*\d+(?:\.\d+)?', '', description, flags=re.IGNORECASE)
        description = re.sub(r'(spent|paid|cost|received|earned)', '', description, flags=re.IGNORECASE)
        description = re.sub(r'\b(today|yesterday|tomorrow)\b', '', description, flags=re.IGNORECASE)
        description = re.sub(r'\bon\b', '', description, flags=re.IGNORECASE)
        description = re.sub(r'\bfor\b', '', description, flags=re.IGNORECASE)
        description = re.sub(r'\bat\b', '', description, flags=re.IGNORECASE)
        description = re.sub(r'\b\d+(?:\.\d+)?\b', '', description, flags=re.IGNORECASE)
        description = re.sub(r'\s+', ' ', description).strip()

        if not description:
            description = original_text.strip()

        sentiment = self._analyze_spending_sentiment(text_lower, category)
        confidence = round(min(confidence, 1.0), 2)

        return NLPParseResult(
            amount=amount,
            category=category,
            description=description,
            date=extracted_date,
            type=tx_type,
            confidence=confidence,
            detected_keywords=detected_keywords,
            sentiment=sentiment
        )

    def _classify_category(self, text):
        scores = defaultdict(float)
        matched = defaultdict(list)
        tokens = set(text.split())

        for category, keywords in self.keywords_map.items():
            for keyword in keywords:
                if keyword in tokens:
                    scores[category] += 1.0
                    matched[category].append(keyword)
                elif keyword in text and len(keyword) > 3:
                    scores[category] += 0.6
                    matched[category].append(keyword)

        if not scores:
            return "Others", 0.05, []

        best_category = max(scores, key=scores.get)
        max_score = max(scores.values())
        confidence = min(0.35, max_score * 0.15)

        return best_category, confidence, matched[best_category]

    def _analyze_spending_sentiment(self, text, category):
        necessity_words = [
            "rent", "electricity", "water", "medicine", "grocery",
            "groceries", "bill", "fee", "insurance", "petrol", "bus",
            "metro", "food", "lunch", "dinner", "breakfast", "milk"
        ]
        luxury_words = [
            "party", "bar", "pub", "concert", "vacation",
            "shopping spree", "luxury", "premium"
        ]
        investment_words = [
            "course", "book", "training", "gym", "health",
            "invest", "sip", "mutual fund", "stocks"
        ]

        scores = {"necessary": 0, "luxury": 0, "investment": 0}

        for kw in necessity_words:
            if kw in text:
                scores["necessary"] += 1

        for kw in luxury_words:
            if kw in text:
                scores["luxury"] += 1

        for kw in investment_words:
            if kw in text:
                scores["investment"] += 1

        if category in ["Housing", "Healthcare", "Transportation"]:
            scores["necessary"] += 2
        elif category in ["Education", "Investments"]:
            scores["investment"] += 2
        elif category == "Entertainment":
            scores["luxury"] += 2

        return max(scores, key=scores.get)

    def detect_anomalies(self, transactions):
        expenses = [t for t in transactions if t.type == TransactionType.EXPENSE]
        if len(expenses) < 5:
            return []

        anomalies = []
        category_expenses = defaultdict(list)

        for t in expenses:
            category_expenses[t.category].append(t)

        for category, cat_txns in category_expenses.items():
            if len(cat_txns) < 3:
                continue

            amounts = np.array([t.amount for t in cat_txns])
            mean_val = np.mean(amounts)
            std_val = np.std(amounts)
            q1 = np.percentile(amounts, 25)
            q3 = np.percentile(amounts, 75)
            iqr = q3 - q1
            upper_fence = q3 + 1.5 * iqr

            for t in cat_txns:
                is_anomaly = False
                deviation_factor = 0.0
                severity = "mild"

                if std_val > 0:
                    z_score = abs((t.amount - mean_val) / std_val)
                    if z_score > 2:
                        is_anomaly = True
                        deviation_factor = z_score
                        if z_score > 3:
                            severity = "severe"
                        elif z_score > 2.5:
                            severity = "moderate"

                if t.amount > upper_fence and iqr > 0:
                    is_anomaly = True
                    deviation_factor = max(deviation_factor, (t.amount - mean_val) / max(std_val, 1))

                if is_anomaly:
                    anomalies.append(AnomalyItem(
                        transaction_id=t.id,
                        date=t.date,
                        category=category,
                        amount=t.amount,
                        description=t.description,
                        expected_amount=round(mean_val, 2),
                        deviation_factor=round(deviation_factor, 2),
                        severity=severity
                    ))

        anomalies.sort(key=lambda x: x.deviation_factor, reverse=True)
        return anomalies[:10]

    def forecast_spending(self, transactions, days_ahead=30):
        expenses = [t for t in transactions if t.type == TransactionType.EXPENSE]
        if len(expenses) < 7:
            return SpendingForecast(
                period="Next " + str(days_ahead) + " days",
                predicted_total=0,
                predicted_by_category={},
                confidence_interval={"low": 0, "mid": 0, "high": 0},
                trend="insufficient_data",
                trend_percentage=0
            )

        daily_spending = defaultdict(float)
        for t in expenses:
            daily_spending[t.date] += t.amount

        sorted_dates = sorted(daily_spending.keys())
        y_values = np.array([daily_spending[d] for d in sorted_dates])
        x_values = np.arange(1, len(y_values) + 1, dtype=float)

        n = len(x_values)
        sum_x = np.sum(x_values)
        sum_y = np.sum(y_values)
        sum_xy = np.sum(x_values * y_values)
        sum_x2 = np.sum(x_values ** 2)

        denominator = (n * sum_x2 - sum_x ** 2)
        if denominator == 0:
            slope = 0
            intercept = np.mean(y_values)
        else:
            slope = (n * sum_xy - sum_x * sum_y) / denominator
            intercept = (sum_y - slope * sum_x) / n

        future_days = np.arange(n + 1, n + days_ahead + 1, dtype=float)
        predictions = slope * future_days + intercept
        predictions = np.maximum(predictions, 0)
        predicted_total = float(np.sum(predictions))

        y_predicted_past = slope * x_values + intercept
        residuals = y_values - y_predicted_past
        std_error = float(np.std(residuals))

        confidence_interval = {
            "low": round(max(0, predicted_total - 1.96 * std_error * days_ahead), 2),
            "mid": round(predicted_total, 2),
            "high": round(predicted_total + 1.96 * std_error * days_ahead, 2)
        }

        trend = "stable"
        if slope > 1:
            trend = "increasing"
        elif slope < -1:
            trend = "decreasing"

        avg_daily = float(np.mean(y_values))
        trend_pct = (slope * 30 / max(avg_daily, 1)) * 100

        cat_totals = defaultdict(float)
        total_expense = sum(t.amount for t in expenses)
        for t in expenses:
            cat_totals[t.category] += t.amount

        predicted_by_category = {}
        for cat, total in cat_totals.items():
            proportion = total / max(total_expense, 1)
            predicted_by_category[cat] = round(predicted_total * proportion, 2)

        return SpendingForecast(
            period="Next " + str(days_ahead) + " days",
            predicted_total=round(predicted_total, 2),
            predicted_by_category=predicted_by_category,
            confidence_interval=confidence_interval,
            trend=trend,
            trend_percentage=round(trend_pct, 1)
        )

    def calculate_financial_health(self, transactions):
        total_income = sum(t.amount for t in transactions if t.type == TransactionType.INCOME)
        total_expense = sum(t.amount for t in transactions if t.type == TransactionType.EXPENSE)
        expenses = [t for t in transactions if t.type == TransactionType.EXPENSE]

        if total_income > 0:
            savings_ratio = (total_income - total_expense) / total_income
        else:
            savings_ratio = 0

        daily_totals = defaultdict(float)
        for t in expenses:
            daily_totals[t.date] += t.amount

        if len(daily_totals) >= 3:
            amounts = list(daily_totals.values())
            cv = float(np.std(amounts) / max(np.mean(amounts), 1))
            stability = max(0, 1 - cv / 2)
        else:
            stability = 0.5

        cat_totals = defaultdict(float)
        for t in expenses:
            cat_totals[t.category] += t.amount

        if cat_totals:
            total = sum(cat_totals.values())
            proportions = [v / total for v in cat_totals.values()]
            entropy = -sum(p * np.log2(p) for p in proportions if p > 0)
            max_entropy = np.log2(len(CategoryInfo.get_all_names()))
            diversity = entropy / max_entropy if max_entropy > 0 else 0
        else:
            diversity = 0

        budget_adherence = 0.5
        anomalies = self.detect_anomalies(transactions)
        anomaly_penalty = min(len(anomalies) * 3, 15)

        score = int(
            max(0, min(100,
                50 + (savings_ratio * 50) + (stability * 20) + (diversity * 15) + (budget_adherence * 15) - anomaly_penalty
            ))
        )

        if score >= 90:
            grade = "A+"
            verdict = "Excellent financial discipline!"
        elif score >= 80:
            grade = "A"
            verdict = "Very strong financial health"
        elif score >= 70:
            grade = "B+"
            verdict = "Good overall money management"
        elif score >= 60:
            grade = "B"
            verdict = "Decent, but there is room to improve"
        elif score >= 50:
            grade = "C"
            verdict = "Average financial habits"
        else:
            grade = "D"
            verdict = "Needs significant improvement"

        recommendations = []
        if savings_ratio < 0.2:
            recommendations.append("Try to save at least 20 percent of your income.")
        if len(anomalies) > 0:
            recommendations.append("Review unusually large expenses.")
        if not recommendations:
            recommendations.append("You are doing well. Keep it consistent.")

        return FinancialHealthScore(
            score=score,
            grade=grade,
            savings_ratio=round(savings_ratio, 3),
            expense_stability=round(float(stability), 3),
            budget_adherence=round(float(budget_adherence), 3),
            category_diversity=round(float(diversity), 3),
            verdict=verdict,
            recommendations=recommendations
        )

    def suggest_budgets(self, transactions):
        expenses = [t for t in transactions if t.type == TransactionType.EXPENSE]
        category_totals = defaultdict(list)

        for t in expenses:
            category_totals[t.category].append(t.amount)

        suggestions = []
        for category, amounts in category_totals.items():
            avg = float(np.mean(amounts))
            max_spent = float(np.max(amounts))
            min_spent = float(np.min(amounts))
            std = float(np.std(amounts))
            suggested = round((avg + std) / 100) * 100

            rationale = "Based on your past spending in " + category + ", a budget around Rs." + str(suggested) + " looks reasonable."

            suggestions.append(BudgetSuggestion(
                category=category,
                suggested_limit=suggested,
                average_spending=round(avg, 2),
                max_spending=round(max_spent, 2),
                min_spending=round(min_spent, 2),
                rationale=rationale
            ))

        return suggestions

    def answer_query(self, query, transactions):
        query_lower = query.lower().strip()
        expenses = [t for t in transactions if t.type == TransactionType.EXPENSE]

        for cat_name, cat_info in CategoryInfo.CATEGORIES.items():
            if cat_name.lower() in query_lower or any(kw in query_lower for kw in cat_info["keywords"][:5]):
                cat_expenses = [t for t in expenses if t.category == cat_name]
                total = sum(t.amount for t in cat_expenses)
                count = len(cat_expenses)
                return NLQueryResult(
                    query=query,
                    answer="You spent Rs." + str(round(total)) + " on " + cat_name + " across " + str(count) + " transactions.",
                    data={"category": cat_name, "total": total, "count": count},
                    visualization_type="number"
                )

        if "biggest" in query_lower or "largest" in query_lower:
            if expenses:
                biggest = max(expenses, key=lambda t: t.amount)
                return NLQueryResult(
                    query=query,
                    answer="Your biggest expense was Rs." + str(round(biggest.amount)) + " on " + biggest.description + ".",
                    data={"amount": biggest.amount, "description": biggest.description},
                    visualization_type="number"
                )

        total = sum(t.amount for t in expenses)
        return NLQueryResult(
            query=query,
            answer="Your total spending is Rs." + str(round(total)) + ". Try asking about food, shopping, or biggest expense.",
            data={"total": total},
            visualization_type="number"
        )

    def generate_insights(self, transactions):
        insights = []
        expenses = [t for t in transactions if t.type == TransactionType.EXPENSE]

        if len(expenses) < 3:
            insights.append(InsightItem(
                type="info",
                title="Not enough data yet",
                message="Add a few more transactions to get useful insights.",
                severity=1
            ))
            return insights

        total_expense = sum(t.amount for t in expenses)
        total_income = sum(t.amount for t in transactions if t.type == TransactionType.INCOME)

        cat_totals = defaultdict(float)
        for t in expenses:
            cat_totals[t.category] += t.amount

        top_cat = max(cat_totals, key=cat_totals.get)
        top_pct = (cat_totals[top_cat] / total_expense) * 100

        insights.append(InsightItem(
            type="warning" if top_pct > 40 else "info",
            title="Top spending category",
            message=top_cat + " makes up " + str(round(top_pct)) + " percent of your total spending.",
            severity=3,
            data={"category": top_cat, "percentage": round(top_pct, 1)}
        ))

        if total_income > 0:
            savings_rate = ((total_income - total_expense) / total_income) * 100
            if savings_rate >= 20:
                insights.append(InsightItem(
                    type="success",
                    title="Savings look decent",
                    message="You are saving around " + str(round(savings_rate)) + " percent of your income.",
                    severity=2
                ))
            else:
                insights.append(InsightItem(
                    type="alert",
                    title="Savings are low",
                    message="You are only saving about " + str(round(savings_rate)) + " percent of income.",
                    severity=4
                ))

        anomalies = self.detect_anomalies(transactions)
        if anomalies:
            worst = anomalies[0]
            insights.append(InsightItem(
                type="alert",
                title="Unusual expense detected",
                message="Rs." + str(round(worst.amount)) + " on " + worst.description + " looks much higher than usual for that category.",
                severity=4,
                data={"amount": worst.amount}
            ))

        return insights
