import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import Landing from "./Landing.jsx";
import LoginPage from "./LoginPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import "./App.css";

const API = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

const money = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n || 0);

const moneyInCurrency = (amount, currency) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount || 0);

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
  { id: "admin", label: "Admin data", icon: "⚙" },
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
  const url = `${API}${path}`;
  let r;
  try {
    r = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(localStorage.getItem("meridian_session")
          ? {
              Authorization: `Bearer ${localStorage.getItem("meridian_session")}`,
            }
          : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error(
      `Could not reach the API at ${url}. Check that the server is running and VITE_API_URL is correct.`,
    );
  }
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
  const location = useLocation();
  const navigate = useNavigate();
  const routePage = location.pathname.match(/^\/workspace\/([^/]+)\/?$/)?.[1];
  const page = routePage || "overview";
  const [rates, setRates] = useState([]),
    [shipments, setShipments] = useState([]),
    [invoices, setInvoices] = useState([]),
    [routes, setRoutes] = useState({
      origins: [],
      destinations: [],
      containers: [],
    }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [mailConfigured, setMailConfigured] = useState(false);
  const [authToken, setAuthToken] = useState(
    () => localStorage.getItem("meridian_session") || "",
  );
  const [authUser, setAuthUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [greetingText, setGreetingText] = useState(greeting);
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
  const [shipmentForm, setShipmentForm] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    shipment_id: "",
    amount: "",
  });
  const [invoiceCurrency, setInvoiceCurrency] = useState("USD");
  const [usdToInr, setUsdToInr] = useState(null);
  const [exchangeRateDate, setExchangeRateDate] = useState("");
  const [exchangeRateError, setExchangeRateError] = useState("");
  const [mailDraft, setMailDraft] = useState({ to: "", subject: "", text: "" });
  const [sendingMail, setSendingMail] = useState(false);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [r, s, i, rt, mail] = await Promise.all([
        request("/rates"),
        request("/shipments"),
        request("/invoices"),
        request("/routes"),
        request("/emails/status"),
      ]);
      setRates(r);
      setShipments(s);
      setInvoices(i);
      setRoutes(rt);
      setMailConfigured(mail.configured);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authToken) {
      setAuthReady(true);
      return;
    }
    request("/auth/me")
      .then((data) => setAuthUser(data.user))
      .catch(() => {
        localStorage.removeItem("meridian_session");
        setAuthToken("");
        setAuthUser(null);
      })
      .finally(() => setAuthReady(true));
  }, []);

  useEffect(() => {
    if (authReady && authToken) refresh();
    else if (authReady) setLoading(false);
  }, [authReady, authToken]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const timer = setInterval(() => setGreetingText(greeting()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (page !== "invoices") return;
    const controller = new AbortController();
    setExchangeRateError("");
    fetch("https://api.frankfurter.dev/v2/rate/USD/INR", {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok)
          throw new Error("Exchange rate service is unavailable.");
        return response.json();
      })
      .then((data) => {
        if (!Number.isFinite(data.rate) || data.rate <= 0)
          throw new Error("Could not read the latest USD/INR rate.");
        setUsdToInr(data.rate);
        setExchangeRateDate(data.date || "");
      })
      .catch((error) => {
        if (error.name !== "AbortError")
          setExchangeRateError(
            error.message || "Could not load exchange rate.",
          );
      });
    return () => controller.abort();
  }, [page]);

  // Scroll back to the top whenever the page changes
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  function goToPage(id) {
    navigate(`/workspace/${id}`);
  }

  async function authenticateUser(mode, credentials) {
    const result = await request(`/auth/${mode}`, {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    localStorage.setItem("meridian_session", result.token);
    setAuthToken(result.token);
    setAuthUser(result.user);
    navigate("/workspace/overview", { replace: true });
  }

  function logout() {
    localStorage.removeItem("meridian_session");
    setAuthToken("");
    setAuthUser(null);
    setError("");
    navigate("/", { replace: true });
  }

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
      const token = localStorage.getItem("meridian_session");
      const response = await fetch(`${API}/emails/sample`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        let details;
        try {
          details = await response.json();
        } catch {
          /* response may be plain text */
        }
        throw new Error(details?.error || "Could not load the sample inbox.");
      }
      setEmailText(await response.text());
    } catch (e) {
      setToast(e.message);
    }
  }

  async function loadEmailFile(file) {
    if (!file) return;
    try {
      setEmailText(await file.text());
      setParsed(null);
      setToast(`${file.name} loaded`);
    } catch {
      setToast("Could not read that email file.");
    }
  }

  async function sendMail(event) {
    event.preventDefault();
    setSendingMail(true);
    try {
      const result = await request("/emails/send", {
        method: "POST",
        body: JSON.stringify(mailDraft),
      });
      setToast(`Email sent to ${result.to}`);
      setMailDraft({ to: "", subject: "", text: "" });
    } catch (e) {
      setToast(e.message);
    } finally {
      setSendingMail(false);
    }
  }

  function prepareUpdateEmail() {
    const updated = (parsed?.results || []).filter(
      (item) => item.status === "Updated",
    );
    if (!updated.length) {
      setToast("There are no applied updates to email.");
      return;
    }
    const summary = updated.map((item) => `• ${item.detail}`).join("\n");
    setMailDraft((draft) => ({
      ...draft,
      subject: `Ocean freight updates: ${updated.length} applied`,
      text: `The following carrier email updates were applied to the freight workspace:\n\n${summary}\n\nSkipped emails: ${parsed.skipped}.`,
    }));
    setToast("Update summary prepared. Enter a recipient and send it below.");
    window.setTimeout(
      () =>
        document
          .getElementById("send-update-email")
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      0,
    );
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

  async function importRates(file) {
    if (!file) return;
    try {
      const csv = await file.text();
      const result = await request("/rates/import", {
        method: "POST",
        body: JSON.stringify({ csv }),
      });
      await refresh();
      setToast(`${result.imported} rates imported`);
    } catch (e) {
      setToast(e.message);
    }
  }

  async function createShipment(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await request("/shipments", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setShipmentForm(false);
      await refresh();
      setToast(`${result.shipment_id} added`);
    } catch (e) {
      setToast(e.message);
    }
  }

  async function saveInvoice(shipmentId, amount) {
    try {
      const result = await request(
        `/invoices/${encodeURIComponent(shipmentId)}`,
        { method: "PATCH", body: JSON.stringify({ amount }) },
      );
      await refresh();
      const variance =
        invoiceCurrency === "INR" && usdToInr
          ? result.variance * usdToInr
          : result.variance;
      setToast(
        result.flagged
          ? `Overcharged by ${moneyInCurrency(variance, invoiceCurrency)}`
          : "Invoice amount matches the contracted rate",
      );
    } catch (e) {
      setToast(e.message);
    }
  }

  async function importInvoices(file) {
    if (!file) return;
    try {
      const lines = (await file.text()).trim().split(/\r?\n/);
      const headers = lines
        .shift()
        .split(",")
        .map((h) => h.trim().toLowerCase());
      const idIndex = headers.indexOf("shipment_id");
      const amountIndex = headers.findIndex((h) =>
        ["invoice_amount_usd", "amount"].includes(h),
      );
      if (idIndex < 0 || amountIndex < 0)
        throw new Error(
          "CSV needs shipment_id and invoice_amount_usd (or amount) columns.",
        );
      let count = 0;
      for (const line of lines) {
        const columns = line.split(",");
        if (columns[idIndex] && Number(columns[amountIndex]) > 0) {
          await request(
            `/invoices/${encodeURIComponent(columns[idIndex].trim())}`,
            {
              method: "PATCH",
              body: JSON.stringify({ amount: Number(columns[amountIndex]) }),
            },
          );
          count++;
        }
      }
      await refresh();
      setToast(`${count} invoice amounts imported`);
    } catch (e) {
      setToast(e.message);
    }
  }

  const title = nav.find((n) => n.id === page)?.label || "Overview";
  const userName = (authUser?.name || authUser?.email?.split("@")[0] || "User")
    .replace(/[._-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  const firstName = userName.split(/\s+/)[0];

  if (!authReady)
    return <div className="auth-loading">Checking your session…</div>;
  if (!authToken || !authUser) {
    if (location.pathname === "/login")
      return (
        <LoginPage
          onAuthenticate={authenticateUser}
          onBack={() => navigate("/")}
        />
      );
    if (location.pathname !== "/") return <Navigate to="/" replace />;
    return (
      <Landing
        onEnter={() => navigate("/login")}
        onLogin={() => navigate("/login")}
      />
    );
  }
  if (!routePage) return <Navigate to="/workspace/overview" replace />;
  if (
    !nav.some((item) => item.id === routePage) ||
    (routePage === "admin" && authUser.role !== "Admin")
  )
    return <Navigate to="/workspace/overview" replace />;

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
          <span className="workspace-avatar">{initials(userName)}</span>
          <span>
            <strong>{userName}</strong>
            <small>{authUser.role} account</small>
          </span>
          <span className="chevron">⌄</span>
        </div>
        <div className="nav-label">OPERATIONS</div>
        <nav aria-label="Workspace sections">
          {nav
            .filter((n) => n.id !== "admin" || authUser.role === "Admin")
            .map((n) => (
              <button
                key={n.id}
                className={`nav-item ${page === n.id ? "active" : ""}`}
                type="button"
                title={n.label}
                aria-label={n.label}
                aria-current={page === n.id ? "page" : undefined}
                onClick={() => goToPage(n.id)}
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
          <button
            className="profile"
            type="button"
            onClick={logout}
            title="Log out"
          >
            <div className="profile-avatar">{initials(userName)}</div>
            <span>
              <strong>{userName}</strong>
              <small>{authUser.role} · Log out</small>
            </span>
            <span className="more">↪</span>
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
            <div className="top-avatar">{initials(userName)}</div>
          </div>
        </header>

        <div className="content">
          {error && (
            <div className="error-banner">
              Workspace data unavailable: {error}. Start the server with{" "}
              <code>cd Server && npm run dev</code>.
            </div>
          )}

          {page === "admin" && (
            <AdminPage
              rates={rates}
              shipments={shipments}
              refresh={refresh}
              onToast={setToast}
            />
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
                    {greetingText}, {firstName} <span className="wave">✳</span>
                  </h1>
                  <p className="subtitle">
                    Here’s what’s happening across your ocean freight
                    operations.
                  </p>
                </div>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => goToPage("rates")}
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
                      onClick={() => goToPage("shipments")}
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
                      onClick={() => goToPage("rates")}
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
                    onClick={() => goToPage("rates")}
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
                    onClick={() => goToPage("inbox")}
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
                      goToPage("inbox");
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
                {authUser.role === "Admin" && (
                  <label className="button button-outline file-action">
                    ↑ <span>Import CSV</span>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(e) => {
                        importRates(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
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
                        <tr
                          key={r.id}
                          className={i === 0 ? "cheapest-row" : ""}
                        >
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
                              <strong>
                                {r.carrier}
                                {i === 0 && (
                                  <span className="cheapest-tag">CHEAPEST</span>
                                )}
                              </strong>
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
                  onClick={() => setShipmentForm((v) => !v)}
                >
                  + <span>Add shipment</span>
                </button>
              </div>

              {shipmentForm && (
                <form className="panel data-form" onSubmit={createShipment}>
                  <input
                    name="shipment_id"
                    placeholder="Shipment ID"
                    required
                  />
                  <input name="carrier" placeholder="Carrier" required />
                  <input
                    name="origin_port"
                    placeholder="Origin port"
                    required
                  />
                  <input
                    name="destination_port"
                    placeholder="Destination port"
                    required
                  />
                  <select name="container_type" required>
                    <option value="20ft">20ft</option>
                    <option value="40ft">40ft</option>
                  </select>
                  <label>
                    Departure
                    <input name="departure_date" type="date" required />
                  </label>
                  <label>
                    Expected arrival
                    <input name="expected_arrival" type="date" required />
                  </label>
                  <button className="button button-primary" type="submit">
                    Save shipment
                  </button>
                </form>
              )}

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
                      {moneyInCurrency(
                        flagged.reduce((a, b) => a + b.variance, 0) *
                          (invoiceCurrency === "INR" && usdToInr
                            ? usdToInr
                            : 1),
                        invoiceCurrency,
                      )}
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
                <div className="invoice-entry">
                  <strong>Check an invoice</strong>
                  <label className="invoice-currency-picker">
                    Display currency
                    <select
                      aria-label="Invoice display currency"
                      value={invoiceCurrency}
                      onChange={(e) => setInvoiceCurrency(e.target.value)}
                    >
                      <option value="USD">USD · US Dollar</option>
                      <option value="INR" disabled={!usdToInr}>
                        INR · Indian Rupee
                      </option>
                    </select>
                  </label>
                  <select
                    aria-label="Shipment for invoice"
                    value={invoiceForm.shipment_id}
                    onChange={(e) =>
                      setInvoiceForm({
                        ...invoiceForm,
                        shipment_id: e.target.value,
                      })
                    }
                  >
                    <option value="">Select shipment</option>
                    {shipments.map((s) => (
                      <option key={s.shipment_id} value={s.shipment_id}>
                        {s.shipment_id} · {s.carrier}
                      </option>
                    ))}
                  </select>
                  <input
                    aria-label={`Invoice amount in ${invoiceCurrency}`}
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder={`Invoice amount (${invoiceCurrency})`}
                    value={invoiceForm.amount}
                    onChange={(e) =>
                      setInvoiceForm({ ...invoiceForm, amount: e.target.value })
                    }
                  />
                  <button
                    className="button button-primary"
                    type="button"
                    disabled={
                      !invoiceForm.shipment_id ||
                      !invoiceForm.amount ||
                      (invoiceCurrency === "INR" && !usdToInr)
                    }
                    onClick={() =>
                      saveInvoice(
                        invoiceForm.shipment_id,
                        invoiceCurrency === "INR"
                          ? Number(invoiceForm.amount) / usdToInr
                          : invoiceForm.amount,
                      )
                    }
                  >
                    Check invoice
                  </button>
                  <label className="button button-outline file-action">
                    ↑ <span>Upload CSV</span>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(e) => {
                        importInvoices(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <div className="invoice-rate-note" role="status">
                  {usdToInr
                    ? `Latest reference rate: USD 1 = ${moneyInCurrency(usdToInr, "INR")}${exchangeRateDate ? ` · ${exchangeRateDate}` : ""}`
                    : exchangeRateError ||
                      "Loading latest USD/INR reference rate…"}
                  {invoiceCurrency === "INR" && (
                    <span>
                      {" "}
                      · CSV invoice amounts are still entered in USD.
                    </span>
                  )}
                </div>
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
                            {moneyInCurrency(
                              i.contract_rate *
                                (invoiceCurrency === "INR" && usdToInr
                                  ? usdToInr
                                  : 1),
                              invoiceCurrency,
                            )}
                          </td>
                          <td data-label="INVOICED">
                            <strong>
                              {moneyInCurrency(
                                i.invoice_amount_usd *
                                  (invoiceCurrency === "INR" && usdToInr
                                    ? usdToInr
                                    : 1),
                                invoiceCurrency,
                              )}
                            </strong>
                          </td>
                          <td
                            data-label="VARIANCE"
                            className={
                              i.flagged ? "variance-positive" : "variance-clear"
                            }
                          >
                            {i.variance > 0 ? "+" : ""}
                            {moneyInCurrency(
                              i.variance *
                                (invoiceCurrency === "INR" && usdToInr
                                  ? usdToInr
                                  : 1),
                              invoiceCurrency,
                            )}
                          </td>
                          <td data-label="RESULT">
                            <Badge>
                              {i.flagged ? "Overcharged" : "Correct"}
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
                  <i />{" "}
                  {mailConfigured ? "SMTP configured" : "SMTP not configured"}
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
                    <label className="text-button email-file-action">
                      Upload .txt{" "}
                      <input
                        type="file"
                        accept=".txt,text/plain"
                        onChange={(e) => {
                          loadEmailFile(e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                    </label>
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

              <section className="panel email-sender" id="send-update-email">
                <div className="panel-header">
                  <div>
                    <h2>Send an email</h2>
                    <p>
                      Send through the SMTP account configured on the server.
                    </p>
                  </div>
                </div>
                <form className="send-mail-form" onSubmit={sendMail}>
                  <input
                    type="email"
                    required
                    placeholder="Recipient email"
                    aria-label="Recipient email"
                    value={mailDraft.to}
                    onChange={(e) =>
                      setMailDraft({ ...mailDraft, to: e.target.value })
                    }
                  />
                  <input
                    required
                    maxLength="180"
                    placeholder="Subject"
                    aria-label="Email subject"
                    value={mailDraft.subject}
                    onChange={(e) =>
                      setMailDraft({ ...mailDraft, subject: e.target.value })
                    }
                  />
                  <textarea
                    required
                    rows="4"
                    placeholder="Write your message…"
                    aria-label="Email message"
                    value={mailDraft.text}
                    onChange={(e) =>
                      setMailDraft({ ...mailDraft, text: e.target.value })
                    }
                  />
                  <button
                    className="button button-primary"
                    type="submit"
                    disabled={sendingMail}
                  >
                    {sendingMail ? "Sending…" : "Send email"}
                  </button>
                </form>
              </section>

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
                    <div className="result-actions">
                      <button
                        type="button"
                        className="button button-outline"
                        disabled={
                          !parsed.results.some(
                            (item) => item.status === "Updated",
                          )
                        }
                        onClick={prepareUpdateEmail}
                      >
                        Prepare update email
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => setParsed(null)}
                      >
                        Clear
                      </button>
                    </div>
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
