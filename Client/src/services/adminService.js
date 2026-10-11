import { apiRequest } from "./api.js";

export function saveCarrierRate(values) {
  return apiRequest("/admin/rates", {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export async function importCarrierRates(file) {
  const csv = await file.text();
  return apiRequest("/rates/import", {
    method: "POST",
    body: JSON.stringify({ csv }),
  });
}

export function saveShipmentStatus(shipmentId, status) {
  return apiRequest(`/admin/shipments/${encodeURIComponent(shipmentId)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
