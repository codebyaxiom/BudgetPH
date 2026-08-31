async function testLiveRender() {
  const origin = 'https://budget-ph-eta.vercel.app';
  const endpoints = [
    { url: 'https://budgetph-bia1.onrender.com/api/onboarding/status', method: 'GET' },
    { url: 'https://budgetph-bia1.onrender.com/api/dashboard', method: 'GET' },
    { url: 'https://budgetph-bia1.onrender.com/api/ai/history?channel=general', method: 'GET' },
    { url: 'https://budgetph-bia1.onrender.com/api/ai/alerts?lang=en', method: 'GET' },
    { 
      url: 'https://budgetph-bia1.onrender.com/api/onboarding/fast-track', 
      method: 'POST', 
      body: JSON.stringify({ name: 'Jerald Live', income_amount: 30000, frequency: 'semi-monthly', next_payday_date: '2026-09-15', bills: [{ name: 'Kuryente', amount: 2000, due_day: 15 }] })
    }
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, {
        method: ep.method,
        headers: {
          'Origin': origin,
          'Content-Type': 'application/json'
        },
        body: ep.body
      });
      const corsHeader = res.headers.get('access-control-allow-origin');
      const text = await res.text();
      console.log(`[STATUS ${res.status}] ${ep.method} ${ep.url} (CORS: ${corsHeader})`);
      console.log('Response:', text.slice(0, 150));
    } catch (e) {
      console.error(`[ERROR] ${ep.url}:`, e.message);
    }
  }
}

testLiveRender().then(() => process.exit(0));
