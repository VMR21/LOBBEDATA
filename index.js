import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// 🟢 Your Rainbet API Key
const API_KEY = "3duNGys32gmPaDvgBVDoyXFy0LMkhb8P";

// 🔁 For keeping Render alive (if deployed there)
const SELF_URL = "https://mojotxdata.onrender.com/leaderboard/top14";

let cachedData = [];

// ✅ Allow CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// ✅ Mask usernames like "mo****tx"
function maskUsername(username) {
  if (username.length <= 4) return username;
  return username.slice(0, 2) + "***" + username.slice(-2);
}

// 🗓 Get current month's date range in YYYY-MM-DD format
function getCurrentMonthRange() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));
  const start_at = start.toISOString().split("T")[0];
  const end_at = end.toISOString().split("T")[0];
  return { start_at, end_at };
}

// 🔁 Fetch and cache leaderboard
async function fetchAndCacheData() {
  try {
    const { start_at, end_at } = getCurrentMonthRange();
    const API_URL = `https://services.rainbet.com/v1/external/affiliates?start_at=${start_at}&end_at=${end_at}&key=${API_KEY}`;

    const response = await fetch(API_URL);
    const json = await response.json();
    if (!json.affiliates) throw new Error("No data");

    const sorted = json.affiliates.sort(
      (a, b) => parseFloat(b.wagered_amount) - parseFloat(a.wagered_amount)
    );

    const top10 = sorted.slice(0, 10);

    // Optional swap first two ranks
    if (top10.length >= 2) [top10[0], top10[1]] = [top10[1], top10[0]];

    cachedData = top10.map((entry) => ({
      username: maskUsername(entry.username),
      wagered: Math.round(parseFloat(entry.wagered_amount)),
      weightedWager: Math.round(parseFloat(entry.wagered_amount)),
    }));

    console.log(`[✅] Leaderboard updated for ${start_at} - ${end_at}`);
  } catch (err) {
    console.error("[❌] Failed to fetch Rainbet data:", err.message);
  }
}

// 🔁 Initial fetch and repeat every 5 minutes
fetchAndCacheData();
setInterval(fetchAndCacheData, 5 * 60 * 1000);

// 🔁 Self-ping every 4.5 minutes (for Render)
setInterval(() => {
  fetch(SELF_URL)
    .then(() => console.log(`[🔁] Self-pinged ${SELF_URL}`))
    .catch((err) => console.error("[⚠️] Self-ping failed:", err.message));
}, 270000);

// 📡 Endpoint to serve leaderboard data
app.get("/leaderboard/top14", (req, res) => {
  res.json(cachedData);
});

// 🚀 Start server
app.listen(PORT, () => console.log(`🚀 Running on port ${PORT}`));
