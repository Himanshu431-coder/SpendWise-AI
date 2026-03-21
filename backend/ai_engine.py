"""
SpendWise AI — Artificial Intelligence Engine
10 AI/ML Features Built from Scratch
"""

import re
import numpy as np
from datetime import datetime, timedelta, date
from collections import defaultdict
from typing import Optional
from models import (
    Transaction, TransactionType, CategoryInfo,
    NLPParseResult, InsightItem, FinancialHealthScore,
    SpendingForecast, AnomalyItem, BudgetSuggestion,
    NLQueryResult
)


class SpendWiseAI:
    """The AI Engine — 10 ML Features"""

    def __init__(self):
        self.category_info = CategoryInfo()
        self.keywords_map = CategoryInfo.get_keywords_map()

    # ═══════════════════════════════════════════════════════
    # FEATURE 1: Natural Language Expense Parser
    # ═══════════════════════════════════════════════════════
    def parse_expense_text(self, text: str) -> NLPParseResult:
        """Parse natural language into structured expense data"""
        original_text = text
        text_lower = text.lower().strip()
        tokens = text_lower.split()
        confidence = 0.0
        detected_keywords = []

        # Determine transaction type
        income_keywords = [
            "earned", "received", "salary", "income", "freelance",
            "payment received", "got paid", "stipend", "bonus",
            "cashback", "refund", "credited"
        ]
        tx_type = TransactionType.EXPENSE
        for kw in income_keywords:
            if kw in text_lower:
                tx_type = TransactionType.INCOME
                detected_keywords.append(kw)
                confidence += 0.1
                break

        # Extract amount
        amount = None
        amount_patterns = [
            (r'[₹$€£]\s*(\d+[,.]?\d*)', 0.35),
            (r'(?:rs|rupees?|inr)\.?\s*(\d+[,.]?\d*)', 0.35),
            (r'(?:spent|paid|cost|received|earned)\s*(?:rs\.?\s*)?(\d+[,.]?\d*)', 0.30),
            (r'(\d+[,.]?\d*)\s*(?:rs|rupees?|₹)', 0.30),
            (r'(\d+\.?\d*)\s*k\b', 0.25),
            (r'\b(\d+\.?\d+)\b', 0.10),
            (r'\b(\d{2,})\b', 0.10),
        ]

        for pattern, conf_boost in amount_patterns:
            match = re.search(pattern, text_lower)
            if match:
                raw_amount = match.group(1).replace(',', '')
                amount = float(raw_amount)
                if 'k' in text_lower[max(0, match.end()-2):match.end()+1]:
                    amount *= 1000
                if 1 <= amount <= 1000000:
                    confidence += conf_boost
                    break
                else:
                    amount = None

        # Extract date
        today = date.today()
        extracted_date = today.isoformat()
        
        date_mappings = {
            "today": today,
            "yesterday": today - timedelta(days=1),
            "day before yesterday": today - timedelta(days=2),
        }

        for keyword, mapped_date in date_mappings.items():
            if keyword in text_lower:
                extracted_date = mapped_date.isoformat()
                detected_keywords.append(keyword)
                confidence += 0.15
                break

        # Classify category
        category, cat_confidence, cat_keywords = self._classify_category(text_lower)
        confidence += cat_confidence
        detected_keywords.extend(cat_keywords)

        # Sentiment analysis
        sentiment = self._analyze_spending_sentiment(text_lower, category)

        # Clean description
        description = self._extract_description(original_text, amount, detected_keywords)

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

    def _classify_category(self, text: str) -> tuple[str, float, list[str]]:
        """Classify category using keyword matching"""
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

        max_score = max(scores.values())
        best_category = max(scores, key=scores.get)
        confidence = min(0.35, max_score * 0.15)

        return best_category, confidence, matched[best_category]

    def _analyze_spending_sentiment(self, text: str, category: str) -> str:
        """Classify spending as necessary/luxury/investment"""
        necessity_keywords = [
            "rent", "electricity", "water", "medicine", "grocery",
            "bill", "fee", "insurance", "petrol", "bus", "metro"
        ]
        luxury_keywords = [
            "movie", "party", "shopping", "restaurant", "cafe",
            "bar", "pub", "gaming", "concert", "vacation"
        ]
        investment_keywords = [
            "course", "book", "training", "gym", "health",
            "invest", "sip", "mutual fund", "stocks"
        ]

        scores = {"necessary": 0, "luxury": 0, "investment": 0}

        for kw in necessity_keywords:
            if kw in text:
                scores["necessary"] += 1
        for kw in luxury_keywords:
            if kw in text:
                scores["luxury"] += 1
        for kw in investment_keywords:
            if kw in text:
                scores["investment"] += 1

        necessary_cats = ["Housing", "Healthcare", "Transportation"]
        luxury_cats = ["Entertainment", "Shopping"]
        investment_cats = ["Education", "Investments"]

        if category in necessary_cats:
            scores["necessary"] += 2
        elif category in luxury_cats:
            scores["luxury"] += 2
        elif category in investment_cats:
            scores["investment"] += 2

        return max(scores, key=scores.get)

    def _extract_description(self, original_text: str, amount: Optional[float], keywords: list[str]) -> str:
        """Clean up description text"""
        desc = original_text
        if amount:
            patterns_to_remove = [
                r'[₹$€£]\s*\d+[,.]?\d*',
                r'(?:rs|rupees?)\.?\s*\d+[,.]?\d*',
                r'\d+[,.]?\d*\s*(?:rs|rupees?|₹)',
            ]
            for p in patterns_to_remove:
                desc = re.sub(p, '', desc, flags=re.IGNORECASE)

        fillers = ["spent", "paid", "for", "on", "at", "the", "today", "yesterday", "i", "my", "a", "an"]
        words = desc.split()
        words = [w for w in words if w.lower().strip() not in fillers]
        desc = " ".join(words).strip()
        desc = re.sub(r'\s+', ' ', desc).strip()
        return desc.title() if desc else original_text.title()

    # ═══════════════════════════════════════════════════════
    # FEATURE 2: Anomaly Detection (Z-Score + IQR)
    # ═══════════════════════════════════════════════════════
    def detect_anomalies(self, transactions: list[Transaction]) -> list[AnomalyItem]:
        """Detect unusual spending using statistical methods"""
        expenses = [t for t in transactions if t.type == TransactionType.EXPENSE]
        if len(expenses) < 5:
            return []

        anomalies = []
        category_expenses = defaultdict(list)
        for t in expenses:
            category_expenses[t.category].append(t)

        for category, cat_transactions in category_expenses.items():
            if len(cat_transactions) < 3:
                continue

            amounts = np.array([t.amount for t in cat_transactions])
            mean = np.mean(amounts)
            std = np.std(amounts)
            q1 = np.percentile(amounts, 25)
            q3 = np.percentile(amounts, 75)
            iqr = q3 - q1
            upper_fence = q3 + 1.5 * iqr

            for t in cat_transactions:
                is_anomaly = False
                deviation_factor = 0.0
                severity = "mild"

                if std > 0:
                    z_score = abs((t.amount - mean) / std)
                    if z_score > 2:
                        is_anomaly = True
                        deviation_factor = z_score
                        if z_score > 3:
                            severity = "severe"
                        elif z_score > 2.5:
                            severity = "moderate"

                if t.amount > upper_fence and iqr > 0:
                    is_anomaly = True
                    deviation_factor = max(deviation_factor, (t.amount - mean) / max(std, 1))
                    if t.amount > q3 + 3 * iqr:
                        severity = "severe"

                if is_anomaly:
                    anomalies.append(AnomalyItem(
                        transaction_id=t.id,
                        date=t.date,
                        category=category,
                        amount=t.amount,
                        description=t.description,
                        expected_amount=round(mean, 2),
                        deviation_factor=round(deviation_factor, 2),
                        severity=severity
                    ))

        anomalies.sort(key=lambda x: x.deviation_factor, reverse=True)
        return anomalies[:10]

    # ═══════════════════════════════════════════════════════
    # FEATURE 3: Spending Forecaster (Linear Regression)
    # ═══════════════════════════════════════════════════════
    def forecast_spending(self, transactions: list[Transaction], days_ahead: int = 30) -> SpendingForecast:
        """Predict future spending using linear regression"""
        expenses = [t for t in transactions if t.type == TransactionType.EXPENSE]
        if len(expenses) < 7:
            return SpendingForecast(
                period=f"Next {days_ahead} days",
                predicted_total=0,
                predicted_by_category={},
                confidence_interval={"low": 0, "mid": 0, "high": 0},
                trend="insufficient_data",
                trend_percentage=0
            )

        daily_spending = defaultdict(float)
        for t in expenses:
            daily_spending[t.date] += t.amount

        if len(daily_spending) < 5:
            avg = sum(daily_spending.values()) / len(daily_spending)
            predicted = avg * days_ahead
            return SpendingForecast(
                period=f"Next {days_ahead} days",
                predicted_total=round(predicted, 2),
                predicted_by_category={},
                confidence_interval={
                    "low": round(predicted * 0.8, 2),
                    "mid": round(predicted, 2),
                    "high": round(predicted * 1.2, 2)
                },
                trend="stable",
                trend_percentage=0
            )

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

        if abs(slope) < 1:
            trend = "stable"
        elif slope > 0:
            trend = "increasing"
        else:
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
            period=f"Next {days_ahead} days",
            predicted_total=round(predicted_total, 2),
            predicted_by_category=predicted_by_category,
            confidence_interval=confidence_interval,
            trend=trend,
            trend_percentage=round(trend_pct, 1)
        )

    # ═══════════════════════════════════════════════════════
    # FEATURE 4: Financial Health Score (Multi-Factor)
    # ═══════════════════════════════════════════════════════
    def calculate_financial_health(self, transactions: list[Transaction]) -> FinancialHealthScore:
        """Calculate 0-100 financial health score"""
        if not transactions:
            return FinancialHealthScore(
                score=50, grade="N/A", savings_ratio=0,
                expense_stability=0, budget_adherence=0,
                category_diversity=0, verdict="No data available",
                recommendations=["Start tracking your expenses!"]
            )

        total_income = sum(t.amount for t in transactions if t.type == TransactionType.INCOME)
        total_expense = sum(t.amount for t in transactions if t.type == TransactionType.EXPENSE)
        expenses = [t for t in transactions if t.type == TransactionType.EXPENSE]

        # Factor 1: Savings ratio
        if total_income > 0:
            savings_ratio = (total_income - total_expense) / total_income
            savings_score = max(0, min(35, savings_ratio * 100 * 0.35))
        else:
            savings_ratio = 0
            savings_score = 10

        # Factor 2: Expense stability
        daily_totals = defaultdict(float)
        for t in expenses:
            daily_totals[t.date] += t.amount

        if len(daily_totals) >= 3:
            amounts = list(daily_totals.values())
            cv = float(np.std(amounts) / max(np.mean(amounts), 1))
            stability = max(0, 1 - cv / 2)
            stability_score = stability * 25
        else:
            stability = 0.5
            stability_score = 12.5

        # Factor 3: Budget adherence
        cat_totals = defaultdict(float)
        for t in expenses:
            cat_totals[t.category] += t.amount

        months = set()
        for t in expenses:
            try:
                dt = datetime.strptime(t.date, '%Y-%m-%d')
                months.add(dt.strftime('%Y-%m'))
            except ValueError:
                pass
        num_months = max(len(months), 1)

        adherence_scores = []
        for cat, total in cat_totals.items():
            monthly_avg = total / num_months
            benchmark = CategoryInfo.get_info(cat).get("monthly_benchmark", 5000)
            if monthly_avg <= benchmark:
                adherence_scores.append(1.0)
            elif monthly_avg <= benchmark * 1.5:
                adherence_scores.append(0.5)
            else:
                adherence_scores.append(0.2)

        budget_adherence = sum(adherence_scores) / len(adherence_scores) if adherence_scores else 0.5
        adherence_score = budget_adherence * 20

        # Factor 4: Category diversity (Shannon Entropy)
        if cat_totals:
            total = sum(cat_totals.values())
            proportions = [v / total for v in cat_totals.values()]
            entropy = -sum(p * np.log2(p) for p in proportions if p > 0)
            max_entropy = np.log2(len(CategoryInfo.get_all_names()))
            diversity = entropy / max_entropy if max_entropy > 0 else 0
            diversity_score = diversity * 10
        else:
            diversity = 0
            diversity_score = 0

        # Factor 5: Anomaly bonus
        anomalies = self.detect_anomalies(transactions)
        severe_count = sum(1 for a in anomalies if a.severity == "severe")
        if severe_count == 0:
            anomaly_bonus = 10
        elif severe_count <= 2:
            anomaly_bonus = 5
        else:
            anomaly_bonus = 0

        total_score = int(savings_score + stability_score + adherence_score + diversity_score + anomaly_bonus)
        total_score = max(0, min(100, total_score))

        grade_map = [(90, "A+"), (80, "A"), (70, "B+"), (60, "B"), (50, "C+"), (40, "C"), (30, "D"), (0, "F")]
        grade = "F"
        for threshold, g in grade_map:
            if total_score >= threshold:
                grade = g
                break

        verdicts = {
            "A+": "Exceptional! Outstanding financial discipline",
            "A": "Excellent! Managing money very well",
            "B+": "Great job! Minor improvements possible",
            "B": "Good financial health",
            "C+": "Fair. Several areas need attention",
            "C": "Below average. Review spending habits",
            "D": "Poor financial health. Changes needed",
            "F": "Critical. Spending far exceeds sustainable levels"
        }

        recommendations = []
        if savings_ratio < 0.2:
            recommendations.append(f"Aim to save at least 20% of income (currently {savings_ratio*100:.0f}%)")
        if stability < 0.5:
            recommendations.append("Your daily spending varies a lot. Try setting a daily limit.")
        if budget_adherence < 0.6:
            over_budget_cats = [cat for cat, total in cat_totals.items()
                               if (total/num_months) > CategoryInfo.get_info(cat).get("monthly_benchmark", 5000)*1.2]
            if over_budget_cats:
                recommendations.append(f"Reduce spending in: {', '.join(over_budget_cats[:3])}")
        if not recommendations:
            recommendations.append("Keep it up! Your financial habits are healthy.")

        return FinancialHealthScore(
            score=total_score,
            grade=grade,
            savings_ratio=round(savings_ratio, 3),
            expense_stability=round(float(stability), 3),
            budget_adherence=round(budget_adherence, 3),
            category_diversity=round(float(diversity), 3),
            verdict=verdicts.get(grade, "Review your spending"),
            recommendations=recommendations
        )

    # ═══════════════════════════════════════════════════════
    # FEATURE 5: Budget Suggester
    # ═══════════════════════════════════════════════════════
    def suggest_budgets(self, transactions: list[Transaction]) -> list[BudgetSuggestion]:
        """AI-powered budget suggestions"""
        expenses = [t for t in transactions if t.type == TransactionType.EXPENSE]
        if not expenses:
            return []

        monthly_cat = defaultdict(lambda: defaultdict(float))
        for t in expenses:
            try:
                dt = datetime.strptime(t.date, '%Y-%m-%d')
                month_key = dt.strftime('%Y-%m')
            except ValueError:
                continue
            monthly_cat[t.category][month_key] += t.amount

        suggestions = []
        for category in monthly_cat:
            monthly_amounts = list(monthly_cat[category].values())
            if not monthly_amounts:
                continue

            avg = np.mean(monthly_amounts)
            std = np.std(monthly_amounts)
            max_spent = max(monthly_amounts)
            min_spent = min(monthly_amounts)
            benchmark = CategoryInfo.get_info(category).get("monthly_benchmark", 5000)

            suggestion = max(avg + 0.5 * std, benchmark * 0.8)
            suggestion = round(suggestion / 100) * 100
            suggestion = min(suggestion, max_spent * 1.1)
            suggestion = max(suggestion, avg * 0.9)

            if avg > benchmark:
                rationale = f"You spend ₹{avg:,.0f}/month on {category}, above typical ₹{benchmark:,.0f}. Consider ₹{suggestion:,.0f}."
            elif avg < benchmark * 0.5:
                rationale = f"Great control on {category}! Budget of ₹{suggestion:,.0f} gives comfortable buffer."
            else:
                rationale = f"Healthy spending on {category}. ₹{suggestion:,.0f}/month keeps you on track."

            suggestions.append(BudgetSuggestion(
                category=category,
                suggested_limit=round(suggestion, 2),
                average_spending=round(float(avg), 2),
                max_spending=round(float(max_spent), 2),
                min_spending=round(float(min_spent), 2),
                rationale=rationale
            ))

        suggestions.sort(key=lambda x: x.average_spending, reverse=True)
        return suggestions

    # ═══════════════════════════════════════════════════════
    # FEATURE 6: Natural Language Query Engine
    # ═══════════════════════════════════════════════════════
    def answer_query(self, query: str, transactions: list[Transaction]) -> NLQueryResult:
        """Answer questions in natural language"""
        query_lower = query.lower().strip()
        expenses = [t for t in transactions if t.type == TransactionType.EXPENSE]

        # Category-specific query
        for cat_name, cat_info in CategoryInfo.CATEGORIES.items():
            if cat_name.lower() in query_lower or any(kw in query_lower for kw in cat_info["keywords"][:5]):
                cat_expenses = [t for t in expenses if t.category == cat_name]
                total = sum(t.amount for t in cat_expenses)
                count = len(cat_expenses)
                return NLQueryResult(
                    query=query,
                    answer=f"You spent ₹{total:,.0f} on {cat_name} across {count} transaction(s). Average: ₹{total/max(count,1):,.0f}",
                    data={"category": cat_name, "total": total, "count": count},
                    visualization_type="number"
                )

        # Biggest/largest
        if any(w in query_lower for w in ["biggest", "largest", "highest", "maximum"]):
            if expenses:
                biggest = max(expenses, key=lambda t: t.amount)
                return NLQueryResult(
                    query=query,
                    answer=f"Your biggest expense was ₹{biggest.amount:,.0f} on '{biggest.description}' ({biggest.category}) on {biggest.date}",
                    data={"amount": biggest.amount, "description": biggest.description},
                    visualization_type="number"
                )

        # Daily average
        if "daily" in query_lower and "average" in query_lower:
            daily = defaultdict(float)
            for t in expenses:
                daily[t.date] += t.amount
            if daily:
                avg = sum(daily.values()) / len(daily)
                return NLQueryResult(
                    query=query,
                    answer=f"Your average daily spending is ₹{avg:,.0f}",
                    data={"daily_average": round(avg, 2)},
                    visualization_type="number"
                )

        # Total
        if any(w in query_lower for w in ["total", "overall", "how much"]):
            total = sum(t.amount for t in expenses)
            return NLQueryResult(
                query=query,
                answer=f"Your total spending is ₹{total:,.0f} across {len(expenses)} transactions",
                data={"total": total, "count": len(expenses)},
                visualization_type="number"
            )

        # Fallback
        return NLQueryResult(
            query=query,
            answer="Try asking: 'How much did I spend on food?' or 'What's my biggest expense?'",
            data={},
            visualization_type="number"
        )

    # ═══════════════════════════════════════════════════════
    # FEATURE 7: Smart Insights Generator
    # ═══════════════════════════════════════════════════════
    def generate_insights(self, transactions: list[Transaction]) -> list[InsightItem]:
        """Generate comprehensive AI insights"""
        insights = []
        expenses = [t for t in transactions if t.type == TransactionType.EXPENSE]

        if len(expenses) < 3:
            insights.append(InsightItem(
                type="info",
                title="🚀 Getting Started",
                message=f"Add more expenses to unlock AI insights! Currently tracking {len(expenses)} transaction(s).",
                severity=1
            ))
            return insights

        total_expense = sum(t.amount for t in expenses)
        total_income = sum(t.amount for t in transactions if t.type == TransactionType.INCOME)

        # Top category insight
        cat_totals = defaultdict(float)
        for t in expenses:
            cat_totals[t.category] += t.amount

        top_cat = max(cat_totals, key=cat_totals.get)
        top_pct = (cat_totals[top_cat] / total_expense) * 100
        cat_icon = CategoryInfo.get_info(top_cat).get("icon", "📦")

        insights.append(InsightItem(
            type="warning" if top_pct > 40 else "info",
            title=f"{cat_icon} Top Spending: {top_cat}",
            message=f"{top_cat} accounts for {top_pct:.0f}% of your total spending (₹{cat_totals[top_cat]:,.0f} out of ₹{total_expense:,.0f})",
            severity=4 if top_pct > 50 else 3,
            data={"category": top_cat, "percentage": round(top_pct, 1)}
        ))

        # Savings rate
        if total_income > 0:
            savings_rate = ((total_income - total_expense) / total_income) * 100
            if savings_rate >= 30:
                insights.append(InsightItem(
                    type="success",
                    title="💪 Excellent Saver!",
                    message=f"You're saving {savings_rate:.0f}% of your income. That's ₹{total_income - total_expense:,.0f} saved!",
                    severity=1
                ))
            elif savings_rate >= 10:
                insights.append(InsightItem(
                    type="info",
                    title="📊 Savings Update",
                    message=f"You're saving {savings_rate:.0f}% of income. Try to reach 20% for better financial security.",
                    severity=2
                ))
            else:
                insights.append(InsightItem(
                    type="alert",
                    title="⚠️ Low Savings Alert",
                    message=f"You're only saving {savings_rate:.0f}% of income. Aim for at least 20%.",
                    severity=5
                ))

        # Anomalies
        anomalies = self.detect_anomalies(transactions)
        if anomalies:
            worst = anomalies[0]
            insights.append(InsightItem(
                type="alert",
                title="🔍 Unusual Expense Detected",
                message=f"₹{worst.amount:,.0f} on '{worst.description}' is {worst.deviation_factor:.1f}x the average. Expected: ~₹{worst.expected_amount:,.0f}",
                severity=4 if worst.severity == "severe" else 3,
                data={"amount": worst.amount, "expected": worst.expected_amount}
            ))

        insights.sort(key=lambda x: x.severity, reverse=True)
        return insights
