const NAMED_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(text) {
  return String(text)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeChar(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeChar(Number(dec)))
    .replace(/&([a-z]+);/gi, (all, name) => {
      const named = NAMED_ENTITIES[name.toLowerCase()];
      return named === undefined ? all : named;
    });
}

function safeChar(code) {
  if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return "";
  return String.fromCodePoint(code);
}

function stripTags(text) {
  return String(text).replace(/<[^>]+>/g, " ");
}

function cleanText(text) {
  return decodeEntities(stripTags(text)).replace(/\s+/g, " ").trim();
}

export function parseMoneyToCents(text) {
  if (!text) return null;
  const match = String(text).replace(/,/g, "").match(/(\d+)(?:\.(\d{1,2}))?/);
  if (!match) return null;
  const dollars = Number(match[1]);
  if (!Number.isFinite(dollars)) return null;
  const fraction = (match[2] || "").padEnd(2, "0").slice(0, 2);
  return dollars * 100 + Number(fraction);
}

export function centsToInput(cents) {
  if (cents === null || cents === undefined) return "";
  const absolute = Math.abs(cents);
  const dollars = Math.floor(absolute / 100);
  const remainder = absolute % 100;
  const text = remainder === 0 ? String(dollars) : dollars + "." + String(remainder).padStart(2, "0");
  return cents < 0 ? "-" + text : text;
}

export function centsToNumber(cents) {
  if (cents === null || cents === undefined) return null;
  return Number((cents / 100).toFixed(2));
}

function parseAreaSqm(text) {
  if (!text) return null;
  const compact = text.toLowerCase().replace(/\s+/g, "");
  const match = compact.match(/^([\d,.]+)(m2|sqm|ha)$/);
  if (!match) return null;
  const amount = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(amount)) return null;
  if (match[2] === "ha") return Math.round(amount * 10000);
  return Math.round(amount);
}

function namedMethod(text) {
  const lower = text.toLowerCase();
  if (lower.includes("tender")) return "Tender";
  if (lower.includes("auction")) return "Auction";
  if (lower.includes("deadline")) return "Deadline";
  if (lower.includes("negotiat")) return "By negotiation";
  return null;
}

function withheld(method, label) {
  return {
    saleMethod: method,
    priceCents: null,
    pricePlus: false,
    priceLabel: label,
    pricePrompt: "No asking price shown (" + method + "). Enter the price you would pay.",
  };
}

export function interpretVisiblePrice(raw) {
  const text = cleanText(raw);
  const method = namedMethod(text);
  if (method) return withheld(method, text || method);
  const buyers = text.match(/buyers\s+\$(\d[\d,]*)\s*(\+)?/i);
  if (buyers) {
    return {
      saleMethod: text,
      priceCents: parseMoneyToCents(buyers[1]),
      pricePlus: Boolean(buyers[2]) || text.includes("+"),
      priceLabel: text,
      pricePrompt: null,
    };
  }
  const dollars = text.match(/\$(\d[\d,]*)/);
  if (dollars) {
    return {
      saleMethod: "Asking price",
      priceCents: parseMoneyToCents(dollars[1]),
      pricePlus: text.includes("+"),
      priceLabel: text,
      pricePrompt: null,
    };
  }
  const name = text && text.length <= 40 ? text : "Not shown";
  return withheld(name, text || "Not shown");
}

function visiblePriceText(html) {
  const heading = html.match(/id="listingPageTopHeading"[\s\S]*?<h5[^>]*>([\s\S]*?)<\/h5>/i);
  if (heading) return heading[1];
  const factsAt = html.search(/class="[^"]*listing-facts/i);
  if (factsAt >= 0) {
    const sidebar = html.slice(factsAt, factsAt + 6000).match(/<h5[^>]*>([\s\S]*?)<\/h5>/i);
    if (sidebar) return sidebar[1];
  }
  return "";
}

function readSchema(html) {
  const match = html.match(/<script[^>]*type="application\/ld(?:\+|&#x2B;)json"[^>]*>([\s\S]*?)<\/script>/i);
  if (!match) return null;
  let data;
  try {
    data = JSON.parse(match[1]);
  } catch (error) {
    return null;
  }
  const list = Array.isArray(data) ? data : [data];
  const residence = list.find((item) => item && item["@type"] === "SingleFamilyResidence") || list.find((item) => item && item.address);
  if (!residence) return null;
  const address = residence.address && typeof residence.address === "object" ? residence.address : {};
  const floor = residence.floorSize && typeof residence.floorSize === "object" ? residence.floorSize : {};
  return {
    name: typeof residence.name === "string" ? residence.name : "",
    suburb: typeof address.addressLocality === "string" ? address.addressLocality : "",
    town: typeof address.addressRegion === "string" ? address.addressRegion : "",
    street: typeof address.streetAddress === "string" ? address.streetAddress : "",
    bedrooms: numberOrNull(residence.numberOfBedrooms),
    bathrooms: numberOrNull(residence.numberOfBathroomsTotal),
    floorSqm: numberOrNull(floor.value),
  };
}

function numberOrNull(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function readFacts(html) {
  const table = html.match(/<table[^>]*class="[^"]*listing-facts[^"]*"[\s\S]*?<\/table>/i);
  const facts = {};
  if (!table) return facts;
  const rows = table[0].matchAll(/<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi);
  for (const row of rows) {
    facts[cleanText(row[1]).toLowerCase()] = cleanText(row[2]);
  }
  return facts;
}

function firstCount(html, alt) {
  const match = html.match(new RegExp(">(\\d+)<\\/p>\\s*<img[^>]*alt=\"" + alt + "\"", "i"));
  return match ? Number(match[1]) : null;
}

function splitAddress(address) {
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 3) {
    return { suburb: parts[parts.length - 2], town: parts[parts.length - 1] };
  }
  if (parts.length === 2) return { suburb: "", town: parts[1] };
  return { suburb: "", town: "" };
}

function areaField(raw, fallbackSqm) {
  const text = raw || "";
  const sqm = parseAreaSqm(text);
  return {
    text: text || (fallbackSqm ? fallbackSqm + " m2" : ""),
    sqm: sqm === null ? fallbackSqm : sqm,
  };
}

export function parseListing(html) {
  if (typeof html !== "string" || html.length < 1000) {
    return { ok: false, error: "That page could not be read as a Property Brokers listing." };
  }
  const schema = readSchema(html) || {};
  const facts = readFacts(html);
  const heading = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const address = cleanText(heading ? heading[1] : "") || cleanText(schema.name || "");
  if (!address || !html.includes("listing-facts")) {
    return { ok: false, error: "That page could not be read as a Property Brokers listing." };
  }
  const fromAddress = splitAddress(address);
  const price = interpretVisiblePrice(visiblePriceText(html));
  const floor = areaField(facts["floor area"], schema.floorSqm);
  const land = areaField(facts["land area"], null);
  const districtCents = parseMoneyToCents(facts["district rates"]);
  const regionalCents = parseMoneyToCents(facts["regional rates"]);
  const councilCents = districtCents === null && regionalCents === null ? null : (districtCents || 0) + (regionalCents || 0);
  const bedrooms = firstCount(html, "Bedrooms");
  const bathrooms = firstCount(html, "Bathrooms");
  return {
    ok: true,
    listing: {
      address,
      suburb: schema.suburb || fromAddress.suburb,
      town: schema.town || fromAddress.town,
      bedrooms: bedrooms === null ? schema.bedrooms : bedrooms,
      bathrooms: bathrooms === null ? schema.bathrooms : bathrooms,
      floorAreaSqm: floor.sqm,
      floorAreaText: floor.text,
      landAreaSqm: land.sqm,
      landAreaText: land.text,
      districtRatesCents: districtCents,
      regionalRatesCents: regionalCents,
      councilRatesCents: councilCents,
      districtRates: centsToNumber(districtCents),
      regionalRates: centsToNumber(regionalCents),
      councilRates: centsToNumber(councilCents),
      councilRatesInput: centsToInput(councilCents),
      lvCents: parseMoneyToCents(facts.lv),
      rvCents: parseMoneyToCents(facts.rv),
      lv: centsToNumber(parseMoneyToCents(facts.lv)),
      rv: centsToNumber(parseMoneyToCents(facts.rv)),
      saleMethod: price.saleMethod,
      priceCents: price.priceCents,
      price: centsToNumber(price.priceCents),
      priceInput: centsToInput(price.priceCents),
      pricePlus: price.pricePlus,
      priceLabel: price.priceLabel,
      pricePrompt: price.pricePrompt,
    },
  };
}
