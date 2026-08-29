import fs from 'fs';
import path from 'path';

const vaultSpecPath = 'D:\\Axiom_Vault\\01 Projects\\BudgetPH.md';

const specContent = `---
type: project-spec
status: in-progress
project_name: "BudgetPH v2"
target_path: "D:\\Projects\\web_projects\\Budget_PH"
tech_stack: [React 19, Vite, Express, MySQL, Zustand, Groq API, Tailwind CSS]
updated: 2026-08-29
tags:
  - project
  - coding
  - fintech
---

# 🇵🇭 BudgetPH v2.0 — Master Living Specification

> **Status:** 🚀 Phase 2 — Modernization, Scoped AI Channels & DB v2 Migration (In Progress)  
> **Created:** 2026-08-26 | **Updated:** 2026-08-29  
> **Author:** codebyaxiom  
> **Workspace:** \`D:\\Projects\\web_projects\\Budget_PH\`  
> **Repository:** \`https://github.com/codebyaxiom/BudgetPH\`  

---

## 🎯 1. Problem Statement & The "Time-to-Value" Philosophy

Filipino individuals and breadwinners frequently battle the **"sahod-to-petsa-de-peligro"** cycle. Traditional budget apps fail because:
1. **Form Fatigue:** They demand entering dozens of accounts, past transactions, and complex categories before showing any value.
2. **Post-Mortem Tracking:** They only show you where money *already went* instead of telling you what you can safely spend *today*.
3. **No Cultural Context:** They don't account for 15th/30th cutoff splits, family allowances (baon/padala), wants vs needs discipline, and informal utang.

**BudgetPH v2.0 Core Principle:** **Time-to-Value in under 60 seconds.**  
New users answer only 3 core questions on day one, immediately unlocking their live **Pang-Araw-Araw (Daily Spendable)** limit. Everything else (family allowances, wishlist delay buffer, utang ledger) is enriched progressively.

---

## ⚡ 2. Fast-Track Onboarding & Core User Journeys

\`\`\`mermaid
flowchart TD
    subgraph Fast_Track [⚡ 60-Second Onboarding]
        S1[1. Sahod & Cut-off Rhythm] --> S2[2. Quick Bills Estimate / PH Presets]
        S2 --> S3[🎉 Live Daily Spendable Limit Unlocked]
    end
    
    subgraph In_App_Enrichment [🧩 Progressive In-App Expansion]
        S3 --> P1[🛍️ Wants & Wishlist Delay Buffer]
        S3 --> P2[🤖 Scoped AI Topic Channels]
        S3 --> P3[👨‍👩‍👧 Family Allowances & Baon]
        S3 --> P4[🏦 3-Month Emergency Fund]
        S3 --> P5[📅 Interactive Calendar - In Queue]
        S3 --> P6[💳 Utang & Debt Ledger - In Queue]
    end
\`\`\`

### ⏱️ The 2-Screen Fast-Track Flow:
1. **Screen 1: Sahod & Payday Rhythm (20s)**
   * Name / Alias (e.g., *Jerald*)
   * Net Take-Home Pay per cut-off (e.g., *₱20,000*)
   * Payday Frequency (*15th & 30th* [Default], *Monthly*, *Weekly*)
   * Next Payday Date (*e.g., Aug 30*)
2. **Screen 2: Quick Bills & Commitments (20s)**
   * 1-Click Quick Chips (*⚡ Meralco ~₱2,500*, *🏠 Rent ~₱5,000*, *🌐 Wifi ~₱1,500*, *💧 Tubig ~₱500*)
   * Or lump-sum commitment input (*e.g., ₱9,500*)
3. **Aha! Moment:**
   * Auto-activates Payday Cycle ➔ Unlocks Dashboard with live **Spendable Today** gauge:
     $$\\text{Daily Limit} = \\frac{\\text{Income} - \\text{Bills}}{\\text{Days to Next Payday}} = \\frac{₱20,000 - ₱9,500}{15\\text{ days}} = ₱700.00/\\text{day}$$

---

## 🤖 3. AI Co-Pilot Architecture & Scoped Topic Channels

BudgetPH features an autonomous, multi-modal financial assistant tailored for Filipino financial realities:

### 3.1 Scoped AI Topic Channels (\`ai_conversations.channel\`)
Instead of endless unstructured chat threads, users navigate 6 dedicated topic channels:
* **\`🌟 All-in-One\`**: General financial advisor with full multi-tool execution access.
* **\`🛍️ Wants & Wishlist\`**: Impulse Delay Buffer copilot (strictly prevents accidental expense logging; evaluates payday surplus affordability).
* **\`⚡ Bills & Debts\`**: Obligations & debt payoff advisor (tracks paid vs unpaid monthly bills).
* **\`💰 Sahod & Payday\`**: Salary cycle simulator & safe daily limit recalculator.
* **\`👨‍👩‍👧 Family Allowances\`**: Dependent allowance & school baon allocation copilot.
* **\`🏦 Savings & Goals\`**: Emergency fund & sinking fund copilot.

### 3.2 Live Database Autonomous Tools (\`server/src/utils/aiTools.js\`)
1. \`record_payday\` — Activates new cycle and allocates spendable buffer.
2. \`update_income_schedule\` — Updates pay frequency and expected salary.
3. \`log_expense\` — Logs spent daily expenses with category and mood (\`need\` / \`want\` / \`regret\`).
4. \`add_obligation_or_debt\` — Registers recurring bills or debts.
5. \`mark_bill_paid\` — Records monthly payment into \`obligation_payments\`.
6. \`deposit_to_savings\` — Allocates savings contributions.
7. \`add_family_allowance\` — Adds dependent allowance/baon.
8. \`add_to_wishlist\` — Saves non-essential desires into the delay buffer.
9. \`evaluate_wants_affordability\` — Computes which wishlist items are safe to buy this cycle.
10. \`buy_wishlist_item\` — Marks item as purchased and auto-logs expense.

### 3.3 Model Training & Feedback Pipeline (\`ai_feedback\`)
* **👍 / 👎 Message Feedback**: Users rate AI responses to build a curated local dataset.
* **ChatML / SFT Dataset Export**: 1-Click download of fine-tuning datasets from Settings for open-source LLMs (Llama 3, Qwen, Gemma) specialized in Taglish financial slang.

---

## 🛠️ 4. Tech Stack & Architecture

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 + Vite | High-speed HMR, concurrent features, modern React hooks |
| **Styling** | Tailwind CSS v4 + Vanilla CSS Tokens | Sleek dark/light fintech theme, responsive micro-animations |
| **State Management** | Zustand (\`useBudgetStore\`, \`useLanguageStore\`) | Centralized state, proactive alert caching, multi-language (EN / TL) |
| **Backend API** | Express.js (Node.js) | High-throughput REST API with robust controllers |
| **Primary Database** | MySQL \`budgetph_v2\` | Normalized schema with foreign keys and cascade rules |
| **Fallback Database** | MySQL \`budgetph\` (v1) | Resilient fallback connection pool |
| **AI Engine (Cloud)** | Groq Cloud API (\`openai/gpt-oss-120b\`, \`qwen/qwen3.6-27b\`) | Sub-second Taglish function calling & conversational co-pilot |
| **AI Engine (Offline)** | BudgetPH Local Math Engine | 100% offline regex & financial arithmetic fallback |
| **Icons & Charts** | Lucide React + Recharts | Consistent fintech iconography and visual charts |

---

## 🗄️ 5. Normalized Data Schema (\`budgetph_v2\`)

\`\`\`mermaid
erDiagram
    USERS ||--o{ INCOME_SOURCES : has
    USERS ||--o{ FAMILY_MEMBERS : has
    USERS ||--o{ OBLIGATIONS : has
    USERS ||--o{ SAVINGS_GOALS : has
    USERS ||--o{ PAYDAY_CYCLES : creates
    USERS ||--o{ EXPENSES : logs
    USERS ||--o{ WISHLIST_ITEMS : saves
    USERS ||--o{ AI_CONVERSATIONS : chats
    USERS ||--o{ AI_FEEDBACK : evaluates
    
    PAYDAY_CYCLES ||--o{ PAYDAY_ALLOCATIONS : divides
    FAMILY_MEMBERS ||--o{ ALLOWANCES : receives
    OBLIGATIONS ||--o{ OBLIGATION_PAYMENTS : records
    SAVINGS_GOALS ||--o{ SAVINGS_TRANSACTIONS : records
\`\`\`

### Active Tables:
1. \`users\` (id, name, email, civil_status, salary_amount, pay_schedule, theme, created_at)
2. \`income_sources\` (id, user_id, name, amount, frequency, payday_1, payday_2, is_active)
3. \`obligations\` (id, user_id, name, category, amount, due_day, cutoff_assignment, is_active, is_variable, notes)
4. \`obligation_payments\` (id, obligation_id, user_id, amount_paid, paid_date, payday_cycle_id, notes, created_at)
5. \`family_members\` (id, user_id, name, role, notes)
6. \`allowances\` (id, user_id, family_member_id, amount, period, notes)
7. \`payday_cycles\` (id, user_id, income_source_id, expected_amount, actual_amount, payday_date, next_payday_date, status, notes)
8. \`payday_allocations\` (id, payday_cycle_id, category, reference_id, label, amount)
9. \`expenses\` (id, user_id, payday_cycle_id, family_member_id, category, description, amount, expense_date, mood, receipt_url, notes)
10. \`wishlist_items\` (id, user_id, name, estimated_amount, priority, status, notes, created_at, purchased_at)
11. \`savings_goals\` (id, user_id, name, type, target_amount, current_amount, target_date, per_payday_contribution, is_active)
12. \`savings_transactions\` (id, goal_id, user_id, amount, type, transaction_date, notes)
13. \`ai_conversations\` (id, user_id, channel, role, message, created_at)
14. \`ai_feedback\` (id, user_id, channel, user_message, ai_response, rating, notes, created_at)
15. \`settings\` (id, user_id, setting_key, setting_value)

---

## 🗺️ 6. Implementation Roadmap & Session Checkpoint

### Status Checkpoint
| Field | Value |
| :--- | :--- |
| **Current Phase** | Phase 2 — Modernization & Feature Expansion |
| **Active Branch** | \`main\` |
| **Remote Repository** | \`https://github.com/codebyaxiom/BudgetPH.git\` |
| **Database** | Primary: \`budgetph_v2\` (Fallback: \`budgetph\`) |

### Action Checklist
- [x] Create project specification in Second Brain (\`01 Projects/BudgetPH.md\`)
- [x] Initialize Git repository with \`.gitignore\` and remote origin
- [x] Create \`init_v2_db.js\` initialization script for \`budgetph_v2\`
- [x] Update \`db.js\` with multi-db / v2 primary and v1 fallback connection logic
- [x] Create backend Onboarding API (\`POST /api/onboarding/fast-track\`, \`GET /api/onboarding/status\`)
- [x] Build interactive React Fast-Track Onboarding Modal (\`FastTrackOnboardingModal.jsx\`)
- [x] Implement Scoped Topic Channels (\`ai_conversations.channel\`) for specialized copilot workflows
- [x] Build Wants & Wishlist Delay Buffer (\`wishlist_items\` & \`WishlistPage.jsx\`)
- [x] Implement AI Feedback Pipeline (👍/👎) and SFT Training Dataset Export (\`ai_feedback\`)
- [x] Cross-Module Ground Truth & Monthly Obligation Status Synchronization
- [ ] Build Interactive Calendar View (\`CalendarPage.jsx\`)
- [ ] Build Utang & Debt Tracker (\`UtangPage.jsx\`)
- [x] Automated verification of all user journeys
`;

fs.writeFileSync(vaultSpecPath, specContent, 'utf8');
console.log('✅ Successfully written BudgetPH master living spec to Obsidian Vault.');

const logPath = 'D:\\Axiom_Vault\\Vault Changelog.md';
const entry = `
### Session: BudgetPH Master Living Spec Synchronization (2026-08-29)
- **Updated:** \`01 Projects/BudgetPH.md\`
- **Details:** Fully synchronized system architecture, 6 Scoped AI Topic Channels, Wants & Wishlist delay buffer, RLHF/SFT model training pipeline, and 15-table normalized schema in \`budgetph_v2\`.
- **Why:** Keep second brain living specification 100% aligned with active codebase and development momentum.
- **Rollback:** Revert git commit in Axiom_Vault repository.
`;

fs.appendFileSync(logPath, entry, 'utf8');
console.log('✅ Vault Changelog successfully updated.');

