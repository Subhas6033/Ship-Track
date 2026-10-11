import { useState } from "react";
import "./LoginPage.css";

function LoginPage({ onAuthenticate, onBack }) {
  const [mode, setMode] = useState("user");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const endpoint = mode === "register" ? "register" : mode === "admin-register" ? "admin-register" : "login";
      await onAuthenticate(endpoint, {
        name,
        email,
        password,
        adminKey,
        role: mode === "admin" ? "Admin" : "User",
      });
    } catch (err) {
      setError(err.message || "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  const registering = mode === "register" || mode === "admin-register";
  const adminLogin = mode === "admin";
  const adminRegister = mode === "admin-register";

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand">
          <div className="auth-brand-mark" aria-hidden="true">⌁</div>
          <div><strong>Meridian</strong><small>OCEAN INTELLIGENCE</small></div>
        </div>
        {onBack && <button className="auth-back" type="button" onClick={onBack}>← Back to home</button>}
        {!registering && (
          <div className="auth-mode-switch" role="tablist" aria-label="Choose sign in type">
            <button type="button" role="tab" aria-selected={!adminLogin} className={!adminLogin ? "selected" : ""} onClick={() => { setError(""); setMode("user"); }}>User login</button>
            <button type="button" role="tab" aria-selected={adminLogin} className={adminLogin ? "selected" : ""} onClick={() => { setError(""); setMode("admin"); }}>Admin login</button>
          </div>
        )}
        <div className="auth-eyebrow">NORTHSTAR TRADING WORKSPACE</div>
        <h1 id="auth-title">{registering ? (adminRegister ? "Admin registration" : "Create your account") : adminLogin ? "Admin sign in" : "Welcome back"}</h1>
        <p className="auth-subtitle">
          {registering
            ? adminRegister ? "Register an administrator account with your workspace key." : "Create a User account to access freight operations."
            : adminLogin
              ? "Sign in with your provisioned administrator account."
              : "Sign in to continue to your freight operations workspace."}
        </p>

        <form className="auth-form" onSubmit={submit}>
          {registering && <>
            <label htmlFor="auth-name">Full name</label>
            <input
              id="auth-name"
              type="text"
              autoComplete="name"
              minLength={2}
              maxLength={80}
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
            />
          </>}
          {adminRegister && <>
            <label htmlFor="auth-admin-key">Admin registration key</label>
            <input id="auth-admin-key" type="password" autoComplete="off" required value={adminKey} onChange={(event) => setAdminKey(event.target.value)} placeholder="Enter the workspace key" />
          </>}
          <label htmlFor="auth-email">Email address</label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
          />
          <label htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            type="password"
            autoComplete={registering ? "new-password" : "current-password"}
            minLength={registering ? 8 : undefined}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={registering ? "At least 8 characters" : "Enter your password"}
          />
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? "Please wait…" : registering ? adminRegister ? "Register Admin account" : "Create User account" : adminLogin ? "Sign in as Admin" : "Sign in"}
          </button>
        </form>

        {!adminLogin && !adminRegister && (
          <div className="auth-switch">
            {registering ? "Already have an account?" : "New to Meridian?"}{" "}
            <button type="button" onClick={() => { setError(""); setMode(registering ? "user" : "register"); }}>
              {registering ? "Sign in" : "Create a User account"}
            </button>
          </div>
        )}
        {adminLogin && <div className="auth-switch">Need an admin account? <button type="button" onClick={() => { setError(""); setMode("admin-register"); }}>Register with key</button></div>}
        {adminRegister && <div className="auth-switch">Already registered? <button type="button" onClick={() => { setError(""); setMode("admin"); }}>Admin sign in</button></div>}
        {(adminLogin || adminRegister) && <p className="auth-role-note">Admin registration requires the special key configured by your workspace administrator.</p>}
      </section>
      <div className="auth-footer">© 2026 Meridian Freight Intelligence</div>
    </main>
  );
}

export default LoginPage;
