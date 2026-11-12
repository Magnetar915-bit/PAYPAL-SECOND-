import "dotenv/config";
import db, {
  insertInvoiceRecord,
  updateInvoiceStatus,
  getInvoiceByPaypalId,
  getInvoiceById,
  getAllInvoices,
  getInvoiceStats,
} from "./database/db.js";
import {
  extractInvoiceData,
  generateInvoiceNote,
  generateBusinessInsights,
} from "./services/ai.js";
import { verifyWebhookSignature } from "./services/paypal.js";
import fs from "node:fs";

console.log("=== COMPREHENSIVE ARCHITECTURE & TASK VERIFICATION ===");

async function runTests() {
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // --- Task 1: Persistent Database & Lifecycle (DRAFT -> SENT -> PAID) ---
  console.log("\n--- Testing Task 1: Persistent SQLite Database & Status Transitions ---");
  const testPaypalId = `INV2-TEST-${Date.now()}`;
  
  // 1. Insert DRAFT
  const draftRecord = insertInvoiceRecord({
    paypalInvoiceId: testPaypalId,
    buyerName: "Rahul Sharma",
    buyerEmail: "rahul@example.com",
    itemName: "Grade A Wheat",
    quantity: 50,
    unitPrice: 0.60,
    totalAmount: 30.00,
    currency: "USD",
    originalText: "राहुलला 50 किलो गव्हासाठी 30 डॉलरचे बिल पाठवा",
    note: "Agricultural wheat purchase invoice",
    status: "DRAFT",
  });

  assert(draftRecord.id > 0, `Invoice record created with SQLite ID #${draftRecord.id}`);
  assert(draftRecord.status === "DRAFT", `Initial invoice status is DRAFT`);
  assert(draftRecord.buyer_name === "Rahul Sharma", `Buyer name persisted correctly`);

  // 2. Transition DRAFT -> SENT
  const sentRecord = updateInvoiceStatus(testPaypalId, "SENT");
  assert(sentRecord.status === "SENT", `Invoice status successfully transitioned to SENT`);

  // 3. Transition SENT -> PAID
  const paidRecord = updateInvoiceStatus(testPaypalId, "PAID");
  assert(paidRecord.status === "PAID", `Invoice status successfully transitioned to PAID`);
  assert(paidRecord.paid_at !== null, `Paid timestamp (paid_at) recorded in SQLite database`);

  // 4. Query All Invoices
  const allInvoices = getAllInvoices();
  assert(allInvoices.length > 0, `Retrieved ${allInvoices.length} invoices from persistent SQLite table`);

  // --- Task 2: Live LLM Dynamic Insights ---
  console.log("\n--- Testing Task 2: Live LLM Service in services/ai.js ---");
  const insights = await generateBusinessInsights(
    { transaction_details: [] },
    allInvoices
  );

  assert(typeof insights.totalRevenue === "number", `Dynamic totalRevenue computed: $${insights.totalRevenue}`);
  assert(typeof insights.paidInvoices === "number", `Dynamic paidInvoices count computed: ${insights.paidInvoices}`);
  assert(typeof insights.topBuyer === "string" && insights.topBuyer.length > 0, `Identified top buyer: ${insights.topBuyer}`);
  assert(typeof insights.highestSellingProduct === "string", `Identified highest selling product: ${insights.highestSellingProduct}`);
  assert(typeof insights.summaryText === "string" && insights.summaryText.length > 10, `Generated business summary narrative: "${insights.summaryText.slice(0, 60)}..."`);
  assert(typeof insights.recommendation === "string" && insights.recommendation.length > 5, `Generated actionable recommendation: "${insights.recommendation.slice(0, 60)}..."`);

  // --- Multilingual AI Extraction Test ---
  console.log("\n--- Testing Multilingual AI Extraction (Marathi, Hindi, English) ---");
  const marathiResult = await extractInvoiceData("राहुलला 50 किलो गव्हासाठी 30 डॉलरचे बिल पाठवा");
  assert(marathiResult.quantity === 50, `Extracted quantity 50 from Marathi`);
  assert(marathiResult.amount === 30, `Extracted amount 30 from Marathi`);
  assert(marathiResult.currency === "USD", `Extracted currency USD`);

  const hindiResult = await extractInvoiceData("रोहन को 100 किलो गेहूं के लिए 50 डॉलर का बिल भेजो");
  assert(hindiResult.quantity === 100, `Extracted quantity 100 from Hindi`);
  assert(hindiResult.amount === 50, `Extracted amount 50 from Hindi`);

  const englishResult = await extractInvoiceData("Send an invoice to John for 80 kg of Sharbati Wheat at 45 USD");
  assert(englishResult.quantity === 80, `Extracted quantity 80 from English`);
  assert(englishResult.amount === 45, `Extracted amount 45 from English`);

  // --- Task 3: PayPal Webhook Signature Verification ---
  console.log("\n--- Testing Task 3: Webhook Signature Verification ---");
  // Verification with missing headers in dev mode
  const devCheck = await verifyWebhookSignature({}, { event_type: "INVOICING.INVOICE.PAID" });
  assert(devCheck.verified === true, `Development/Simulation mode handles unsigned payload appropriately: ${devCheck.status}`);

  // Verification with invalid signature headers
  const secureCheck = await verifyWebhookSignature({
    "paypal-auth-algo": "SHA256withRSA",
    "paypal-cert-url": "https://api.sandbox.paypal.com/cert",
    "paypal-transmission-id": "fake-trans-id",
    "paypal-transmission-sig": "fake-signature",
    "paypal-transmission-time": "2026-11-12T10:00:00Z"
  }, { event_type: "INVOICING.INVOICE.PAID" });
  assert(secureCheck.verified === false, `Invalid signature rejected for security: ${secureCheck.status}`);

  // --- Task 4: Frontend UI Files ---
  console.log("\n--- Testing Task 4: Frontend UI Assets ---");
  assert(fs.existsSync("public/index.html"), "public/index.html exists");
  assert(fs.existsSync("public/style.css"), "public/style.css exists");
  assert(fs.existsSync("public/app.js"), "public/app.js exists");

  const html = fs.readFileSync("public/index.html", "utf-8");
  assert(html.includes("Wheat Invoicing"), "index.html contains system title");
  assert(html.includes("voiceBtn"), "index.html contains voice input button");
  assert(html.includes("invoicesTable"), "index.html contains persistent invoices table");
  assert(html.includes("kpiTotalRevenue"), "index.html contains live AI insights cards");

  console.log(`\n=========================================`);
  console.log(`SUMMARY: ${passed} of ${total} tests PASSED!`);
  console.log(`All 4 remaining tasks are completely implemented and verified.`);
  console.log(`=========================================`);
}

runTests().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
