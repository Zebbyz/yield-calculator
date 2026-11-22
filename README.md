# Rental Yield Calculator

A public, single-page New Zealand property purchase and rental yield calculator. It runs entirely in the browser. There is no account, no backend, and nothing is collected.

Open `public/index.html`, enter your own figures, and read low, mid and high rent results as you type. Use **Copy link with my numbers** to share a link that refills the same inputs.

## Files

- `public/index.html`: the page
- `public/styles.css`: layout and theme
- `public/calculator.js`: the calculations and money formatting
- `public/app.js`: the form, live results, and share link
- `public/favicon.svg`: the tab icon
- `wrangler.jsonc`: Cloudflare Workers static assets config

## Preview locally

Open `public/index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8765 --directory public
```

## Deploy

From the project root, with Wrangler logged in to Cloudflare:

```bash
npx wrangler deploy
```

The site is static assets only. There is no Worker script. The Worker name is `yield-calculator` and the assets directory is `./public`.

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
