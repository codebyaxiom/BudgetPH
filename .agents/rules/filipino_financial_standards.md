# Filipino Financial Domain & Budgeting Engine Standards

## 1. Utang vs. Pautang Disambiguation (CRITICAL)
- **Utang (Payable / Obligation):** Money the user borrowed and owes to others (e.g. *"May utang ako kay Maria"*, *"Loan"*).
  - Treated as an **outgoing obligation/expense** deducted from payday budget.
- **Pautang (Receivable / Collectible Asset):** Money the user lent to someone else (e.g. *"Pinautang ko si Joel"*, *"Pautang kay kumpare"*).
  - Treated as an **incoming cash receivable** to collect on payday, NOT an expense to deduct!
  - `debt_type = 'receivable'`.

## 2. One-Time Debt vs. Recurring Monthly Installments
- **One-Time Debt (`is_installment = false`):**
  - Lump-sum payment (e.g. *"utang ₱5,000 is one-time pay"*, *"due next month 30th"*).
  - Must NOT show `/month`, artificial December end dates, or progress bars.
  - Due date calculation must evaluate against target month and year (e.g. September 30), never comparing day numbers alone.
- **Installment Debt (`is_installment = true`):**
  - Applied ONLY when monthly terms or end dates are explicitly stated (e.g. *"₱2,000 monthly until Dec"*, *"hulugan 10 months"*).
  - Advance payments shift the target end month backwards.

## 3. Partial Payments vs. Full Settlement
- **Partial Bill Payments ("Kalahati muna"):**
  - When user pays less than the bill's total amount (e.g. paying ₱1,500 on a ₱3,000 bill):
  - Record the payment in `obligation_payments`.
  - Mark status as `partially_paid` with remaining balance active in unpaid bills list.
  - Do NOT mark the bill as 100% paid for the cycle.
- **Full Payoff Settlement:**
  - When user pays off remaining balance or reports full settlement, clear balance to ₱0 and mark completed.

## 4. Debt Forgiveness / Waivers
- When a creditor forgives or waives a debt (e.g. *"Pinatawad na ni Aunt Maria ang utang ko"*):
  - Mark `status = 'forgiven'`, `remaining_balance = 0`, `is_active = 0` without recording an expense deduction.

## 5. Cutoff Assignment & Split Deductions
- Support `cutoff_assignment: '1st_cutoff' | '2nd_cutoff' | 'split' | 'auto'`.
- When user specifies splitting (e.g. *"Hatiin sa dalawang sahod ang ₱10,000 rent"*), allocate 50% on 1st cutoff and 50% on 2nd cutoff.
