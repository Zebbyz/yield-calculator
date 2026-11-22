/* New Zealand rental yield estimates.
   A year is 52 weeks.
   Gross yield uses weekly rent times 52, divided by the purchase price.
   The management fee is a percent of rent collected after vacancy.
   Principal and interest is a standard monthly amortising repayment. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.YieldCalc = api;
})(globalThis, function () {
  const DEFAULTS = Object.freeze({
    price: 800000,
    rentLow: 550,
    rentHigh: 650,
    rates: 3200,
    insurance: 1800,
    bodyCorp: 0,
    water: 800,
    maintenance: 2000,
    management: 8,
    vacancy: 2,
    other: 0,
    deposit: 20,
    depositMode: "pct",
    legal: 2500,
    inspection: 800,
    purchaseOther: 0,
    interest: 6.5,
    term: 30,
    loanType: "pi",
    target: 5,
  });

  const NUMBER_KEYS = [
    "price",
    "rentLow",
    "rentHigh",
    "rates",
    "insurance",
    "bodyCorp",
    "water",
    "maintenance",
    "management",
    "vacancy",
    "other",
    "deposit",
    "legal",
    "inspection",
    "purchaseOther",
    "interest",
    "term",
    "target",
  ];

  function parseNumber(value) {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : 0;
    }
    if (value === null || value === undefined) return 0;
    const raw = String(value).trim().replace(/[$,\s]/g, "").replace(/%/g, "");
    if (raw === "" || raw === "-" || raw === "." || raw === "-.") return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }

  function roundHalfAway(n, places) {
    if (!Number.isFinite(n)) return NaN;
    const factor = 10 ** places;
    const sign = n < 0 ? -1 : 1;
    return (sign * Math.round(Math.abs(n) * factor + 1e-8)) / factor;
  }

  function toCents(n) {
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.round(n * 100 + 1e-8);
  }

  function groupDigits(roundedAbs, fractionDigits) {
    const fixed = roundedAbs.toFixed(fractionDigits);
    if (/e/i.test(fixed)) return null;
    const split = fixed.split(".");
    split[0] = split[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return fractionDigits > 0 ? split[0] + "." + split[1] : split[0];
  }

  function millionWords(millionsRounded) {
    let text = millionsRounded.toFixed(2);
    if (text.endsWith(".00")) text = text.slice(0, -3);
    else if (text.endsWith("0")) text = text.slice(0, -1);
    const bits = text.split(".");
    bits[0] = bits[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return "$" + bits.join(".") + " million";
  }

  function formatMoney(amount) {
    if (typeof amount !== "number" || !Number.isFinite(amount)) return "n/a";
    const sign = amount < -0.004 ? "-" : "";
    const rounded = roundHalfAway(Math.abs(amount), 2);
    if (!Number.isFinite(rounded) || rounded === 0) return "$0";
    if (rounded >= 1000000) {
      const millionsRounded = roundHalfAway(rounded / 1000000, 2);
      if (Math.abs(millionsRounded * 1000000 - rounded) < 0.001) {
        return sign + millionWords(millionsRounded);
      }
    }
    const centsPart = Math.round(rounded * 100 + 1e-8) % 100;
    const digits = centsPart === 0 ? 0 : 2;
    const body = groupDigits(rounded, digits);
    if (body === null) return "n/a";
    return sign + "$" + body;
  }

  function formatPercent(ratio) {
    if (typeof ratio !== "number" || !Number.isFinite(ratio)) return "n/a";
    return roundHalfAway(ratio * 100, 2).toFixed(2) + "%";
  }

  function formatTarget(pct) {
    if (typeof pct !== "number" || !Number.isFinite(pct)) return "0%";
    let text = roundHalfAway(pct, 2).toFixed(2);
    if (text.endsWith(".00")) text = text.slice(0, -3);
    else if (text.endsWith("0")) text = text.slice(0, -1);
    return text + "%";
  }

  function formatCashFlow(amount) {
    if (typeof amount !== "number" || !Number.isFinite(amount)) return "n/a";
    const shown = roundHalfAway(amount, 2);
    if (shown > 0) return "+" + formatMoney(shown);
    return formatMoney(shown);
  }

  function cashFlowTone(amount) {
    if (typeof amount !== "number" || !Number.isFinite(amount)) return "even";
    const shown = roundHalfAway(amount, 2);
    if (shown > 0) return "positive";
    if (shown < 0) return "negative";
    return "even";
  }

  function cashFlowTag(tone) {
    if (tone === "positive") return "Surplus";
    if (tone === "negative") return "Shortfall";
    return "Even";
  }

  function rawMonthly(loan, annualRatePercent, years) {
    if (!(loan > 0)) return 0;
    const months = Math.round(Number(years) * 12);
    if (!(months >= 1)) return null;
    const monthlyRate = Number(annualRatePercent) / 100 / 12;
    if (!Number.isFinite(monthlyRate) || monthlyRate < 0) return null;
    if (monthlyRate === 0) return loan / months;
    const factor = Math.pow(1 + monthlyRate, months);
    if (!Number.isFinite(factor)) return loan * monthlyRate;
    return (loan * monthlyRate * factor) / (factor - 1);
  }

  function monthlyPayment(loan, annualRatePercent, years) {
    const raw = rawMonthly(loan, annualRatePercent, years);
    if (raw === null || !Number.isFinite(raw)) return null;
    return roundHalfAway(raw, 2);
  }

  function num(value, state) {
    const n = typeof value === "number" ? value : parseNumber(value);
    if (!Number.isFinite(n)) return 0;
    if (n < 0) {
      state.negative = true;
      return 0;
    }
    return n;
  }

  function numParam(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "0";
    return String(roundHalfAway(n, 4));
  }

  function computeBreakEven(fixedDollars, mortgageDollars, vacancyWeeks, managementRate) {
    const weeksLet = 52 - vacancyWeeks;
    const denom = weeksLet * (1 - managementRate);
    if (!(denom > 0)) return null;
    const weekly = (fixedDollars + mortgageDollars) / denom;
    if (!Number.isFinite(weekly)) return null;
    if (weekly < 0) return 0;
    return weekly;
  }

  function buildSummary(opts) {
    if (!opts.priceOk) {
      return "Enter a purchase price greater than zero to calculate yields for this rent.";
    }
    const head =
      "At " +
      formatMoney(opts.weekly) +
      " a week, the gross yield is " +
      formatPercent(opts.gross) +
      " and the net yield is " +
      formatPercent(opts.net) +
      ". ";
    if (!opts.mortgageAvailable || opts.weeklyCash === null) {
      return head + "Enter a loan term of at least 1 year to calculate cash flow after the mortgage.";
    }
    const shown = roundHalfAway(opts.weeklyCash, 2);
    if (shown === 0) {
      return head + "After the mortgage, weekly cash flow is about even.";
    }
    const dollars = Math.round(Math.abs(shown));
    const spoken = formatMoney(dollars >= 1 ? dollars : Math.abs(shown));
    if (shown > 0) {
      return head + "After the mortgage, you would have about " + spoken + " a week left over.";
    }
    return head + "After the mortgage, you would be about " + spoken + " a week short.";
  }

  function calculate(input) {
    const source = input || {};
    const state = { negative: false };
    const warnings = [];

    const price = num(source.price, state);
    const rentLow = num(source.rentLow, state);
    const rentHigh = num(source.rentHigh, state);
    const rentMid = (rentLow + rentHigh) / 2;
    const managementPct = num(source.management, state);
    let vacancyWeeks = num(source.vacancy, state);
    let vacancyCapped = false;
    if (vacancyWeeks > 52) {
      vacancyWeeks = 52;
      vacancyCapped = true;
    }
    const interest = num(source.interest, state);
    const term = num(source.term, state);
    const target = num(source.target, state);
    const depositMode = source.depositMode === "nzd" ? "nzd" : "pct";
    const loanType = source.loanType === "io" ? "io" : "pi";

    const priceCents = toCents(price);
    const depositValue = num(source.deposit, state);
    const depositCents =
      depositMode === "nzd"
        ? toCents(depositValue)
        : Math.round((priceCents * depositValue) / 100);
    const loanCents = Math.max(0, priceCents - depositCents);
    const purchaseCents =
      toCents(num(source.legal, state)) +
      toCents(num(source.inspection, state)) +
      toCents(num(source.purchaseOther, state));
    const cashCents = depositCents + purchaseCents;
    const fixedCents = [
      source.rates,
      source.insurance,
      source.bodyCorp,
      source.water,
      source.maintenance,
      source.other,
    ].reduce(function (sum, value) {
      return sum + toCents(num(value, state));
    }, 0);

    const loanDollars = loanCents / 100;
    let mortgageAvailable = true;
    let mortgageCents = 0;
    if (loanCents <= 0) {
      mortgageCents = 0;
    } else if (loanType === "io") {
      mortgageCents = toCents(loanDollars * (interest / 100));
    } else if (term < 1) {
      mortgageAvailable = false;
    } else {
      const monthly = rawMonthly(loanDollars, interest, term);
      if (monthly === null || !Number.isFinite(monthly)) {
        mortgageAvailable = false;
      } else {
        mortgageCents = Math.round(monthly * 100 + 1e-8) * 12;
      }
    }

    const fixedDollars = fixedCents / 100;
    const mortgageDollars = mortgageCents / 100;
    const breakEvenWeekly = mortgageAvailable
      ? computeBreakEven(fixedDollars, mortgageDollars, vacancyWeeks, managementPct / 100)
      : null;

    function scenario(key, label, weekly) {
      const annualCents = toCents(weekly * 52);
      let vacancyCents = toCents(weekly * vacancyWeeks);
      if (vacancyCents > annualCents) vacancyCents = annualCents;
      const collectedCents = annualCents - vacancyCents;
      const managementCents = Math.round((collectedCents * managementPct) / 100);
      const operatingCents = fixedCents + vacancyCents + managementCents;
      const noiCents = annualCents - operatingCents;
      const cashFlowCents = noiCents - mortgageCents;
      const priceOk = priceCents > 0;
      const gross = priceOk ? annualCents / priceCents : null;
      const net = priceOk ? noiCents / priceCents : null;
      const weeklyCash = mortgageAvailable ? cashFlowCents / 100 / 52 : null;
      const targetPrice = target > 0 ? annualCents / 100 / (target / 100) : null;
      return {
        key: key,
        label: label,
        weeklyRent: weekly,
        annualRent: annualCents / 100,
        fixedCosts: fixedDollars,
        vacancyCost: vacancyCents / 100,
        managementFee: managementCents / 100,
        operatingCosts: operatingCents / 100,
        noi: noiCents / 100,
        grossYield: gross,
        netYield: net,
        cashOnCash: mortgageAvailable && cashCents > 0 ? cashFlowCents / cashCents : null,
        annualCashFlow: mortgageAvailable ? cashFlowCents / 100 : null,
        weeklyCashFlow: weeklyCash,
        targetPrice: targetPrice,
        summary: buildSummary({
          priceOk: priceOk,
          weekly: weekly,
          gross: gross,
          net: net,
          weeklyCash: weeklyCash,
          mortgageAvailable: mortgageAvailable,
        }),
      };
    }

    if (state.negative) warnings.push("Negative numbers are treated as zero.");
    if (vacancyCapped) {
      warnings.push("Vacancy is capped at 52 weeks, because a year is 52 weeks.");
    }
    if (rentLow > rentHigh) {
      warnings.push(
        "The lowest weekly rent is above the highest. The low and high cards follow the two fields as entered."
      );
    }
    if (priceCents > 0 && depositCents > priceCents) {
      warnings.push("The deposit is above the purchase price, so the loan is $0.");
    }
    if (!mortgageAvailable) {
      warnings.push("Enter a loan term of at least 1 year to calculate principal and interest.");
    }
    if (managementPct >= 100) {
      warnings.push(
        "The management fee is 100% or more of rent collected, so there is no break-even rent."
      );
    } else if (vacancyWeeks >= 52) {
      warnings.push("Vacancy is the full year, so there is no break-even rent.");
    }
    if (priceCents > 0 && cashCents === 0) {
      warnings.push(
        "Cash-on-cash return needs cash invested above zero. Add a deposit or a purchase cost."
      );
    }
    if (!(target > 0)) {
      warnings.push("Enter a target gross yield above zero to price the property for that yield.");
    }

    const midSubtitle =
      rentLow === rentHigh
        ? "The same as the low and high rent."
        : "Halfway between " + formatMoney(rentLow) + " and " + formatMoney(rentHigh) + ".";

    return {
      warnings: warnings,
      mortgageAvailable: mortgageAvailable,
      price: priceCents / 100,
      rentLow: rentLow,
      rentHigh: rentHigh,
      rentMid: rentMid,
      midSubtitle: midSubtitle,
      deposit: depositCents / 100,
      loan: loanCents / 100,
      purchaseCosts: purchaseCents / 100,
      cashInvested: cashCents / 100,
      fixedCosts: fixedDollars,
      managementPct: managementPct,
      vacancyWeeks: vacancyWeeks,
      interest: interest,
      term: term,
      loanType: loanType,
      depositMode: depositMode,
      target: target,
      annualMortgage: mortgageAvailable ? mortgageDollars : null,
      weeklyMortgage: mortgageAvailable ? mortgageDollars / 52 : null,
      breakEvenWeekly: breakEvenWeekly,
      scenarios: [
        scenario("low", "Low rent", rentLow),
        scenario("mid", "Mid rent", rentMid),
        scenario("high", "High rent", rentHigh),
      ],
    };
  }

  function toQuery(input) {
    const source = input || {};
    const params = new URLSearchParams();
    NUMBER_KEYS.forEach(function (key) {
      params.set(key, numParam(source[key]));
    });
    params.set("depositMode", source.depositMode === "nzd" ? "nzd" : "pct");
    params.set("loanType", source.loanType === "io" ? "io" : "pi");
    return params.toString();
  }

  function fromQuery(search) {
    const raw = String(search || "").replace(/^\?/, "");
    const params = new URLSearchParams(raw);
    const out = {};
    NUMBER_KEYS.forEach(function (key) {
      if (params.has(key)) out[key] = parseNumber(params.get(key));
    });
    if (params.get("depositMode") === "nzd" || params.get("depositMode") === "pct") {
      out.depositMode = params.get("depositMode");
    }
    if (params.get("loanType") === "io" || params.get("loanType") === "pi") {
      out.loanType = params.get("loanType");
    }
    return out;
  }

  return {
    DEFAULTS: DEFAULTS,
    NUMBER_KEYS: NUMBER_KEYS,
    calculate: calculate,
    formatMoney: formatMoney,
    formatPercent: formatPercent,
    formatTarget: formatTarget,
    formatCashFlow: formatCashFlow,
    cashFlowTone: cashFlowTone,
    cashFlowTag: cashFlowTag,
    parseNumber: parseNumber,
    toQuery: toQuery,
    fromQuery: fromQuery,
    monthlyPayment: monthlyPayment,
  };
});
