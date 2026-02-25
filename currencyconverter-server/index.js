import express from "express";
import cors from "cors";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { nanoid } from "nanoid";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// ==============================
// Database Path - LOWDB SETUP (FIXED)
// ==============================
const dbFile = path.join(__dirname, "data", "currency_rates.json");
const adapter = new JSONFile(dbFile);
const defaultData = {
  dates: [],
};
const db = new Low(adapter, defaultData);

// Read Database
await db.read();

// =========================
// GET ALL RATES
// =========================
app.get("/api/rates", async (req, res) => {
  await db.read();
  res.json({
    id: nanoid(),
    success: true,
    data: db.data.dates,
  });
});

// =========================
// GET RATE BY DATE
// =========================
app.get("/api/rates/:date", async (req, res) => {
  await db.read();

  const result = db.data.dates.find((d) => d.date === req.params.date);

  // if (!result) {
  //   return res.status(404).json({
  //     success: false,
  //     message: "Date not found",
  //   });
  // }

  if (!result) {
    return res.status(404).json({
      success: false,
      message: `Failed to fetch the currency conversion rates on ${date}`,
    });
  }

  res.json({
    id: nanoid(),
    success: true,
    data: result,
  });
});

// ==============================
// 🟢 GET PARTICULAR CURRENCY ON PARTICULAR DATE
// Example:
// /api/rates/2026-02-24/INR
// ==============================
app.get("/api/rates/:date/:currency", async (req, res) => {
  const { date, currency } = req.params;

  await db.read();

  const dateData = db.data.dates.find((d) => d.date === date);

  if (!dateData) {
    return res.status(404).json({
      success: false,
      message: "Date not found",
    });
  }

  const rate = dateData.rates[currency.toUpperCase()];

  if (!rate) {
    return res.status(404).json({
      success: false,
      message: "Currency not found for this date",
    });
  }

  res.json({
    id: nanoid(),
    success: true,
    date,
    currency: currency.toUpperCase(),
    rate,
  });
});

// ==============================
// CONVERT USD TO SELECTED CURRENCY
// Example:
// /api/convert/2026-02-24/INR/100
// ==============================
app.get("/api/convert/:date/:currency/:amount", async (req, res) => {
  const { date, currency, amount } = req.params;

  await db.read();

  const dateData = db.data.dates.find((d) => d.date === date);

  if (!dateData) {
    return res.status(404).json({
      success: false,
      message: "Date not found",
    });
  }

  const rate = dateData.rates[currency.toUpperCase()];

  if (!rate) {
    return res.status(404).json({
      success: false,
      message: "Currency not found",
    });
  }

  const converted = Number(amount) * rate;

  res.json({
    success: true,
    date,
    from: "USD",
    to: currency.toUpperCase(),
    amount: Number(amount),
    rate,
    convertedAmount: converted.toFixed(2),
  });
});

// ==============================
// UNIVERSAL CONVERTER
// Example:
// /api/convert/2026-02-24/INR/EUR/1000
// ==============================
app.get("/api/convert/:date/:from/:to/:amount", async (req, res) => {
  const { date, from, to, amount } = req.params;

  await db.read();

  const dateData = db.data.dates.find((d) => d.date === date);

  if (!dateData) {
    return res.status(404).json({
      success: false,
      message: "Date not found",
    });
  }

  const rates = dateData.rates;

  const fromCurrency = from.toUpperCase();
  const toCurrency = to.toUpperCase();

  // If converting from USD
  const fromRate = fromCurrency === "USD" ? 1 : rates[fromCurrency];
  const toRate = toCurrency === "USD" ? 1 : rates[toCurrency];

  if (!fromRate || !toRate) {
    return res.status(404).json({
      success: false,
      message: "Invalid currency",
    });
  }

  const usdValue = Number(amount) / fromRate;
  const convertedAmount = usdValue * toRate;

  res.json({
    success: true,
    date,
    from: fromCurrency,
    to: toCurrency,
    amount: Number(amount),
    convertedAmount: convertedAmount.toFixed(2),
  });
});

// =========================
// ADD NEW DATE RATE
// =========================
app.post("/api/rates", async (req, res) => {
  const newRate = req.body;

  db.data.dates.push(newRate);
  await db.write();

  res.json({
    id: nanoid(),
    success: true,
    message: "Rate added successfully",
    data: newRate,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
