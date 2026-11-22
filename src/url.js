const ALLOWED_HOSTS = new Set([
  "propertybrokers.co.nz",
  "www.propertybrokers.co.nz",
  "pb.co.nz",
  "www.pb.co.nz",
]);

export function validateListingUrl(raw) {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) {
    return { ok: false, status: 400, error: "Paste a Property Brokers listing link." };
  }
  let parsed;
  try {
    parsed = new URL(text);
  } catch (error) {
    return { ok: false, status: 400, error: "That link could not be read. Paste a full Property Brokers listing link." };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false, status: 400, error: "Only a secure https link can be imported." };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, status: 400, error: "Only Property Brokers listing links can be imported." };
  }
  if (parsed.port && parsed.port !== "443") {
    return { ok: false, status: 400, error: "Only Property Brokers listing links can be imported." };
  }
  const host = parsed.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) {
    return { ok: false, status: 400, error: "Only Property Brokers listing links can be imported." };
  }
  const path = parsed.pathname;
  if (!/^\/residential\/sale\/[^/?#].+/i.test(path)) {
    return { ok: false, status: 400, error: "That link is not a residential for sale listing." };
  }
  const url = "https://" + host + path.replace(/\/+$/, "");
  return { ok: true, url };
}
