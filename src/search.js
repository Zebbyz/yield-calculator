// Residential sale type and town ids from Property Brokers search taxonomy.
// The search request uses these ids. Results are checked again by town name.
export const RESIDENTIAL_SALE_TYPE = "44wnmtfwd2njjt31g70prxcdc3";

export const SEARCH_REGION_IDS = [
  "4cqgphjk1cq17yrgjjjk1wqkn5",
  "43xg2tewgd7khrm0ksd6b6a65n",
  "4ya5wf41bc3gsvevgw2xhnj7nv",
  "4kktxe4ar4t8x2y4bejsfmbg4s",
  "4etng9n43wx2s71d1j6kkg9am2",
  "4yscygffcb50vr4m84r3cgqqms",
];

export const ALLOWED_TOWNS = [
  "whanganui",
  "new plymouth",
  "marton",
  "bulls",
  "feilding",
  "palmerston north",
];

export const SEARCH_CACHE_SECONDS = 900;
export const SEARCH_RESULT_LIMIT = 10;

export function normaliseQuery(raw) {
  return String(raw || "").replace(/\s+/g, " ").trim().toLowerCase();
}

export function searchParameters(query) {
  return {
    fulltext: query,
    take: SEARCH_RESULT_LIMIT,
    propertyTypes: [RESIDENTIAL_SALE_TYPE],
    regions: SEARCH_REGION_IDS,
  };
}

export function upstreamSearchUrl(query) {
  const url = new URL("https://www.propertybrokers.co.nz/refinedsearch/ElasticListingQuery");
  url.searchParams.set("returnJson", "true");
  url.searchParams.set("Parameters", JSON.stringify(searchParameters(query)));
  return url;
}

function fieldText(node) {
  if (!node || typeof node !== "object") return "";
  return typeof node.Text === "string" ? node.Text.trim() : "";
}

export function isAllowedPlace(suburb, town) {
  const names = [suburb, town].map((value) => String(value || "").trim().toLowerCase());
  return names.some((name) => ALLOWED_TOWNS.indexOf(name) !== -1);
}

export function toSearchResult(item) {
  if (!item || typeof item !== "object") return null;
  const listing = item.Listing && typeof item.Listing === "object" ? item.Listing : {};
  const confidential = listing.ConfidentialAddress && listing.ConfidentialAddress.Value === true;
  if (confidential) return null;
  const path = item.AutoroutePart && item.AutoroutePart.Path;
  if (typeof path !== "string" || !/^residential\/sale\/[^/].+/i.test(path)) return null;
  const addressPart = item.AddressPart && typeof item.AddressPart === "object" ? item.AddressPart : {};
  const address = fieldText(addressPart.Address);
  const suburb = fieldText(addressPart.Suburb);
  const town = fieldText(addressPart.City);
  if (!address || !isAllowedPlace(suburb, town)) return null;
  const part = item.ListingPart && typeof item.ListingPart === "object" ? item.ListingPart : {};
  const visible = typeof part.PriceDisplay === "string" ? part.PriceDisplay.trim() : "";
  return {
    address,
    suburb,
    town,
    priceLabel: visible || "Price not shown",
    url: "https://www.propertybrokers.co.nz/" + path.replace(/^\/+/, ""),
  };
}

export function parseSearchPayload(data) {
  const items = data && data.searchResults && data.searchResults.contentItems;
  if (!Array.isArray(items)) return [];
  const results = [];
  for (let i = 0; i < items.length; i += 1) {
    const result = toSearchResult(items[i]);
    if (!result) continue;
    results.push(result);
    if (results.length === SEARCH_RESULT_LIMIT) break;
  }
  return results;
}
