const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors()); // ✅ Allow all origins

// 🔁 Auto UTC month range
function getCurrentMonthRangeUTC() {
  const now = new Date(); // UTC
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth(); // 0-indexed

  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59)); // last day of the month

  return [start, end];
}

const [START_TIME, END_TIME] = getCurrentMonthRangeUTC();
const START_DATE = START_TIME.toISOString().split('T')[0];
const END_DATE = END_TIME.toISOString().split('T')[0];

const API_URL = `https://services.rainbet.com/v1/external/affiliates?start_at=${START_DATE}&end_at=${END_DATE}&key=1wbuMhjjF2pmxt8xDNKTZJYW6B1FRbUD`;

// === /api/leaderboard/rainbet ===
app.get('/api/leaderboard/rainbet', async (req, res) => {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    let leaderboard = data.affiliates.map(entry => ({
      name: entry.username,
      wager: parseFloat(entry.wagered_amount)
    }));

    // 🔽 Sort by wager, descending
    leaderboard.sort((a, b) => b.wager - a.wager);

    // ✂️ Limit to top 10
    leaderboard = leaderboard.slice(0, 10);

    const prizes = [
      1000, 750, 500, 300, 250, 200, 150, 100, 75, 50
    ].map((reward, i) => ({ position: i + 1, reward }));

    res.json({
      leaderboard,
      prizes,
      startTime: START_TIME.toISOString(),
      endTime: END_TIME.toISOString()
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard data' });
  }
});

// === /api/countdown/rainbet ===
app.get('/api/countdown/rainbet', (req, res) => {
  const now = new Date();
  const total = END_TIME.getTime() - START_TIME.getTime();
  const remaining = END_TIME.getTime() - now.getTime();
  const percentageLeft = Math.max(0, Math.min(100, (remaining / total) * 100));

  res.json({ percentageLeft: parseFloat(percentageLeft.toFixed(2)) });
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🔥 Server running at http://localhost:${PORT}`);
});
