import dotenv from 'dotenv';
import { aiToolDefinitions } from '../src/utils/aiTools.js';
dotenv.config();

async function testGroqChat() {
  const apiKey = process.env.GROQ_API_KEY;
  const models = ['qwen/qwen3.6-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'];

  for (const m of models) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: m,
          messages: [{ role: 'user', content: 'i want to add a new debt for my aunt maria 2000 per month until december' }],
          tools: aiToolDefinitions,
          tool_choice: 'auto'
        })
      });
      const data = await res.json();
      console.log(`[MODEL ${m}] STATUS:`, res.status, data.choices?.[0]?.message);
      if (data.error) {
        console.error(`[MODEL ${m}] ERROR:`, data.error);
      }
    } catch (e) {
      console.error(`[MODEL ${m}] FAIL:`, e.message);
    }
  }
}

testGroqChat().catch(console.error);
