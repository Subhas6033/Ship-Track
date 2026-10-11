import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { sendEmail, isMailConfigured } from "./services/mailer.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const loadedEnvironment = dotenv.config({ path: path.join(here, ".env") });
const adminRegistrationKey = String(
  process.env.ADMIN_REGISTRATION_KEY ||
    loadedEnvironment.parsed?.ADMIN_REGISTRATION_KEY ||
    "",
).trim();
const jwtSecret = process.env.JWT_SECRET || randomBytes(32).toString("hex");
const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

function parseCsv(file) {
  const [header, ...lines] = fs
    .readFileSync(path.join(here, "Data", file), "utf8")
    .trim()
    .split(/\r?\n/);
  const keys = header.split(",");
  return lines.map((line) =>
    Object.fromEntries(line.split(",").map((v, i) => [keys[i], v])),
  );
}
function parseCsvText(text) {
  const rows = String(text || "")
    .trim()
    .split(/\r?\n/);
  if (rows.length < 2)
    throw new Error("CSV must include a header and at least one row.");
  const headers = rows
    .shift()
    .split(",")
    .map((x) => x.trim().toLowerCase());
  return rows.map((line) =>
    Object.fromEntries(line.split(",").map((v, i) => [headers[i], v.trim()])),
  );
}
let rates = parseCsv("carrier_rates.csv").map((r, i) => ({
  ...r,
  id: `R${i + 1}`,
  rate_usd: Number(r.rate_usd),
  transit_days: Number(r.transit_days),
}));
let shipments = parseCsv("sample_shipments.csv").map((s) => ({
  ...s,
  invoice_amount_usd: Number(s.invoice_amount_usd),
  status: s.delivered_date ? "Delivered" : "In Transit",
}));
const statusEvents = [];

// MongoDB is the source of truth; bundled CSV data is seeded during startup.
const RateSchema = new mongoose.Schema({
  id: String,
  carrier: String,
  origin_port: String,
  destination_port: String,
  container_type: String,
  rate_usd: Number,
  transit_days: Number,
});
RateSchema.index(
  { carrier: 1, origin_port: 1, destination_port: 1, container_type: 1 },
  { unique: true },
);
const ShipmentSchema = new mongoose.Schema({
  shipment_id: { type: String, unique: true },
  carrier: String,
  origin_port: String,
  destination_port: String,
  container_type: String,
  departure_date: String,
  expected_arrival: String,
  delivered_date: String,
  invoice_amount_usd: Number,
  status: String,
});
const UserSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true },
  role: { type: String, enum: ["Admin", "User"], required: true },
});
const Rate = mongoose.models.Rate || mongoose.model("Rate", RateSchema);
const Shipment =
  mongoose.models.Shipment || mongoose.model("Shipment", ShipmentSchema);
const User = mongoose.models.User || mongoose.model("User", UserSchema);
const localUsers = [];

const mongoConnected = () => mongoose.connection.readyState === 1;
const loadRates = () => Rate.find().lean();
const loadShipments = () => Shipment.find().lean();

async function saveRate(rate) {
  await Rate.updateOne(
    { carrier: rate.carrier, origin_port: rate.origin_port, destination_port: rate.destination_port, container_type: rate.container_type },
    { $set: rate },
    { upsert: true },
  );
}

async function saveShipment(shipment) {
  await Shipment.updateOne({ shipment_id: shipment.shipment_id }, { $set: shipment }, { upsert: true });
}

async function seedCsvData() {
  const shipmentIndexes = await Shipment.collection.indexes();
  for (const index of shipmentIndexes) {
    if (index.key?.shipmentId) {
      await Shipment.collection.updateMany(
        { shipment_id: { $exists: false }, shipmentId: { $exists: true } },
        [{
          $set: {
            shipment_id: "$shipmentId",
            origin_port: { $ifNull: ["$origin_port", "$originPort"] },
            destination_port: { $ifNull: ["$destination_port", "$destinationPort"] },
            container_type: { $ifNull: ["$container_type", "$containerType"] },
            departure_date: { $ifNull: ["$departure_date", "$departureDate"] },
            expected_arrival: { $ifNull: ["$expected_arrival", "$expectedArrival"] },
            delivered_date: { $ifNull: ["$delivered_date", "$deliveredDate", ""] },
            invoice_amount_usd: { $ifNull: ["$invoice_amount_usd", "$invoiceAmountUsd", 0] },
          },
        }],
      );
      await Shipment.collection.dropIndex(index.name);
    }
  }
  for (const rate of rates) {
    await Rate.updateOne(
      { carrier: rate.carrier, origin_port: rate.origin_port, destination_port: rate.destination_port, container_type: rate.container_type },
      { $setOnInsert: rate },
      { upsert: true },
    );
  }
  for (const shipment of shipments) {
    await Shipment.updateOne(
      { shipment_id: shipment.shipment_id },
      { $setOnInsert: shipment },
      { upsert: true },
    );
  }
  rates = await Rate.find().lean();
  shipments = await Shipment.find().lean();
}

function createSession(user) {
  const email = user.email;
  const role = user.role;
  const name = user.name || email.split("@")[0].replace(/[._-]+/g, " ");
  const token = jwt.sign({ sub: String(user._id || email), email, role, name }, jwtSecret, {
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  });
  return { token, user: { name, email, role } };
}

async function findUser(email) {
  const normalized = email.trim().toLowerCase();
  if (mongoose.connection.readyState === 1)
    return User.findOne({ email: normalized }).lean();
  return localUsers.find((user) => user.email === normalized) || null;
}

async function seedConfiguredUsers() {
  const configured = [
    { name: process.env.ADMIN_NAME, email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD, role: "Admin" },
    { name: process.env.USER_NAME, email: process.env.USER_EMAIL, password: process.env.USER_PASSWORD, role: "User" },
  ].filter((user) => user.email && user.password);
  for (const account of configured) {
    const email = account.email.trim().toLowerCase();
    const password_hash = await bcrypt.hash(account.password, 12);
    const name = account.name?.trim() || email.split("@")[0].replace(/[._-]+/g, " ");
    const record = { name, email, password_hash, role: account.role };
    if (mongoose.connection.readyState === 1) {
      await User.updateOne({ email }, { $set: { name, password_hash, role: account.role } }, { upsert: true });
    } else {
      const index = localUsers.findIndex((user) => user.email === email);
      if (index >= 0) localUsers[index] = record;
      else localUsers.push(record);
    }
  }
}

function authenticate(req, res, next) {
  const authorization = req.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Please log in to continue." });
  try {
    req.auth = jwt.verify(token, jwtSecret);
    next();
  } catch {
    res.status(401).json({ error: "Your login has expired. Please log in again." });
  }
}

function requireDatabase(_req, res, next) {
  if (!mongoConnected())
    return res.status(503).json({ error: "MongoDB is unavailable. Workspace data cannot be loaded." });
  next();
}

function requireAdmin(req, res, next) {
  if (req.auth?.role !== "Admin")
    return res.status(403).json({ error: "Administrator access is required." });
  next();
}

const api = express.Router();
api.get("/health", (_req, res) =>
  res.json({
    ok: true,
    storage: mongoConnected() ? "mongodb" : "unavailable",
  }),
);
api.post("/auth/register", requireDatabase, async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (name.length < 2 || name.length > 80)
    return res.status(400).json({ error: "Enter your name (2 to 80 characters)." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: "Enter a valid email address." });
  if (password.length < 8)
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  if (await findUser(email))
    return res.status(409).json({ error: "An account with that email already exists." });
  const record = { name, email, password_hash: await bcrypt.hash(password, 12), role: "User" };
  try {
    if (mongoose.connection.readyState === 1) {
      const user = await User.create(record);
      return res.status(201).json(createSession(user));
    }
    localUsers.push(record);
    res.status(201).json(createSession(record));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: "An account with that email already exists." });
    throw error;
  }
});
api.post("/auth/admin-register", requireDatabase, async (req, res) => {
  if (!adminRegistrationKey)
    return res.status(503).json({ error: "Admin registration is not configured on the server." });
  const suppliedKey = String(req.body.adminKey || "");
  const expected = Buffer.from(adminRegistrationKey);
  const supplied = Buffer.from(suppliedKey);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied))
    return res.status(403).json({ error: "Admin registration key is invalid." });

  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (name.length < 2 || name.length > 80)
    return res.status(400).json({ error: "Enter your name (2 to 80 characters)." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: "Enter a valid email address." });
  if (password.length < 8)
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  if (await findUser(email))
    return res.status(409).json({ error: "An account with that email already exists." });
  const record = { name, email, password_hash: await bcrypt.hash(password, 12), role: "Admin" };
  try {
    const user = await User.create(record);
    res.status(201).json(createSession(user));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: "An account with that email already exists." });
    throw error;
  }
});
api.post("/auth/login", requireDatabase, async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const requestedRole = ["Admin", "User"].includes(req.body.role)
    ? req.body.role
    : null;
  const user = await findUser(email);
  if (
    !user ||
    (requestedRole && user.role !== requestedRole) ||
    !(await bcrypt.compare(password, user.password_hash))
  )
    return res.status(401).json({ error: "Email or password is incorrect." });
  res.json(createSession(user));
});
api.use(authenticate, requireDatabase);
api.get("/auth/me", (req, res) =>
  res.json({ user: { name: req.auth.name, email: req.auth.email, role: req.auth.role } }),
);
api.get("/rates", async (req, res) => {
  const allRates = await loadRates();
  let result = allRates.filter(
    (r) =>
      (!req.query.origin || r.origin_port === req.query.origin) &&
      (!req.query.destination ||
        r.destination_port === req.query.destination) &&
      (!req.query.container || r.container_type === req.query.container),
  );
  result.sort((a, b) => a.rate_usd - b.rate_usd);
  res.json(result);
});
api.post("/rates/import", requireAdmin, async (req, res) => {
  try {
    const imported = parseCsvText(req.body.csv).map((r, i) => ({
      id: `U${Date.now()}-${i}`,
      carrier: r.carrier,
      origin_port: r.origin_port,
      destination_port: r.destination_port,
      container_type: r.container_type?.toLowerCase(),
      rate_usd: Number(r.rate_usd),
      transit_days: Number(r.transit_days),
    }));
    if (
      imported.some(
        (r) =>
          !r.carrier ||
          !r.origin_port ||
          !r.destination_port ||
          !["20ft", "40ft"].includes(r.container_type) ||
          !Number.isFinite(r.rate_usd) ||
          !Number.isFinite(r.transit_days),
      )
    )
      return res
        .status(400)
        .json({
          error:
            "CSV rows need carrier, origin_port, destination_port, container_type (20ft/40ft), rate_usd and transit_days.",
        });
    for (const item of imported) await saveRate(item);
    res.json({ imported: imported.length });
  } catch (e) {
    res.status(400).json({ error: e.message || "Could not read CSV." });
  }
});
api.post("/admin/rates", requireAdmin, async (req, res) => {
  const carrier = String(req.body.carrier || "").trim();
  const origin_port = String(req.body.origin_port || "").trim();
  const destination_port = String(req.body.destination_port || "").trim();
  const container_type = String(req.body.container_type || "").trim().toLowerCase();
  const rate_usd = Number(req.body.rate_usd);
  const transit_days = Number(req.body.transit_days);
  if (!carrier || !origin_port || !destination_port || !["20ft", "40ft"].includes(container_type) || !Number.isFinite(rate_usd) || rate_usd <= 0 || !Number.isInteger(transit_days) || transit_days <= 0)
    return res.status(400).json({ error: "Enter a carrier, route, valid container, positive rate and transit days." });
  const rate = {
    id: `A${Date.now()}`,
    carrier,
    origin_port,
    destination_port,
    container_type,
    rate_usd,
    transit_days,
  };
  await saveRate(rate);
  res.json(rate);
});
api.get("/routes", async (_req, res) => {
  const allRates = await loadRates();
  res.json({
    origins: [...new Set(allRates.map((r) => r.origin_port))].sort(),
    destinations: [...new Set(allRates.map((r) => r.destination_port))].sort(),
    containers: [...new Set(allRates.map((r) => r.container_type))],
  });
});
api.get("/shipments", async (req, res) => {
  const q = String(req.query.q || "").toLowerCase();
  const allShipments = await loadShipments();
  res.json(
    allShipments
      .filter(
        (s) =>
          (!req.query.status || s.status === req.query.status) &&
          (!q ||
            [s.shipment_id, s.carrier, s.origin_port, s.destination_port].some(
              (x) => x.toLowerCase().includes(q),
            )),
      )
      .map((s) => ({ ...s, status: statusOf(s) })),
  );
});
function statusOf(s) {
  if (s.status === "Delayed") return "Delayed";
  if (s.delivered_date) return "Delivered";
  return new Date(`${s.expected_arrival}T23:59:59`) < new Date()
    ? "Delayed"
    : "In Transit";
}
api.post("/shipments", async (req, res) => {
  const {
    shipment_id,
    carrier,
    origin_port,
    destination_port,
    container_type,
    departure_date,
    expected_arrival,
  } = req.body;
  if (
    ![
      shipment_id,
      carrier,
      origin_port,
      destination_port,
      departure_date,
      expected_arrival,
    ].every((x) => String(x || "").trim()) ||
    !["20ft", "40ft"].includes(container_type)
  )
    return res
      .status(400)
      .json({
        error:
          "Complete all shipment fields and choose a valid container type.",
      });
  const allShipments = await loadShipments();
  if (
    allShipments.some(
      (s) => s.shipment_id.toLowerCase() === shipment_id.trim().toLowerCase(),
    )
  )
    return res.status(409).json({ error: "That shipment ID already exists." });
  const shipment = {
    shipment_id: shipment_id.trim(),
    carrier,
    origin_port,
    destination_port,
    container_type,
    departure_date,
    expected_arrival,
    delivered_date: "",
    invoice_amount_usd: 0,
    status: "In Transit",
  };
  await Shipment.create(shipment);
  res.status(201).json({ ...shipment, status: statusOf(shipment) });
});
api.patch("/shipments/:id", async (req, res) => {
  const allShipments = await loadShipments();
  const s = allShipments.find((x) => x.shipment_id === req.params.id);
  if (!s) return res.status(404).json({ error: "Shipment not found" });
  const { status, delivered_date } = req.body;
  if (!["In Transit", "Delayed", "Delivered"].includes(status))
    return res.status(400).json({ error: "Invalid status" });
  s.status = status;
  if (status === "Delivered")
    s.delivered_date = delivered_date || new Date().toISOString().slice(0, 10);
  if (status !== "Delivered") s.delivered_date = "";
  statusEvents.unshift({
    id: Date.now(),
    shipment_id: s.shipment_id,
    status,
    date: new Date().toISOString(),
    source: "Manual update",
  });
  await saveShipment(s);
  res.json({ ...s, status: statusOf(s) });
});
api.patch("/admin/shipments/:id", requireAdmin, async (req, res) => {
  const allShipments = await loadShipments();
  const shipment = allShipments.find((item) => item.shipment_id === req.params.id);
  if (!shipment) return res.status(404).json({ error: "Shipment not found." });
  const { status, expected_arrival } = req.body;
  if (status !== undefined && !["In Transit", "Delayed", "Delivered"].includes(status))
    return res.status(400).json({ error: "Invalid shipment status." });
  if (expected_arrival !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(expected_arrival))
    return res.status(400).json({ error: "Expected arrival must be a valid date." });
  if (status) {
    shipment.status = status;
    shipment.delivered_date = status === "Delivered" ? new Date().toISOString().slice(0, 10) : "";
  }
  if (expected_arrival) shipment.expected_arrival = expected_arrival;
  await saveShipment(shipment);
  res.json({ ...shipment, status: statusOf(shipment) });
});
api.get("/invoices", async (_req, res) => {
  const [allShipments, allRates] = await Promise.all([loadShipments(), loadRates()]);
  res.json(
    allShipments
      .filter((s) => s.invoice_amount_usd > 0)
      .map((s) => {
        const contract =
          allRates.find(
            (r) =>
              r.carrier === s.carrier &&
              r.origin_port === s.origin_port &&
              r.destination_port === s.destination_port &&
              r.container_type === s.container_type,
          )?.rate_usd ?? s.invoice_amount_usd;
        const variance = s.invoice_amount_usd - contract;
        return {
          ...s,
          contract_rate: contract,
          variance,
          flagged: variance > 0,
        };
      })
      .sort((a, b) => b.variance - a.variance),
  );
});
api.patch("/invoices/:id", async (req, res) => {
  const [allShipments, allRates] = await Promise.all([loadShipments(), loadRates()]);
  const s = allShipments.find((x) => x.shipment_id === req.params.id);
  const amount = Number(req.body.amount);
  if (!s) return res.status(404).json({ error: "Shipment not found" });
  if (!Number.isFinite(amount) || amount <= 0)
    return res
      .status(400)
      .json({ error: "Invoice amount must be greater than zero." });
  s.invoice_amount_usd = amount;
  await saveShipment(s);
  const contract = allRates.find(
    (r) =>
      r.carrier === s.carrier &&
      r.origin_port === s.origin_port &&
      r.destination_port === s.destination_port &&
      r.container_type === s.container_type,
  )?.rate_usd;
  if (contract == null)
    return res
      .status(422)
      .json({ error: "No contracted rate matches this shipment." });
  res.json({
    shipment_id: s.shipment_id,
    contract_rate: contract,
    invoice_amount_usd: amount,
    variance: amount - contract,
    flagged: amount > contract,
  });
});
api.get("/emails/sample", (_req, res) =>
  res
    .type("text/plain")
    .send(
      fs.readFileSync(path.join(here, "Data", "sample_emails.txt"), "utf8"),
    ),
);
api.get("/emails/status", (_req, res) =>
  res.json({ configured: isMailConfigured() }),
);
api.post("/emails/send", async (req, res) => {
  const to = String(req.body.to || process.env.MAIL_TO || "").trim();
  const subject = String(req.body.subject || "").trim();
  const text = String(req.body.text || "").trim();
  if (!to || !subject || !text)
    return res
      .status(400)
      .json({ error: "Recipient, subject and message are required." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to))
    return res
      .status(400)
      .json({ error: "Enter a valid recipient email address." });
  if (!isMailConfigured())
    return res
      .status(503)
      .json({
        error:
          "SMTP is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and MAIL_FROM to Server/.env, then restart the server.",
      });
  try {
    const result = await sendEmail({ to, subject, text });
    res.json({ sent: true, messageId: result.messageId, to });
  } catch (error) {
    console.error("SMTP send failed:", error.message);
    res
      .status(502)
      .json({
        error:
          "The mail server rejected or could not deliver the message. Check SMTP settings and provider logs.",
      });
  }
});
api.post("/emails/parse", async (req, res) => {
  const [allRates, allShipments] = await Promise.all([loadRates(), loadShipments()]);
  const raw = String(req.body.text || "");
  if (!raw.trim())
    return res.status(400).json({ error: "Paste email text to parse." });
  const blocks = raw
    .split(/\n-{5,}\s*\n|\n={5,}\s*\n/)
    .filter((b) => /(?:From:|Subject:|Email\s+\d+)/i.test(b));
  const results = [];
  for (const block of blocks) {
    const lower = block.toLowerCase();
    const email = block.match(/From:\s*([^\s\n]+)/i)?.[1] || "";
    const carrier = allRates
      .map((r) => r.carrier)
      .find(
        (c) =>
          email.toLowerCase().includes(c.toLowerCase().replaceAll(" ", "")) ||
          lower.includes(c.toLowerCase()),
      );
    const shipmentId = block.match(/SHP\d{4}/i)?.[0]?.toUpperCase();
    const amount = block
      .match(/(?:USD\s*|\$\s*)([\d,]+)/i)?.[1]
      ?.replaceAll(",", "");
    if (shipmentId) {
      const shipment = allShipments.find((s) => s.shipment_id === shipmentId);
      if (!shipment) {
        results.push({
          type: "shipment",
          status: "Skipped",
          detail: `${shipmentId} not found`,
        });
        continue;
      }
      const status = /deliver(?:ed|y confirmation)/i.test(block)
        ? "Delivered"
        : /delay|congestion|reschedul/i.test(block)
          ? "Delayed"
          : /transit|departed/i.test(block)
            ? "In Transit"
            : null;
      if (!status) {
        results.push({
          type: "shipment",
          status: "Skipped",
          detail: `No clear status for ${shipmentId}`,
        });
        continue;
      }
      shipment.status = status;
      if (status === "Delivered")
        shipment.delivered_date =
          block.match(/(?:on\s+)(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})/i)?.[1] ||
          new Date().toISOString().slice(0, 10);
      else shipment.delivered_date = "";
      statusEvents.unshift({
        id: Date.now() + results.length,
        shipment_id: shipmentId,
        status,
        date: new Date().toISOString(),
        source: "Email",
      });
      await saveShipment(shipment);
      results.push({
        type: "shipment",
        status: "Updated",
        detail: `${shipmentId} marked ${status}`,
        shipment_id: shipmentId,
      });
      continue;
    }
    if (amount) {
      const origin = allRates
        .map((r) => r.origin_port)
        .sort((a, b) => b.length - a.length)
        .find((x) => lower.includes(x.toLowerCase()));
      const destination = allRates
        .map((r) => r.destination_port)
        .sort((a, b) => b.length - a.length)
        .find((x) => lower.includes(x.toLowerCase()));
      const container = block
        .match(/\b(20|40)\s*ft\b/i)?.[0]
        ?.replace(/\s/g, "")
        .toLowerCase();
      const matched = allRates.find(
        (r) =>
          r.carrier === carrier &&
          r.origin_port === origin &&
          r.destination_port === destination &&
          r.container_type === container,
      );
      if (!matched) {
        results.push({
          type: "rate",
          status: "Skipped",
          detail: "Rate email needs a carrier, full route and container type.",
        });
        continue;
      }
      const previous = matched.rate_usd;
      matched.rate_usd = Number(amount);
      await saveRate(matched);
      results.push({
        type: "rate",
        status: "Updated",
        detail: `${carrier} · ${origin} → ${destination} · ${container}: $${previous.toLocaleString()} → $${Number(amount).toLocaleString()}`,
        rate_id: matched.id,
      });
      continue;
    }
    results.push({
      type: "other",
      status: "Skipped",
      detail: "No supported rate or shipment update found.",
    });
  }
  res.json({
    processed: results.filter((x) => x.status === "Updated").length,
    skipped: results.filter((x) => x.status === "Skipped").length,
    results,
  });
});
api.get("/events", (_req, res) => res.json(statusEvents.slice(0, 20)));
app.use("/api", api);
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong." });
});

export async function start() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("Set MONGO_URI or MONGODB_URI in Server/.env to start the MongoDB-backed app.");
  }
  await mongoose.connect(mongoUri);
  await seedCsvData();
  await seedConfiguredUsers();
  console.log(`Connected to MongoDB; loaded ${rates.length} rates and ${shipments.length} shipments`);
  return app;
}
export default app;
