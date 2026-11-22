# Rental Yield Calculator

A public, single-page New Zealand property purchase and rental yield calculator. The figures you type stay in the browser. There is no account. Pasting a Property Brokers link sends that public link to the site so the listing page can be read.

Open the page, enter your own figures, and read low, mid and high rent results as you type. Use **Copy link with my numbers** to share a link that refills the same inputs. You can also paste a Property Brokers residential sale link and import the visible listing details.

## Files

- `public/index.html`: the page
- `public/styles.css`: layout and theme
- `public/calculator.js`: the calculations and money formatting
- `public/app.js`: the form, live results, listing import, and share link
- `public/favicon.svg`: the tab icon
- `src/index.js`: the Worker. It serves `GET /api/import` and passes every other request to the assets binding
- `src/parser.js`: reads a Property Brokers listing page
- `src/rents.js`: matches a listing town to the bundled bond data
- `src/url.js`: allows only https Property Brokers residential sale links
- `src/market-rents.json`: lower quartile, median and upper quartile weekly rents from the MBIE monthly CSV
- `scripts/build-market-rents.mjs`: downloads that CSV and rewrites `src/market-rents.json`
- `wrangler.jsonc`: Worker name `yield-calculator`, main script `src/index.js`, assets directory `./public`, assets binding `ASSETS`

## Preview locally

The import button needs the Worker, so run Wrangler:

```bash
npx wrangler dev
```

Opening `public/index.html` on its own still runs the calculator. The import request will fail until the Worker is running.

## Deploy

From the project root, with Wrangler logged in to Cloudflare:

```bash
npx wrangler deploy
```

That deploys the Worker and the static assets together. The Worker name is `yield-calculator`. Requests to `/api/*` run the Worker first. Every other path is served from `./public` through the `ASSETS` binding.

## How the figures are calculated

A year is 52 weeks. Money on the page is rounded to the nearest cent. Yields are rounded to two decimal places, half away from zero.

- Gross yield = weekly rent times 52, divided by the purchase price. Vacancy and costs are not deducted.
- Fixed annual costs = council rates + insurance + body corporate fees + water rates + maintenance and repairs + other annual costs.
- Vacancy allowance = weekly rent times weeks vacant.
- Rent collected = annual rent minus the vacancy allowance.
- Property management = your percentage times rent collected.
- Total operating costs = fixed annual costs + vacancy allowance + property management.
- Net operating income = annual rent minus total operating costs.
- Net yield = net operating income divided by the purchase price. The mortgage is not deducted.
- A percent deposit is that percent of the purchase price. The loan is the purchase price minus the deposit, and it is never below zero.
- Cash invested = deposit + legal fees + building inspection + other one-off costs.
- Principal and interest uses a standard monthly amortising repayment, rounded to the nearest cent. Annual repayment = that monthly amount times 12. Weekly repayment = the annual amount divided by 52.
- Interest only = loan times the interest rate for one year. The loan term is not used.
- Weekly cash flow = (net operating income minus the annual mortgage) divided by 52.
- Cash-on-cash return = annual cash flow divided by cash invested, before tax.
- Break-even weekly rent = (fixed annual costs + annual mortgage) / ((52 minus vacant weeks) times (1 minus the management rate)).
- Price for a target gross yield = annual rent divided by that yield.

Income tax, the bright-line test, and interest deductibility are not calculated.

## Worked examples

### Example 1. $800,000 purchase, principal and interest

This is the example already filled in when you open the page.

Inputs:

- Purchase price: $800,000
- Weekly rent: $550 to $650 (mid rent $600)
- Council rates: $3,200
- Insurance: $1,800
- Body corporate fees: $0
- Water rates: $800
- Maintenance and repairs: $2,000
- Other costs: $0
- Property management: 8% of rent collected
- Vacancy: 2 weeks
- Deposit: 20% ($160,000)
- Legal fees: $2,500
- Building inspection: $800
- Other one-off costs: $0
- Interest rate: 6.5%
- Loan term: 30 years
- Repayment: principal and interest
- Target gross yield: 5%

Shared results:

- Loan: $640,000
- Cash invested: $163,300
- Mortgage: $4,045.24 a month, $48,542.88 a year, $933.52 a week
- Break-even weekly rent: $1,224.85

| | Low rent | Mid rent | High rent |
| --- | ---: | ---: | ---: |
| Weekly rent | $550 | $600 | $650 |
| Annual rent income | $28,600 | $31,200 | $33,800 |
| Vacancy allowance | $1,100 | $1,200 | $1,300 |
| Property management | $2,200 | $2,400 | $2,600 |
| Total annual operating costs | $11,100 | $11,400 | $11,700 |
| Net operating income | $17,500 | $19,800 | $22,100 |
| Gross yield | 3.58% | 3.90% | 4.23% |
| Net yield | 2.19% | 2.48% | 2.76% |
| Cash-on-cash return | -19.01% | -17.60% | -16.19% |
| Weekly cash flow | -$596.98 | -$552.75 | -$508.52 |
| Price for 5% gross yield | $572,000 | $624,000 | $676,000 |

Fixed annual costs are $7,800 in every column. Mid rent, step by step:

```text
Annual rent = 600 * 52 = $31,200
Vacancy allowance = 600 * 2 = $1,200
Rent collected = $30,000
Property management = 8% * $30,000 = $2,400
Fixed annual costs = $3,200 + $1,800 + $0 + $800 + $2,000 + $0 = $7,800
Total operating costs = $7,800 + $1,200 + $2,400 = $11,400
Net operating income = $31,200 - $11,400 = $19,800
Gross yield = $31,200 / $800,000 = 3.90%
Net yield = $19,800 / $800,000 = 2.475%, which rounds to 2.48%
Deposit = 20% * $800,000 = $160,000
Loan = $800,000 - $160,000 = $640,000
Cash invested = $160,000 + $2,500 + $800 = $163,300
Monthly repayment at 6.5% over 30 years = $4,045.24
Annual mortgage = $4,045.24 * 12 = $48,542.88
Weekly mortgage = $48,542.88 / 52 = $933.52
Annual cash flow = $19,800 - $48,542.88 = -$28,742.88
Weekly cash flow = -$28,742.88 / 52 = -$552.75
Cash-on-cash = -$28,742.88 / $163,300 = -17.60%
Price for 5% gross yield = $31,200 / 0.05 = $624,000
Break-even weekly rent = ($7,800 + $48,542.88) / (50 * 0.92) = $1,224.85
```

The mid card summary reads: "At $600 a week, the gross yield is 3.90% and the net yield is 2.48%. After the mortgage, you would be about $553 a week short."

The summary rounds the weekly shortfall to the nearest dollar. The card shows the cent figure, -$552.75.

### Example 2. Same purchase, interest only

Change repayment to interest only. Rent, costs, yields, and the 5% target prices stay the same as example 1. The mortgage is one year of interest on the $640,000 loan:

```text
Annual interest = $640,000 * 6.5% = $41,600
Weekly interest = $41,600 / 52 = $800
Break-even weekly rent = ($7,800 + $41,600) / (50 * 0.92) = $1,073.91
```

| | Low rent | Mid rent | High rent |
| --- | ---: | ---: | ---: |
| Weekly cash flow | -$463.46 | -$419.23 | -$375 |
| Cash-on-cash return | -14.76% | -13.35% | -11.94% |

Mid rent cash flow is $19,800 - $41,600 = -$21,800 a year, which is -$419.23 a week. Cash-on-cash is -$21,800 / $163,300 = -13.35%.

### Example 3. $400,000 purchase, dollar deposit, interest only

A smaller property with stronger rent. The mid and high scenarios have money left over. The low scenario is a small shortfall.

Inputs:

- Purchase price: $400,000
- Weekly rent: $520 to $580 (mid rent $550)
- Council rates: $2,000
- Insurance: $1,200
- Body corporate fees: $0
- Water rates: $0
- Maintenance and repairs: $800
- Other costs: $0
- Property management: 8% of rent collected
- Vacancy: 1 week
- Deposit: $80,000 (entered as dollars)
- Legal fees: $1,800
- Building inspection: $700
- Other one-off costs: $0
- Interest rate: 6.5%
- Loan term: 30 years (not used, because the loan is interest only)
- Repayment: interest only
- Target gross yield: 5%

Shared results:

- Loan: $320,000
- Cash invested: $82,500
- Mortgage: $20,800 a year, $400 a week
- Break-even weekly rent: $528.56, from ($4,000 + $20,800) / (51 * 0.92)

Mid rent, step by step:

```text
Annual rent = 550 * 52 = $28,600
Vacancy allowance = 550 * 1 = $550
Rent collected = $28,050
Property management = 8% * $28,050 = $2,244
Fixed annual costs = $4,000
Total operating costs = $4,000 + $550 + $2,244 = $6,794
Net operating income = $28,600 - $6,794 = $21,806
Gross yield = $28,600 / $400,000 = 7.15%
Net yield = $21,806 / $400,000 = 5.4515%, which rounds to 5.45%
Annual cash flow = $21,806 - $20,800 = $1,006
Weekly cash flow = $1,006 / 52 = $19.35
Cash-on-cash = $1,006 / $82,500 = 1.22%
Price for 5% gross yield = $28,600 / 0.05 = $572,000
```

| | Low rent | Mid rent | High rent |
| --- | ---: | ---: | ---: |
| Weekly rent | $520 | $550 | $580 |
| Annual rent income | $27,040 | $28,600 | $30,160 |
| Gross yield | 6.76% | 7.15% | 7.54% |
| Net yield | 5.10% | 5.45% | 5.80% |
| Net operating income | $20,398.40 | $21,806 | $23,213.60 |
| Weekly cash flow | -$7.72 | +$19.35 | +$46.42 |
| Cash-on-cash return | -0.49% | 1.22% | 2.93% |
| Price for 5% gross yield | $540,800 | $572,000 | $603,200 |

Low rent management is 8% of $26,520 = $2,121.60. High rent management is 8% of $29,580 = $2,366.40.

## Paste a Property Brokers listing link

The field at the top of the calculator accepts one https link on `propertybrokers.co.nz`, `www.propertybrokers.co.nz`, `pb.co.nz` or `www.pb.co.nz`, and only when the path is `/residential/sale/...`. Other domains, other paths, and links that are not https are refused with a clear error.

`GET /api/import?url=...` fetches that one page. The request uses a normal browser User-Agent and `Referer: https://www.propertybrokers.co.nz/`. A successful result is cached for one hour with the Cache API. The cache key is the listing link, not the caller's address.

The parser uses three parts of the server HTML:

- the schema.org `SingleFamilyResidence` block, for the address, suburb and town
- the visible facts table, for floor area, land area, district rates, regional rates, LV and RV
- the visible heading next to the bedroom and bathroom counts, for the asking price and the sale method

District rates and regional rates are added together and written into Council rates. A missing RV stays blank.

The compact listing JSON on the page can contain a `Price` field that is not shown to a visitor. That field is never read. A dollar amount in the description is not used either. The only price is one that appears in the visible heading, such as `$750,000` or `Buyers $399,000+`. For `Buyers $X+`, the purchase price is filled with X and the summary says the listing showed a plus. For tender, auction, deadline sale or by negotiation, the purchase price is left empty and the page says `No asking price shown (Tender). Enter the price you would pay.` The word in brackets is the sale method.

The summary card shows the address, bedrooms and bathrooms, floor and land area, rates, LV and RV, sale method, and a link to the listing. Every filled input can still be edited.

### Checked against the live listings on 22 November 2026

| Listing | Visible price | Beds | Baths | Floor | Land | District rates | Regional rates | Council rates | LV | RV | Sale method |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| [103-105 Talbot Street, Whanganui East](https://www.propertybrokers.co.nz/residential/sale/103-105-talbot-street-whanganui-east-whanganui) | $750,000 | 6 | 2 | 200 square metres | 906 square metres | $5,514.86 | $273.61 | $5,788.47 | $175,000 | $185,000 | Asking price |
| [30 Tay Street, Whanganui Central](https://www.propertybrokers.co.nz/residential/sale/30-tay-street-whanganui-central-whanganui) | Buyers $399,000+ (price filled with $399,000) | 2 | 1 | 80 square metres | 372 square metres | $3,476.11 | $437.64 | $3,913.75 | $145,000 | $400,000 | Buyers $399,000+ |
| [21 Tayforth Road, Westmere](https://www.propertybrokers.co.nz/residential/sale/21-tayforth-road-westmere-whanganui) | Empty. Prompt: No asking price shown (Tender). Enter the price you would pay. | 4 | 2 | 225 square metres | 9,005 square metres | $3,193.95 | $340.25 | $3,534.20 | $400,000 | Not shown | Tender |

The Tayforth page JSON does include a `Price` field. It is not shown on the listing, it is not returned by the import, and the purchase price stays empty.

All three addresses match Whanganui District, so weekly rent is filled with $450 to $550. The label is: Market rent estimate from MBIE bond data (September 2026), not an appraisal.

## Market rent from MBIE bond data

`scripts/build-market-rents.mjs` downloads the current monthly territorial authority CSV linked from [Tenancy Services rental bond data](https://www.tenancy.govt.nz/about-tenancy-services/data-and-statistics/rental-bond-data/). The file used for this bundle is:

https://www.tenancy.govt.nz/assets/Uploads/Tenancy/Rental-bond-data/detailed-monthly-tla-tenancy-november-2026.csv?m=b5db18eecf28e4ad8201e5a54005c172a6ca1c9f

The latest month in that file is September 2026 (`2026-09-01`). The CSV is not split by bedroom. It has one lower quartile, median and upper quartile for all dwellings in each territorial authority. Those published figures are used for every bedroom count. They are not estimated, and they are not a bedroom-specific appraisal. If a listing town is not in the list below, the rent fields are left blank.

| Territorial authority | Towns matched from the listing address | Lower quartile | Median | Upper quartile | Lodged bonds | Active bonds |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Whanganui District | Whanganui | $450 | $520 | $550 | 102 | 3,810 |
| Palmerston North City | Palmerston North | $420 | $550 | $600 | 243 | 8,934 |
| New Plymouth District | New Plymouth | $500 | $580 | $650 | 168 | 6,012 |
| Manawatu District | Feilding | $500 | $550 | $610 | 48 | 1,578 |
| Rangitikei District | Marton, Bulls | $375 | $480 | $555 | 18 | 831 |

Low weekly rent is the lower quartile. High weekly rent is the upper quartile. The median is shown on the summary card and is not written into a field.
