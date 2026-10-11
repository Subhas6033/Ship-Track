import { useState } from "react";
import { importCarrierRates, saveCarrierRate, saveShipmentStatus } from "../services/adminService.js";

const money = (value) => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", maximumFractionDigits: 0,
}).format(value || 0);

function Badge({ children }) {
  const key = String(children).toLowerCase().replaceAll(" ", "-");
  return <span className={`badge badge-${key}`}>{children}</span>;
}

export default function AdminPage({ rates, shipments, refresh, onToast }) {
  const [saving, setSaving] = useState(false);

  async function submitRate(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setSaving(true);
    try {
      await saveCarrierRate(values);
      form.reset();
      await refresh();
      onToast("Rate saved");
    } catch (error) { onToast(error.message); }
    finally { setSaving(false); }
  }

  async function uploadRates(file) {
    if (!file) return;
    try {
      const result = await importCarrierRates(file);
      await refresh();
      onToast(`${result.imported} rates imported`);
    } catch (error) { onToast(error.message); }
  }

  async function updateStatus(shipmentId, status) {
    try {
      await saveShipmentStatus(shipmentId, status);
      await refresh();
      onToast(`${shipmentId} updated to ${status}`);
    } catch (error) { onToast(error.message); }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ADMINISTRATION <span className="eyebrow-dot" /> DATA MANAGEMENT</div>
          <h1>Update workspace data</h1>
          <p className="subtitle">Maintain carrier rates and shipment status stored in MongoDB.</p>
        </div>
      </div>
      <section className="panel admin-panel">
        <div className="panel-header">
          <div><h2>Carrier rates</h2><p>Add or replace a contracted rate. Matching route and carrier rows are updated.</p></div>
          <label className="text-button admin-upload">
            Import CSV <input type="file" accept=".csv,text/csv" hidden onChange={(event) => { uploadRates(event.target.files?.[0]); event.target.value = ""; }} />
          </label>
        </div>
        <form onSubmit={submitRate} className="admin-data-form">
          <label>Carrier<input name="carrier" required placeholder="Carrier name" /></label>
          <label>Origin port<input name="origin_port" required placeholder="Nhava Sheva" /></label>
          <label>Destination port<input name="destination_port" required placeholder="Los Angeles" /></label>
          <label>Container<select name="container_type" required defaultValue="20ft"><option>20ft</option><option>40ft</option></select></label>
          <label>Rate (USD)<input name="rate_usd" type="number" min="1" step="0.01" required /></label>
          <label>Transit days<input name="transit_days" type="number" min="1" step="1" required /></label>
          <button className="button button-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save rate"}</button>
        </form>
        <div className="table-wrap admin-table">
          <table><thead><tr><th>Carrier</th><th>Route</th><th>Container</th><th>Rate</th><th>Transit</th></tr></thead>
            <tbody>{rates.map((rate) => <tr key={rate._id || rate.id}><td><strong>{rate.carrier}</strong></td><td>{rate.origin_port} → {rate.destination_port}</td><td>{rate.container_type}</td><td>{money(rate.rate_usd)}</td><td>{rate.transit_days} days</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <section className="panel admin-panel">
        <div className="panel-header"><div><h2>Shipment status</h2><p>Set the latest status for any shipment in the tracker.</p></div></div>
        <div className="table-wrap">
          <table><thead><tr><th>Shipment</th><th>Carrier / route</th><th>Expected arrival</th><th>Current status</th><th>Update status</th></tr></thead>
            <tbody>{shipments.map((shipment) => <tr key={shipment.shipment_id}><td><strong>{shipment.shipment_id}</strong></td><td>{shipment.carrier}<small className="table-sub">{shipment.origin_port} → {shipment.destination_port}</small></td><td>{shipment.expected_arrival}</td><td><Badge>{shipment.status}</Badge></td><td><select className="admin-status-select" aria-label={`Update ${shipment.shipment_id} status`} value={shipment.status} onChange={(event) => updateStatus(shipment.shipment_id, event.target.value)}><option>In Transit</option><option>Delivered</option><option>Delayed</option></select></td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </>
  );
}
