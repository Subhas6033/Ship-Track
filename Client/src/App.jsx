import { useEffect, useMemo, useState } from "react";
import Landing from "./Landing.jsx";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const money = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n || 0);

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const nav = [
  { id: "overview", label: "Overview", icon: "◫" },
  { id: "rates", label: "Rate search", icon: "↗" },
  { id: "shipments", label: "Shipments", icon: "◉" },
  { id: "invoices", label: "Invoice checker", icon: "▤" },
  { id: "inbox", label: "Email updates", icon: "✉" },
];

const AVATAR_COLORS = ["#dff5ef", "#eaf0ff", "#fff0df", "#f2eaff", "#ffe9e7"];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function todayLabel() {
  return new Date()
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();
}

async function request(path, options = {}) {
  const r = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  let data = null;
  try {
    data = await r.json();
  } catch {
    /* non-JSON response */
  }
  if (!r.ok) throw new Error((data && data.error) || "Request failed");
  return data;
}

function Badge({ children }) {
  const key = String(children).toLowerCase().replaceAll(" ", "-");
  return <span className={`badge badge-${key}`}>{children}</span>;
}

function App() {
  const [page, setPage] = useState("landing"),
    [rates, setRates] = useState([]),
    [shipments, setShipments] = useState([]),
    [invoices, setInvoices] = useState([]),
    [routes, setRoutes] = useState({
      origins: [],
      destinations: [],
      containers: [],
    }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [filters, setFilters] = useState({
      origin: "",
      destination: "",
      container: "20ft",
    }),
    [query, setQuery] = useState(""),
    [statusFilter, setStatusFilter] = useState("All"),
    [emailText, setEmailText] = useState(""),
    [parsed, setParsed] = useState(null),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [r, s, i, rt] = await Promise.all([
        request("/rates"),
        request("/shipments"),
        request("/invoices"),
        request("/routes"),
      ]);
      setRates(r);
      setShipments(s);
      setInvoices(i);
      setRoutes(rt);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Scroll back to the top whenever the page changes
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [page]);

  const filteredRates = useMemo(
    () =>
      rates
        .filter(
          (r) =>
            (!filters.origin || r.origin_port === filters.origin) &&
            (!filters.destination ||
              r.destination_port === filters.destination) &&
            (!filters.container || r.container_type === filters.container),
        )
        .sort((a, b) => a.rate_usd - b.rate_usd),
    [rates, filters],
  );

  const filteredShipments = useMemo(
    () =>
      shipments.filter(
        (s) =>
          (statusFilter === "All" || s.status === statusFilter) &&
          (!query ||
            [s.shipment_id, s.carrier, s.origin_port, s.destination_port].some(
              (x) => String(x).toLowerCase().includes(query.toLowerCase()),
            )),
      ),
    [shipments, statusFilter, query],
  );

  const flagged = invoices.filter((i) => i.flagged),
    delayed = shipments.filter((s) => s.status === "Delayed").length;

  async function updateShipment(id, status) {
    try {
      await request(`/shipments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await refresh();
      setToast(`${id} updated to ${status}`);
    } catch (e) {
      setToast(e.message);
    }
  }

  async function loadSample() {
    try {
      setEmailText(await request("/emails/sample", { headers: {} }));
    } catch (e) {
      setToast(e.message);
    }
  }

  async function parseEmails() {
    setBusy(true);
    try {
      const result = await request("/emails/parse", {
        method: "POST",
        body: JSON.stringify({ text: emailText }),
      });
      setParsed(result);
      await refresh();
      setToast(
        `${result.processed} updates applied · ${result.skipped} skipped`,
      );
    } catch (e) {
      setToast(e.message);
    } finally {
      setBusy(false);
    }
  }

  const title = nav.find((n) => n.id === page)?.label || "Overview";

  if (page === "landing")
    return <Landing onEnter={() => setPage("overview")} />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <svg viewBox="0 0 40 40" fill="none">
              <path
                d="M4 24c5-5 10-5 16 0s11 5 16 0M4 31c5-5 10-5 16 0s11 5 16 0"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M20 5v14m-6-6 6 6 6-6"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <strong>Meridian</strong>
            <small>OCEAN INTELLIGENCE</small>
          </div>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <div className="workspace-select">
          <span className="workspace-avatar">N</span>
          <span>
            <strong>Northstar Trading</strong>
            <small>Enterprise plan</small>
          </span>
          <span className="chevron">⌄</span>
        </div>
        <div className="nav-label">OPERATIONS</div>
        <nav aria-label="Workspace sections">
          {nav.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${page === n.id ? "active" : ""}`}
              type="button"
              title={n.label}
              aria-label={n.label}
              aria-current={page === n.id ? "page" : undefined}
              onClick={() => setPage(n.id)}
            >
              <span className="nav-icon">{n.icon}</span>
              {n.label}
              {n.id === "invoices" && flagged.length > 0 && (
                <span className="nav-count">{flagged.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon">✧</div>
            <strong>Need a hand?</strong>
            <p>Our freight specialists are one click away.</p>
            <button
              type="button"
              onClick={() =>
                setToast("Your account specialist will be in touch shortly.")
              }
            >
              Contact support <span>↗</span>
            </button>
          </div>
          <button className="profile" type="button">
            <div className="profile-avatar">AM</div>
            <span>
              <strong>Alex Morgan</strong>
              <small>Logistics manager</small>
            </span>
            <span className="more">···</span>
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="crumb">
            Workspace <span>/</span> <strong>{title}</strong>
          </div>
          <div className="top-actions">
            <span className="live-pill">
              <i /> All systems operational
            </span>
            <button
              type="button"
              className="icon-button"
              aria-label="Notifications"
              onClick={() => setToast("You’re all caught up.")}
            >
              ♧<i className="notification-dot" />
            </button>
            <div className="top-avatar">AM</div>
          </div>
        </header>

        <div className="content">
          {error && (
            <div className="error-banner">
              Couldn’t reach the API: {error}. Start the server with{" "}
              <code>cd Server && npm run dev</code>.
            </div>
          )}

          {page === "overview" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    {todayLabel()} <span className="eyebrow-dot" /> LIVE
                    OVERVIEW
                  </div>
                  <h1>
                    {greeting()}, Alex <span className="wave">✳</span>
                  </h1>
                  <p className="subtitle">
                    Here’s what’s happening across your ocean freight
                    operations.
                  </p>
                </div>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => setPage("rates")}
                >
                  <span>＋</span> Find a rate
                </button>
              </div>

              <div className="metric-grid">
                <Metric
                  label="Active shipments"
                  value={
                    shipments.filter((s) => s.status !== "Delivered").length
                  }
                  change="Across 6 routes"
                  icon="◉"
                  tone="blue"
                />
                <Metric
                  label="On-time delivery"
                  value={`${shipments.length ? Math.round((shipments.filter((s) => s.status !== "Delayed").length / shipments.length) * 100) : 0}%`}
                  change="+4.2% this month"
                  icon="↗"
                  tone="green"
                />
                <Metric
                  label="Invoice exceptions"
                  value={flagged.length}
                  change={
                    flagged.length
                      ? `${money(flagged.reduce((a, b) => a + b.variance, 0))} potential overage`
                      : "All invoices clear"
                  }
                  icon="▤"
                  tone="amber"
                />
                <Metric
                  label="Rates tracked"
                  value={rates.length}
                  change="Across 5 carriers"
                  icon="⌁"
                  tone="purple"
                />
              </div>

              <div className="dashboard-grid">
                <section className="panel shipment-panel">
                  <div className="panel-header">
                    <div>
                      <h2>Shipment overview</h2>
                      <p>Live status across your current shipments</p>
                    </div>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setPage("shipments")}
                    >
                      View all <span>→</span>
                    </button>
                  </div>
                  <div className="status-summary">
                    <div className="status-item">
                      <i className="dot dot-transit" />
                      <span>In transit</span>
                      <strong>
                        {
                          shipments.filter((s) => s.status === "In Transit")
                            .length
                        }
                      </strong>
                    </div>
                    <div className="status-item">
                      <i className="dot dot-delivered" />
                      <span>Delivered</span>
                      <strong>
                        {
                          shipments.filter((s) => s.status === "Delivered")
                            .length
                        }
                      </strong>
                    </div>
                    <div className="status-item">
                      <i className="dot dot-delayed" />
                      <span>Delayed</span>
                      <strong>{delayed}</strong>
                    </div>
                  </div>
                  <div className="shipment-list">
                    {shipments.slice(0, 5).map((s) => (
                      <ShipmentRow key={s.shipment_id} shipment={s} />
                    ))}
                  </div>
                </section>

                <section className="panel rates-panel">
                  <div className="panel-header">
                    <div>
                      <h2>Best available rates</h2>
                      <p>Lowest current prices in your network</p>
                    </div>
                    <button
                      type="button"
                      className="round-link"
                      aria-label="Open rate search"
                      onClick={() => setPage("rates")}
                    >
                      ↗
                    </button>
                  </div>
                  <div className="route-highlight">
                    <span className="route-label">MOST POPULAR ROUTE</span>
                    <div className="route-line">
                      <strong>Nhava Sheva</strong>
                      <span className="route-dashes">··········</span>
                      <span className="route-plane">✈</span>
                      <strong>Los Angeles</strong>
                    </div>
                    <span className="route-sub">
                      India <span>·</span> United States
                    </span>
                  </div>
                  <div className="rate-preview">
                    {rates
                      .filter(
                        (r) =>
                          r.origin_port === "Nhava Sheva" &&
                          r.destination_port === "Los Angeles" &&
                          r.container_type === "40ft",
                      )
                      .sort((a, b) => a.rate_usd - b.rate_usd)
                      .slice(0, 3)
                      .map((r, i) => (
                        <div className="rate-preview-row" key={r.id}>
                          <span
                            className="carrier-avatar"
                            style={{
                              "--avatar":
                                i === 0
                                  ? "#dff5ef"
                                  : i === 1
                                    ? "#eaf0ff"
                                    : "#fff0df",
                            }}
                          >
                            {initials(r.carrier)}
                          </span>
                          <span className="carrier-name">
                            {r.carrier}
                            <small>{r.transit_days} days transit</small>
                          </span>
                          <strong>{money(r.rate_usd)}</strong>
                        </div>
                      ))}
                  </div>
                  <button
                    type="button"
                    className="full-link"
                    onClick={() => setPage("rates")}
                  >
                    Compare all rates <span>→</span>
                  </button>
                </section>
              </div>

              <section className="panel activity-panel">
                <div className="panel-header">
                  <div>
                    <h2>Recent activity</h2>
                    <p>Your latest operational updates</p>
                  </div>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setPage("inbox")}
                  >
                    Email updates <span>→</span>
                  </button>
                </div>
                <div className="activity-row">
                  <div className="activity-symbol email-symbol">✉</div>
                  <div className="activity-copy">
                    <strong>Email updates ready to process</strong>
                    <span>
                      Load your sample inbox to automatically sync rate and
                      shipment changes.
                    </span>
                  </div>
                  <button
                    type="button"
                    className="button button-soft"
                    onClick={() => {
                      setPage("inbox");
                      loadSample();
                    }}
                  >
                    Open inbox <span>→</span>
                  </button>
                </div>
              </section>
            </>
          )}

          {page === "rates" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    PROCUREMENT <span className="eyebrow-dot" /> LIVE CARRIER
                    DATA
                  </div>
                  <h1>Rate search</h1>
                  <p className="subtitle">
                    Compare contracted ocean freight rates across your carrier
                    network.
                  </p>
                </div>
              </div>

              <section className="panel search-panel">
                <div className="search-label">BUILD YOUR ROUTE</div>
                <div className="search-controls">
                  <label>
                    <span>ORIGIN PORT</span>
                    <select
                      value={filters.origin}
                      onChange={(e) =>
                        setFilters({ ...filters, origin: e.target.value })
                      }
                    >
                      <option value="">All origin ports</option>
                      {routes.origins.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  <div className="swap-icon" aria-hidden="true">
                    ⇄
                  </div>
                  <label>
                    <span>DESTINATION</span>
                    <select
                      value={filters.destination}
                      onChange={(e) =>
                        setFilters({ ...filters, destination: e.target.value })
                      }
                    >
                      <option value="">All destinations</option>
                      {routes.destinations.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>CONTAINER</span>
                    <select
                      value={filters.container}
                      onChange={(e) =>
                        setFilters({ ...filters, container: e.target.value })
                      }
                    >
                      <option value="">All sizes</option>
                      {routes.containers.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() =>
                      setToast(`${filteredRates.length} rates found`)
                    }
                  >
                    <span aria-hidden="true">⌕</span>
                    <span>Search rates</span>
                  </button>
                </div>
                <div className="search-hint">
                  {filteredRates.length} rates found <span>·</span> Sorted by
                  lowest price
                </div>
              </section>

              <section className="panel table-panel">
                <div className="panel-header">
                  <div>
                    <h2>
                      Available rates{" "}
                      <span className="small-count">
                        {filteredRates.length}
                      </span>
                    </h2>
                    <p>Rates shown in USD per container</p>
                  </div>
                  <button
                    type="button"
                    className="button button-outline"
                    onClick={() => setToast("Rate list is ready to export.")}
                  >
                    ↓ <span>Export</span>
                  </button>
                </div>
                <div className="table-wrap">
                  <table className="responsive-table">
                    <thead>
                      <tr>
                        <th>CARRIER</th>
                        <th>ROUTE</th>
                        <th>CONTAINER</th>
                        <th>TRANSIT</th>
                        <th>RATE (USD)</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRates.map((r, i) => (
                        <tr key={r.id}>
                          <td data-label="CARRIER">
                            <span className="carrier-cell">
                              <span
                                className="carrier-avatar"
                                style={{
                                  "--avatar":
                                    AVATAR_COLORS[i % AVATAR_COLORS.length],
                                }}
                              >
                                {initials(r.carrier)}
                              </span>
                              <strong>{r.carrier}</strong>
                            </span>
                          </td>
                          <td data-label="ROUTE">
                            {r.origin_port} <span className="muted">→</span>{" "}
                            {r.destination_port}
                          </td>
                          <td data-label="CONTAINER">
                            <span className="container-tag">
                              {r.container_type}
                            </span>
                          </td>
                          <td data-label="TRANSIT">{r.transit_days} days</td>
                          <td data-label="RATE (USD)">
                            <strong className="price">
                              {money(r.rate_usd)}
                            </strong>
                          </td>
                          <td data-label="">
                            <button
                              type="button"
                              className="text-button book-button"
                              onClick={() =>
                                setToast(
                                  `${r.carrier} rate selected. Your team can now request a booking.`,
                                )
                              }
                            >
                              Select rate <span>→</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!filteredRates.length && (
                    <Empty text="No rates match this route. Try broadening your search." />
                  )}
                </div>
              </section>
            </>
          )}

          {page === "shipments" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    VISIBILITY <span className="eyebrow-dot" /> TRACKING
                  </div>
                  <h1>Shipment tracker</h1>
                  <p className="subtitle">
                    Follow every container from departure to final delivery.
                  </p>
                </div>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => setToast("Shipment list is ready to export.")}
                >
                  ↓ <span>Export shipments</span>
                </button>
              </div>

              <div className="toolbar">
                <label className="input-search">
                  <span aria-hidden="true">⌕</span>
                  <input
                    placeholder="Search shipment, carrier or port..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <select
                  className="filter-select"
                  aria-label="Filter by status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option>All</option>
                  <option>In Transit</option>
                  <option>Delivered</option>
                  <option>Delayed</option>
                </select>
                <span className="result-count">
                  {filteredShipments.length} shipments
                </span>
              </div>

              <section className="panel table-panel">
                <div className="table-wrap">
                  <table className="responsive-table">
                    <thead>
                      <tr>
                        <th>SHIPMENT</th>
                        <th>ROUTE</th>
                        <th>CARRIER</th>
                        <th>ETA</th>
                        <th>STATUS</th>
                        <th>UPDATE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredShipments.map((s) => (
                        <tr key={s.shipment_id}>
                          <td data-label="SHIPMENT">
                            <strong>{s.shipment_id}</strong>
                            <small className="table-sub">
                              {s.container_type} · Departed {s.departure_date}
                            </small>
                          </td>
                          <td data-label="ROUTE">
                            {s.origin_port}
                            <br />
                            <span className="muted">
                              ↓ {s.destination_port}
                            </span>
                          </td>
                          <td data-label="CARRIER">{s.carrier}</td>
                          <td data-label="ETA">{s.expected_arrival}</td>
                          <td data-label="STATUS">
                            <Badge>{s.status}</Badge>
                          </td>
                          <td data-label="UPDATE">
                            <select
                              className="row-select"
                              aria-label={`Update status for ${s.shipment_id}`}
                              value={s.status}
                              onChange={(e) =>
                                updateShipment(s.shipment_id, e.target.value)
                              }
                            >
                              <option>In Transit</option>
                              <option>Delivered</option>
                              <option>Delayed</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!filteredShipments.length && (
                    <Empty text="No shipments found." />
                  )}
                </div>
              </section>
            </>
          )}

          {page === "invoices" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    FINANCIAL CONTROL <span className="eyebrow-dot" /> CONTRACT
                    AUDIT
                  </div>
                  <h1>Invoice checker</h1>
                  <p className="subtitle">
                    Spot charges that don’t match your contracted carrier rates.
                  </p>
                </div>
                <button
                  type="button"
                  className="button button-outline"
                  onClick={() => setToast("Invoice report is ready to export.")}
                >
                  ↓ <span>Export report</span>
                </button>
              </div>

              <div className="invoice-summary">
                <div className="panel invoice-stat">
                  <span className="stat-icon amber-icon">!</span>
                  <div>
                    <span>Exceptions flagged</span>
                    <strong>{flagged.length}</strong>
                    <small>of {invoices.length} invoices reviewed</small>
                  </div>
                </div>
                <div className="panel invoice-stat">
                  <span className="stat-icon red-icon">$</span>
                  <div>
                    <span>Potential overcharges</span>
                    <strong>
                      {money(flagged.reduce((a, b) => a + b.variance, 0))}
                    </strong>
                    <small>Across flagged invoices</small>
                  </div>
                </div>
                <div className="panel invoice-stat">
                  <span className="stat-icon green-icon">✓</span>
                  <div>
                    <span>Within contract</span>
                    <strong>{invoices.length - flagged.length}</strong>
                    <small>Invoices at or below rate</small>
                  </div>
                </div>
              </div>

              <section className="panel table-panel">
                <div className="panel-header">
                  <div>
                    <h2>
                      Invoice audit{" "}
                      <span className="small-count">{invoices.length}</span>
                    </h2>
                    <p>Invoice amount compared to latest contracted rate</p>
                  </div>
                  <span className="audit-live">
                    <i /> AUDIT COMPLETE
                  </span>
                </div>
                <div className="table-wrap">
                  <table className="responsive-table">
                    <thead>
                      <tr>
                        <th>SHIPMENT</th>
                        <th>CARRIER / ROUTE</th>
                        <th>CONTRACTED</th>
                        <th>INVOICED</th>
                        <th>VARIANCE</th>
                        <th>RESULT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((i) => (
                        <tr key={i.shipment_id}>
                          <td data-label="SHIPMENT">
                            <strong>{i.shipment_id}</strong>
                            <small className="table-sub">
                              {i.container_type}
                            </small>
                          </td>
                          <td data-label="CARRIER / ROUTE">
                            <strong>{i.carrier}</strong>
                            <small className="table-sub">
                              {i.origin_port} → {i.destination_port}
                            </small>
                          </td>
                          <td data-label="CONTRACTED">
                            {money(i.contract_rate)}
                          </td>
                          <td data-label="INVOICED">
                            <strong>{money(i.invoice_amount_usd)}</strong>
                          </td>
                          <td
                            data-label="VARIANCE"
                            className={
                              i.flagged ? "variance-positive" : "variance-clear"
                            }
                          >
                            {i.variance > 0 ? "+" : ""}
                            {money(i.variance)}
                          </td>
                          <td data-label="RESULT">
                            <Badge>
                              {i.flagged ? "Over contract" : "Within contract"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="table-footnote">
                  ⓘ A shipment is flagged when its invoice exceeds the current
                  carrier rate for the same route and container.
                </div>
              </section>
            </>
          )}

          {page === "inbox" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    AUTOMATION <span className="eyebrow-dot" /> EMAIL PARSER
                  </div>
                  <h1>Email updates</h1>
                  <p className="subtitle">
                    Turn carrier emails into accurate rate and shipment records.
                  </p>
                </div>
                <span className="connected-pill">
                  <i /> Parser ready
                </span>
              </div>

              <div className="email-layout">
                <section className="panel email-editor">
                  <div className="panel-header">
                    <div>
                      <h2>Paste email content</h2>
                      <p>
                        Plain text works best. Separate multiple emails with
                        dashed lines.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-button"
                      onClick={loadSample}
                    >
                      Load sample inbox <span>↗</span>
                    </button>
                  </div>
                  <textarea
                    value={emailText}
                    onChange={(e) => setEmailText(e.target.value)}
                    placeholder={
                      "From: rates@carrier.com\nSubject: Rate update - Nhava Sheva to Los Angeles\n\nOur 20ft rate is now USD 2260..."
                    }
                  />
                  <div className="editor-footer">
                    <span>
                      ✧ Rate changes and shipment updates are detected
                      automatically
                    </span>
                    <button
                      type="button"
                      className="button button-primary"
                      disabled={!emailText.trim() || busy}
                      onClick={parseEmails}
                    >
                      {busy ? "Processing…" : "✧ Process emails"}
                    </button>
                  </div>
                </section>

                <aside className="panel parser-help">
                  <div className="parser-icon">✉</div>
                  <h3>What gets picked up?</h3>
                  <div className="parse-rule">
                    <span className="rule-number">01</span>
                    <div>
                      <strong>Rate changes</strong>
                      <p>Carrier, route, container size and new USD amount.</p>
                    </div>
                  </div>
                  <div className="parse-rule">
                    <span className="rule-number">02</span>
                    <div>
                      <strong>Shipment status</strong>
                      <p>
                        Shipment ID with delivered, delayed or in transit
                        language.
                      </p>
                    </div>
                  </div>
                  <div className="parse-rule">
                    <span className="rule-number">03</span>
                    <div>
                      <strong>Unclear emails</strong>
                      <p>
                        Irrelevant or incomplete messages are safely skipped.
                      </p>
                    </div>
                  </div>
                  <div className="privacy-note">
                    ⌑ &nbsp;Email content is processed locally by your workspace
                    API.
                  </div>
                </aside>
              </div>

              {parsed && (
                <section className="panel parse-results">
                  <div className="panel-header">
                    <div>
                      <h2>Processing results</h2>
                      <p>
                        {parsed.processed} updates applied · {parsed.skipped}{" "}
                        skipped
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setParsed(null)}
                    >
                      Clear
                    </button>
                  </div>
                  <div className="result-list">
                    {parsed.results.map((r, i) => (
                      <div className="result-row" key={i}>
                        <span
                          className={`result-icon ${r.status === "Updated" ? "result-ok" : "result-skip"}`}
                        >
                          {r.status === "Updated" ? "✓" : "–"}
                        </span>
                        <div>
                          <Badge>{r.status}</Badge>
                          <span>{r.detail}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        <footer className="footer">
          <span>© 2026 Meridian Freight Intelligence</span>
          <span>
            Ocean operations, in sync. <span className="footer-dot">•</span>{" "}
            <button
              type="button"
              onClick={() => setToast("API status: connected to sample data.")}
            >
              System status
            </button>
          </span>
        </footer>
      </main>

      {toast && (
        <div className="toast" role="status">
          <span>✓</span>
          {toast}
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setToast("")}
          >
            ×
          </button>
        </div>
      )}
      {loading && (
        <div className="loading-screen">
          <div className="loading-mark">⌁</div>
          <span>Loading your workspace…</span>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, change, icon, tone }) {
  return (
    <div className="panel metric-card">
      <div className={`metric-icon ${tone}`}>{icon}</div>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-change">
        <span className={tone === "green" ? "positive-change" : "change-dot"}>
          {tone === "green" ? "↗" : "•"}
        </span>{" "}
        {change}
      </div>
      <div className="sparkline">
        <svg viewBox="0 0 100 34" preserveAspectRatio="none">
          <path d="M0 27 C12 22 14 28 24 18 S38 23 48 13 S60 23 70 12 S84 17 100 4" />
        </svg>
      </div>
    </div>
  );
}

function ShipmentRow({ shipment: s }) {
  return (
    <div className="shipment-row">
      <span
        className={`ship-route-icon ${s.status === "Delayed" ? "route-warn" : ""}`}
      >
        ⌁
      </span>
      <div className="shipment-main">
        <strong>
          {s.origin_port} <span>→</span> {s.destination_port}
        </strong>
        <small>
          {s.shipment_id} <span>·</span> {s.carrier}
        </small>
      </div>
      <div className="shipment-eta">
        <small>ETA</small>
        <strong>{(s.expected_arrival || "").slice(5)}</strong>
      </div>
      <Badge>{s.status}</Badge>
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="empty-state">
      <span>⌕</span>
      {text}
    </div>
  );
}

export default App;
