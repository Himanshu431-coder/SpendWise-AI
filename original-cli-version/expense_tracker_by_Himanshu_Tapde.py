import sys
import json
import datetime
import os
import matplotlib.pyplot as plt

class Expense:

    def __init__(self, expenseList=None):
        if expenseList is None:
            self.expenseList = {}
        else:
            self.expenseList = expenseList

    # Load the data from the json file
    def load_expenses(self):
        def is_file_empty(file_path):
            try:
                return os.path.getsize(file_path) == 0
            except FileNotFoundError:
                return True  # If the file doesn't exist, it's considered empty

        if is_file_empty('expense.json'):
            print("No expense record found!!")
        else:
            try:
                with open('expense.json', 'r') as file:
                    print("Status: Data is Loaded successfully!!")
                    self.expenseList = json.load(file)
            except FileNotFoundError:
                print("File not found. Starting with an empty expense list.")


    # Add an expense with a date
    def addExpense(self):
        while True:
            try:
                date = input("Enter the date (dd-mm-yyyy): ")
                datetime.datetime.strptime(date, '%d-%m-%Y')  # Validate date format
                break
            except ValueError:
                print("Invalid Date Format!!")

        dic = {}

        while True:
            ch = input("Do you want to add items (Y/N): ").strip().upper()

            categories = [
                "Education", "Food & Dining", "Transportation", "Travel", "Healthcare",
                "Entertainment", "Housing", "Shopping", "Others"
            ]

            if ch == 'Y':
                print("\nThe Categories of Expenses:")
                for val in range(len(categories)):
                    print(f"{val + 1}. {categories[val]}")
                print()

                try:
                    expenseTypeName = int(input("Enter the Expense Category: "))
                    itemName = input("Enter the Description: ").strip()
                    itemPrice = float(input("Enter the Amount Spent: ").strip())
                except (ValueError, TypeError):
                    print("\nStatus: Invalid Choice Or Wrong Data Entered!!")
                    continue

                if categories[expenseTypeName - 1] not in dic:
                    dic[categories[expenseTypeName - 1]] = []

                dic[categories[expenseTypeName - 1]].append(itemName)
                dic[categories[expenseTypeName - 1]].append(itemPrice)

                print(f"Status: The Expense on {date} is added successfully!")

            elif ch == 'N':
                break
            else:
                print("\nInvalid input, please enter 'Y' or 'N'.")
                continue

        # If the date already exists in the dictionary
        if date in self.expenseList:
            for key, value in dic.items():
                if key in self.expenseList[date]:
                    self.expenseList[date][key].extend(value)
                else:
                    self.expenseList[date][key] = value
        else:
            self.expenseList.update({date: dic})

    # Calculate category-wise expenses for each day
    def calculateExpensesCategorywise(self):
        for dates, expenses in self.expenseList.items():
            print(f"------------------------------------------------------\nDate: {dates}\n------------------------------------------------------")
            for item, pricelist in expenses.items():
                total = sum(pricelist[i] for i in range(1, len(pricelist), 2))
                print(f"Total Amount Spent on {item}: Rs. {total}")

    # Calculate total expense cost of a day
    def calculateTotalExpensesADay(self):
        while True:
            try:
                inp_date = input("\nEnter the date that you want to view total amount spent: ")
                datetime.datetime.strptime(inp_date, '%d-%m-%Y')  # Validate date format
                break
            except ValueError:
                print("Invalid Date Format!!")

        total = 0
        for dates, expenses in self.expenseList.items():
            if dates == inp_date:
                for pricelist in expenses.values():
                    total += sum(pricelist[i] for i in range(1, len(pricelist), 2))
                print(f"\nTotal Amount Spent on {inp_date}: Rs. {total}")
                break
        else:
            print(f"No Expenses found for the date: {inp_date} !!")

    # Display all expenses till now
    def displayAllExpensesTillNow(self):
        if not self.expenseList:
            print("No expenses recorded yet.")
            return

        for dates, expenses in self.expenseList.items():
            print(f"------------------------------------------------------\nDate: {dates}\n------------------------------------------------------")
            for category, items in expenses.items():
                print(f"{category}:")
                for i in range(0, len(items), 2):
                    print(f"  - {items[i]}: Rs. {items[i + 1]}")
            print("------------------------------------------------------")

    # Save expenses to a JSON file
    def save_expenses(self):
        try:
            with open('expense.json', 'w') as file:
                json.dump(self.expenseList, file, indent=4)
                print("Expenses saved successfully!")
        except IOError:
            print("Error saving expenses to file.")

    # Plot a graph for expenses by category
    def plot_expenses_by_category(self):
        category_totals = {}
        for dates, expenses in self.expenseList.items():
            for category, items in expenses.items():
                total = sum(items[i] for i in range(1, len(items), 2))
                if category not in category_totals:
                    category_totals[category] = total
                else:
                    category_totals[category] += total

        categories = list(category_totals.keys())
        amounts = list(category_totals.values())

        plt.bar(categories, amounts)
        plt.xlabel('Categories')
        plt.ylabel('Total Expense (Rs.)')
        plt.title('Total Expenses by Category')
        plt.xticks(rotation=45, ha='right')
        plt.tight_layout()
        plt.show()

# Main code to interact with the Expense class
def main():
    expense_tracker = Expense()
    expense_tracker.load_expenses()

    while True:
        print("\nExpense Tracker Menu:")
        print("1. Add Expense")
        print("2. View Category-Wise Expenses")
        print("3. View Total Expense of a Day")
        print("4. Display All Expenses")
        print("5. Plot Expenses by Category")
        print("6. Save and Exit")
        
        choice = input("Enter your choice (1-6): ").strip()

        if choice == '1':
            expense_tracker.addExpense()
        elif choice == '2':
            expense_tracker.calculateExpensesCategorywise()
        elif choice == '3':
            expense_tracker.calculateTotalExpensesADay()
        elif choice == '4':
            expense_tracker.displayAllExpensesTillNow()
        elif choice == '5':
            expense_tracker.plot_expenses_by_category()
        elif choice == '6':
            expense_tracker.save_expenses()
            break
        else:
            print("Invalid choice, please try again.")

if __name__ == "__main__":
    main()
