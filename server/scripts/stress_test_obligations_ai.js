import dotenv from 'dotenv';
import { executeAiTool, aiToolDefinitions } from '../src/utils/aiTools.js';
import pool from '../src/config/db.js';

dotenv.config();

const TEST_SCENARIOS = [
  {
    id: 'TC-01',
    category: 'Pautang vs Utang (Lent vs Borrowed)',
    prompt: 'Pinautang ko si kumpareng Joel ng 3000 babayaran niya sa 15th',
    expectedIntent: 'Lent money / Pautang receivable (Asset/Receivable, not an expense to pay)',
  },
  {
    id: 'TC-02',
    category: 'Partial Bill Payment',
    prompt: 'Nagbayad ako ng 1500 sa Meralco bill ko na 3000 kalahati muna',
    expectedIntent: 'Partial payment: deduct 1500 from Meralco, keep 1500 remaining as unpaid/pending',
  },
  {
    id: 'TC-03',
    category: 'Clarification / Correction (Not a Payment)',
    prompt: 'Hindi pa bayad yung utang ko kay Aunt Maria, sinasabi ko lang na 2k yun',
    expectedIntent: 'No payment tool! Just informative response / do not mark as paid',
  },
  {
    id: 'TC-04',
    category: 'Cross-Year Multi-Month Installment',
    prompt: 'Bumili ako ng cellphone hulugan 1500 per month for 10 months',
    expectedIntent: 'is_installment = 1, total_amount = 15000, duration = 10 months, cross-year calculation (Aug 2026 -> June 2027)',
  },
  {
    id: 'TC-05',
    category: 'Debt Forgiveness / Waived Debt',
    prompt: 'Sabi ni Aunt Maria pinatawad na daw niya yung natitirang utang ko na 4000',
    expectedIntent: 'Mark debt as completed / settled with 0 remaining balance and note "forgiven/waived"',
  },
  {
    id: 'TC-06',
    category: 'Split Payday Deduction (15th and 30th)',
    prompt: 'Yung rent ko na 10000 hatiin natin sa dalawang sahod 5000 sa 15th at 5000 sa 30th',
    expectedIntent: 'Cutoff assignment = split / 5000 per cutoff',
  },
  {
    id: 'TC-07',
    category: 'Delete / Cancel Bill',
    prompt: 'Pakitanggal na sa listahan yung lumang internet bill lumipat na kasi kami ng bahay',
    expectedIntent: 'Delete or deactivate old internet bill (NOT mark as paid)',
  },
  {
    id: 'TC-08',
    category: 'Balance Inquiry without action',
    prompt: 'Magkano na lang natitirang utang ko kay Aunt Maria at kailan matatapos?',
    expectedIntent: 'Read-only inquiry: Return remaining balance and end date without modifying DB',
  },
  {
    id: 'TC-09',
    category: 'Variable Utility Actual Payment Update',
    prompt: 'Dumating na bill ng kuryente 1845.50 ang babayaran ko sa 20th',
    expectedIntent: 'Update variable bill amount to exact 1845.50 for current cycle',
  },
  {
    id: 'TC-10',
    category: 'Advance Overpayment',
    prompt: 'Nabayaran ko na lahat ng natitirang 8000 kay Aunt Maria tapos na ako sa utang!',
    expectedIntent: 'Fully clear remaining balance (is_completed = true, is_active = 0)',
  }
];

async function runStressTest() {
  console.log('🧪 STARTING COMPREHENSIVE AI STRESS TEST ON BILLS & OBLIGATIONS...\n');
  const apiKey = process.env.GROQ_API_KEY;
  const model = 'openai/gpt-oss-120b';

  const results = [];

  for (const tc of TEST_SCENARIOS) {
    console.log(`--------------------------------------------------`);
    console.log(`Testing [${tc.id}] ${tc.category}`);
    console.log(`Prompt: "${tc.prompt}"`);

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [
            { 
              role: 'system', 
              content: `You are BudgetPH AI Financial Assistant. Today is August 31, 2026 (Month 8, Year 2026).
User has registered bills: Electricity Bill (₱1,000, Due 18th), Internet / Wifi (₱800, Due 25th), Utang Aunt Maria (₱2,000/mo until Month 12/2026, ₱8,000 remaining), Utang (₱2,000, Due Sept 30).

TOOL EXECUTION RULES:
- If user mentions lending money to someone (e.g. "Pinautang ko si Joel ₱3,000"), call 'add_obligation_or_debt' with debt_type: 'receivable'.
- If user mentions a new installment or purchased item on terms (e.g. "Bumili cellphone 1500/mo for 10 months"), call 'add_obligation_or_debt' with is_installment: true, end_month: 6, end_year: 2027.
- If user wants to split a bill across two sahod cutoffs (e.g. "hatiin sa dalawang sahod ang rent"), call 'add_obligation_or_debt' or 'update_obligation' with cutoff_assignment: 'split'.
- If user reports paying a bill or paying part of a bill (e.g. "Nagbayad ako ng 1500 sa Meralco kalahati muna", "Nabayaran ko na lahat ng natitirang 8000 kay Aunt Maria"), call 'mark_bill_paid' with amount_paid.
- If user asks to remove/delete a bill (e.g. "Pakitanggal na sa listahan yung lumang internet bill"), call 'delete_obligation'.
- If user reports a debt was forgiven/pinatawad (e.g. "Sabi ni Aunt Maria pinatawad na daw yung utang ko na 4000"), call 'waive_or_forgive_debt'.
- If user reports new arrival bill amount (e.g. "Dumating na bill ng kuryente 1845.50"), call 'update_obligation' with amount: 1845.50.
- If user asks a read-only inquiry or balance question (e.g. "Magkano na lang natitirang utang ko?"), answer conversationally with exact balance and dates WITHOUT calling any modifying tool.`
            },
            { role: 'user', content: tc.prompt }
          ],
          tools: aiToolDefinitions,
          tool_choice: 'auto'
        })
      });

      const data = await res.json();
      const msg = data.choices?.[0]?.message;
      const toolCall = msg?.tool_calls?.[0];

      if (msg?.content) {
        console.log(`🤖 Response: ${msg.content}`);
      }
      if (toolCall) {
        console.log(`🔨 Tool Called: ${toolCall.function.name}`);
        console.log(`📦 Arguments: ${toolCall.function.arguments}`);
      } else {
        console.log(`💬 Replied Conversationally`);
      }

      results.push({
        id: tc.id,
        category: tc.category,
        prompt: tc.prompt,
        expected: tc.expectedIntent,
        toolCalled: toolCall ? toolCall.function.name : 'none',
        args: toolCall ? toolCall.function.arguments : null,
        text: msg?.content
      });
    } catch (e) {
      console.error(`Error on ${tc.id}:`, e.message);
    }
  }

  console.log('\n================ STRESS TEST SUMMARY ================');
  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}

runStressTest().catch(console.error);
