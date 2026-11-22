export function matchAuthority(listing, data) {
  const haystack = " " + [listing.address, listing.suburb, listing.town].filter(Boolean).join(" ").toLowerCase().replace(/[^a-z0-9]+/g, " ") + " ";
  let best = null;
  for (const authority of data.authorities) {
    for (const town of authority.towns) {
      const needle = " " + town.toLowerCase() + " ";
      if (haystack.includes(needle) && (!best || town.length > best.town.length)) {
        best = { authority, town };
      }
    }
  }
  return best ? best.authority : null;
}

export function suggestRent(listing, data) {
  const authority = matchAuthority(listing, data);
  if (!authority || listing.bedrooms === null || listing.bedrooms === undefined) {
    return {
      available: false,
      label: "",
      note: "No market rent estimate for this town.",
    };
  }
  const period = data.periodLabel;
  return {
    available: true,
    authority: authority.name,
    period,
    lower: authority.lower,
    median: authority.median,
    upper: authority.upper,
    bedrooms: listing.bedrooms,
    bedroomSplit: Boolean(data.bedroomSplit),
    label: "Market rent estimate from MBIE bond data (" + period + "), not an appraisal",
    note: data.bedroomSplit
      ? "Lower quartile, median and upper quartile weekly rent for " + listing.bedrooms + " bedrooms in " + authority.name + "."
      : "Lower quartile $" + authority.lower + ", median $" + authority.median + " and upper quartile $" + authority.upper + " a week for all dwellings in " + authority.name + ". The monthly file is not split by bedroom, so the same figures are used for this " + listing.bedrooms + " bedroom home.",
    sourcePage: data.sourcePage,
    sourceUrl: data.sourceUrl,
  };
}
