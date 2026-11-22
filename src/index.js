import marketRents from "./market-rents.json" with { type: "json" };
import { parseListing } from "./parser.js";
import { suggestRent } from "./rents.js";
import { validateListingUrl } from "./url.js";

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Referer: "https://www.propertybrokers.co.nz/",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "en-NZ,en;q=0.9",
};

function jsonResponse(body, status, extraHeaders) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": status === 200 ? "public, max-age=3600" : "no-store",
  };
  if (extraHeaders) Object.assign(headers, extraHeaders);
  return new Response(JSON.stringify(body), { status, headers });
}

function errorResponse(status, error) {
  return jsonResponse({ ok: false, error }, status);
}

function cacheRequestFor(listingUrl) {
  const key = new URL("https://yield-calculator.internal/api/import");
  key.searchParams.set("listing", listingUrl);
  return new Request(key.toString(), { method: "GET" });
}

async function readListing(listingUrl) {
  let response;
  try {
    response = await fetch(listingUrl, {
      method: "GET",
      redirect: "follow",
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    return { ok: false, status: 502, error: "The listing page could not be loaded." };
  }
  if (!response.ok) {
    return { ok: false, status: 502, error: "The listing page could not be loaded." };
  }
  const finalCheck = validateListingUrl(response.url || listingUrl);
  if (!finalCheck.ok) {
    return { ok: false, status: 502, error: "The listing page could not be loaded." };
  }
  const html = await response.text();
  if (html.length > 2000000) {
    return { ok: false, status: 422, error: "That page could not be read as a Property Brokers listing." };
  }
  const parsed = parseListing(html);
  if (!parsed.ok) return { ok: false, status: 422, error: parsed.error };
  const listing = parsed.listing;
  listing.url = finalCheck.url;
  listing.rent = suggestRent(listing, marketRents);
  return { ok: true, listing };
}

async function handleImport(request, ctx) {
  if (request.method !== "GET") {
    return errorResponse(405, "Use a GET request with the listing link.");
  }
  const incoming = new URL(request.url);
  const check = validateListingUrl(incoming.searchParams.get("url"));
  if (!check.ok) return errorResponse(check.status, check.error);

  const cache = typeof caches === "undefined" ? null : caches.default;
  const cacheKey = cacheRequestFor(check.url);
  if (cache) {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  }

  const result = await readListing(check.url);
  if (!result.ok) return errorResponse(result.status, result.error);

  const body = JSON.stringify({ ok: true, listing: result.listing });
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
  };
  if (cache && ctx) {
    ctx.waitUntil(cache.put(cacheKey, new Response(body, {
      status: 200,
      headers: { ...headers, "X-Import-Cache": "hit" },
    })));
  }
  return new Response(body, { status: 200, headers: { ...headers, "X-Import-Cache": "miss" } });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/import") return handleImport(request, ctx);
    return env.ASSETS.fetch(request);
  },
};
