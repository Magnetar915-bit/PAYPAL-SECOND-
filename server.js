import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import invoiceRoutes from "./routes/invoice.js";
import transactionRoutes from "./routes/transactions.js";
import insightsRoutes from "./routes/insights.js";
import webhookRoutes from "./routes/webhook.js";
import statementRoutes from "./routes/statement.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Standard middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static assets
app.use(express.static(path.join(__dirname, "public")));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "wheat-invoicing",
    timestamp: new Date().toISOString(),
  });
});

// Mount the core API routers as specified in architecture
app.use("/invoice", invoiceRoutes);
app.use("/transactions", transactionRoutes);
app.use("/insights", insightsRoutes);
app.use("/webhook", webhookRoutes);
app.use("/statement", statementRoutes);

// Root route: Serve frontend UI or greeting
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`🌾 Wheat Invoicing Server running at http://localhost:${PORT}`);
    console.log(`📊 Endpoints active: /invoice, /transactions, /insights, /webhook`);
  });
}

export default app;
