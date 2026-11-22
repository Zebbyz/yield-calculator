// Downloads the latest Tenancy Services monthly territorial authority CSV
// and writes src/market-rents.json. Rent figures are copied from that file.
// Town names are the places this calculator matches to each authority.

const SOURCE_PAGE = "https://www.tenancy.govt.nz/about-tenancy-services/data-and-statistics/rental-bond-data/";

const AREAS = [
  { name: "Whanganui District", towns: ["whanganui"] },
  { name: "Palmerston North City", towns: ["palmerston north"] },
  { name: "New Plymouth District", towns: ["new plymouth"] },
  { name: "Manawatu District", towns: ["feilding"] },
  { name: "Rangitikei District", towns: ["marton", "bulls"] },
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,text/csv,*/*",
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((item) => item.some((value) => value !== ""));
}

function numberFrom(value) {
  const cleaned = String(value).replace(/,/g, "").trim();
  if (!cleaned) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function periodLabel(timeFrame) {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(timeFrame);
  if (!match) throw new Error("Unexpected time frame: " + timeFrame);
  return MONTHS[Number(match[2]) - 1] + " " + match[1];
}

const pageResponse = await fetch(SOURCE_PAGE, { headers });
if (!pageResponse.ok) {
  throw new Error("Could not open the bond data page: " + pageResponse.status);
}
const pageHtml = await pageResponse.text();
const links = [...pageHtml.matchAll(/href="([^"]*detailed-monthly-tla-tenancy[^"]*\.csv[^"]*)"/gi)].map((match) => new URL(match[1], SOURCE_PAGE).toString());
if (!links.length) throw new Error("No monthly territorial authority CSV link was found.");

let chosen = null;
for (const link of links) {
  const fileResponse = await fetch(link, { headers });
  if (!fileResponse.ok) throw new Error("Could not download " + link + ": " + fileResponse.status);
  const csv = await fileResponse.text();
  const rows = parseCsv(csv);
  const header = rows.shift();
  const index = Object.fromEntries(header.map((name, position) => [name, position]));
  for (const key of ["Time Frame", "Location", "Median Rent", "Upper Quartile Rent", "Lower Quartile Rent", "Lodged Bonds", "Active Bonds"]) {
    if (index[key] === undefined) throw new Error("CSV is missing " + key + " in " + link);
  }
  const latest = new Map();
  for (const row of rows) {
    const location = row[index.Location];
    const timeFrame = row[index["Time Frame"]];
    const current = latest.get(location);
    if (!current || timeFrame > current.timeFrame) {
      latest.set(location, { timeFrame, row });
    }
  }
  const timeFrames = AREAS.map((area) => latest.get(area.name)?.timeFrame).filter(Boolean);
  if (timeFrames.length !== AREAS.length) continue;
  const period = timeFrames.sort().at(-1);
  if (!chosen || period > chosen.period) {
    chosen = { link, period, latest, index };
  }
}

if (!chosen) throw new Error("The monthly CSV files did not include every requested authority.");

const authorities = AREAS.map((area) => {
  const found = chosen.latest.get(area.name);
  const row = found.row;
  const lower = numberFrom(row[chosen.index["Lower Quartile Rent"]]);
  const median = numberFrom(row[chosen.index["Median Rent"]]);
  const upper = numberFrom(row[chosen.index["Upper Quartile Rent"]]);
  if (lower === null || median === null || upper === null) {
    throw new Error("Missing quartile for " + area.name);
  }
  return {
    name: area.name,
    towns: area.towns,
    timeFrame: found.timeFrame,
    lower,
    median,
    upper,
    lodgedBonds: numberFrom(row[chosen.index["Lodged Bonds"]]),
    activeBonds: numberFrom(row[chosen.index["Active Bonds"]]),
  };
});

const output = {
  sourceName: "MBIE Tenancy Services rental bond data",
  sourcePage: SOURCE_PAGE,
  sourceUrl: chosen.link,
  period: chosen.period.slice(0, 7),
  periodLabel: periodLabel(chosen.period),
  timeFrame: chosen.period,
  bedroomSplit: false,
  note: "The monthly territorial authority file reports one set of weekly rent quartiles for all dwellings. It is not split by bedroom. The same figures are used for every bedroom count. Town names are how a listing address is matched to an authority. They are not extra rent figures.",
  authorities,
};

const target = new URL("../src/market-rents.json", import.meta.url);
await import("node:fs/promises").then((fs) => fs.writeFile(target, JSON.stringify(output, null, 2) + "\n"));
console.log("Wrote " + target.pathname);
console.log(chosen.link);
console.log(output.periodLabel);
for (const area of authorities) {
  console.log(area.name, area.lower, area.median, area.upper);
}
