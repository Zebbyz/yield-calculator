import assert from "node:assert/strict";
import test from "node:test";
import {
  ALLOWED_TOWNS,
  normaliseQuery,
  parseSearchPayload,
  searchParameters,
  upstreamSearchUrl,
} from "./search.js";

function listing(overrides) {
  const item = {
    Listing: { ConfidentialAddress: { Value: false }, SearchPrice: { Value: 369000 } },
    ListingPart: { PriceDisplay: "Auction", PriceNumeric: 369000, SoldDetailsPrice: 369000 },
    AddressPart: {
      Address: { Text: "40 Bell Street, Whanganui Central, Whanganui" },
      Suburb: { Text: "Whanganui Central" },
      City: { Text: "Whanganui" },
    },
    AutoroutePart: { Path: "residential/sale/40-bell-street-whanganui-central-whanganui" },
  };
  return Object.assign(item, overrides);
}

test("query is trimmed and matched without case", () => {
  assert.equal(normaliseQuery("  Ingestre   Street "), "ingestre street");
  assert.equal(normaliseQuery("Talbot"), "talbot");
});

test("upstream search is one residential sale request for the allowed towns", () => {
  const url = upstreamSearchUrl("156 bell");
  assert.equal(url.origin + url.pathname, "https://www.propertybrokers.co.nz/refinedsearch/ElasticListingQuery");
  assert.equal(url.searchParams.get("returnJson"), "true");
  const parameters = JSON.parse(url.searchParams.get("Parameters"));
  assert.deepEqual(parameters, searchParameters("156 bell"));
  assert.equal(parameters.take, 10);
  assert.deepEqual(parameters.propertyTypes, ["44wnmtfwd2njjt31g70prxcdc3"]);
  assert.equal(parameters.regions.length, ALLOWED_TOWNS.length);
  assert.equal(parameters.fulltext, "156 bell");
});

test("visible price label is kept and the hidden price is not returned", () => {
  const results = parseSearchPayload({ searchResults: { contentItems: [listing()] } });
  assert.equal(results.length, 1);
  assert.equal(results[0].priceLabel, "Auction");
  assert.equal(results[0].suburb, "Whanganui Central");
  assert.equal(results[0].town, "Whanganui");
  assert.equal(results[0].url, "https://www.propertybrokers.co.nz/residential/sale/40-bell-street-whanganui-central-whanganui");
  assert.equal(JSON.stringify(results).includes("369000"), false);
});

test("rentals, sold paths, other towns, and confidential addresses are dropped", () => {
  const results = parseSearchPayload({
    searchResults: {
      contentItems: [
        listing({ AutoroutePart: { Path: "rental/house/70-talbot-street-whanganui-east-whanganui" } }),
        listing({ AutoroutePart: { Path: "residential/sold/43b-ingestre-street-whanganui-whanganui" } }),
        listing({
          AddressPart: {
            Address: { Text: "12 Halswell Road, Halswell, Christchurch" },
            Suburb: { Text: "Halswell" },
            City: { Text: "Christchurch" },
          },
        }),
        listing({ Listing: { ConfidentialAddress: { Value: true }, SearchPrice: { Value: 1 } } }),
        listing({
          ListingPart: { PriceDisplay: "Buyers $465,000+" },
          AddressPart: {
            Address: { Text: "19 Halswell Crescent, Westbrook, Palmerston North" },
            Suburb: { Text: "Westbrook" },
            City: { Text: "Palmerston North" },
          },
          AutoroutePart: { Path: "residential/sale/19-halswell-crescent-westbrook-palmerston-north" },
        }),
      ],
    },
  });
  assert.equal(results.length, 1);
  assert.equal(results[0].town, "Palmerston North");
  assert.equal(results[0].priceLabel, "Buyers $465,000+");
});

test("at most 10 results are returned", () => {
  const items = [];
  for (let i = 0; i < 15; i += 1) {
    items.push(listing({
      ListingPart: { PriceDisplay: "$" + (i + 1) },
      AddressPart: {
        Address: { Text: i + " Street, Feilding" },
        Suburb: { Text: "Feilding" },
        City: { Text: "Manawatu" },
      },
      AutoroutePart: { Path: "residential/sale/" + i + "-street-feilding" },
    }));
  }
  const results = parseSearchPayload({ searchResults: { contentItems: items } });
  assert.equal(results.length, 10);
  assert.equal(results[0].suburb, "Feilding");
});

test("a blank visible price does not fall back to a hidden number", () => {
  const results = parseSearchPayload({
    searchResults: {
      contentItems: [listing({ ListingPart: { PriceDisplay: "  ", PriceNumeric: 850000 } })],
    },
  });
  assert.equal(results[0].priceLabel, "Price not shown");
  assert.equal(JSON.stringify(results).includes("850000"), false);
});
