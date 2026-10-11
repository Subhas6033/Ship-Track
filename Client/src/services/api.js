const API = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

export async function apiRequest(path, options = {}) {
  const url = `${API}${path}`;
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(localStorage.getItem("meridian_session")
          ? { Authorization: `Bearer ${localStorage.getItem("meridian_session")}` }
          : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error(`Could not reach the API at ${url}. Check that the server is running and VITE_API_URL is correct.`);
  }
  let data = null;
  try { data = await response.json(); } catch { /* non-JSON response */ }
  if (!response.ok) throw new Error(data?.error || "Request failed");
  return data;
}
