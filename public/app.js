(function () {
  const FIELD_IDS = {
    price: "price",
    rentLow: "rent-low",
    rentHigh: "rent-high",
    rates: "rates",
    insurance: "insurance",
    bodyCorp: "body-corp",
    water: "water",
    maintenance: "maintenance",
    management: "management",
    vacancy: "vacancy",
    other: "other",
    deposit: "deposit",
    legal: "legal",
    inspection: "inspection",
    purchaseOther: "purchase-other",
    interest: "interest",
    term: "term",
    target: "target",
  };

  const form = document.getElementById("calculator");

  function readForm() {
    const value = function (id) {
      return document.getElementById(id).value;
    };
    const checked = function (name) {
      return document.querySelector('input[name="' + name + '"]:checked').value;
    };
    return {
      price: YieldCalc.parseNumber(value("price")),
      rentLow: YieldCalc.parseNumber(value("rent-low")),
      rentHigh: YieldCalc.parseNumber(value("rent-high")),
      rates: YieldCalc.parseNumber(value("rates")),
      insurance: YieldCalc.parseNumber(value("insurance")),
      bodyCorp: YieldCalc.parseNumber(value("body-corp")),
      water: YieldCalc.parseNumber(value("water")),
      maintenance: YieldCalc.parseNumber(value("maintenance")),
      management: YieldCalc.parseNumber(value("management")),
      vacancy: YieldCalc.parseNumber(value("vacancy")),
      other: YieldCalc.parseNumber(value("other")),
      deposit: YieldCalc.parseNumber(value("deposit")),
      depositMode: checked("depositMode"),
      legal: YieldCalc.parseNumber(value("legal")),
      inspection: YieldCalc.parseNumber(value("inspection")),
      purchaseOther: YieldCalc.parseNumber(value("purchase-other")),
      interest: YieldCalc.parseNumber(value("interest")),
      term: YieldCalc.parseNumber(value("term")),
      loanType: checked("loanType"),
      target: YieldCalc.parseNumber(value("target")),
    };
  }

  function syncDepositAffix() {
    const mode = document.querySelector('input[name="depositMode"]:checked').value;
    document.getElementById("deposit-prefix").hidden = mode !== "nzd";
    document.getElementById("deposit-suffix").hidden = mode !== "pct";
  }

  function applyQuery() {
    const overrides = YieldCalc.fromQuery(window.location.search);
    Object.keys(FIELD_IDS).forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(overrides, key)) {
        document.getElementById(FIELD_IDS[key]).value = String(overrides[key]);
      }
    });
    if (overrides.depositMode) {
      const deposit = document.querySelector(
        'input[name="depositMode"][value="' + overrides.depositMode + '"]'
      );
      if (deposit) deposit.checked = true;
    }
    if (overrides.loanType) {
      const loan = document.querySelector(
        'input[name="loanType"][value="' + overrides.loanType + '"]'
      );
      if (loan) loan.checked = true;
    }
  }

  function appendRow(parent, label, value, field, extraClass) {
    const row = document.createElement("div");
    row.className = "row" + (extraClass ? " " + extraClass : "");
    const lab = document.createElement("span");
    lab.className = "row-label";
    lab.textContent = label;
    const val = document.createElement("span");
    val.className = "row-value";
    val.dataset.field = field;
    val.textContent = value;
    row.append(lab, val);
    parent.append(row);
  }

  function renderWarnings(warnings) {
    const root = document.getElementById("warnings");
    root.textContent = "";
    if (!warnings.length) {
      root.hidden = true;
      return;
    }
    root.hidden = false;
    const list = document.createElement("ul");
    warnings.forEach(function (text) {
      const item = document.createElement("li");
      item.textContent = text;
      list.append(item);
    });
    root.append(list);
  }

  function renderAssumptions(result) {
    const root = document.getElementById("assumptions");
    root.textContent = "";

    const grid = document.createElement("div");
    grid.className = "stat-grid";
    [
      ["Purchase price", YieldCalc.formatMoney(result.price), "price"],
      ["Deposit", YieldCalc.formatMoney(result.deposit), "deposit"],
      ["Loan", YieldCalc.formatMoney(result.loan), "loan"],
      ["Cash invested", YieldCalc.formatMoney(result.cashInvested), "cashInvested"],
    ].forEach(function (item) {
      const stat = document.createElement("div");
      stat.className = "stat";
      const lab = document.createElement("span");
      lab.className = "stat-label";
      lab.textContent = item[0];
      const val = document.createElement("span");
      val.className = "stat-value";
      val.dataset.field = item[2];
      val.textContent = item[1];
      stat.append(lab, val);
      grid.append(stat);
    });
    root.append(grid);

    const bracket = document.createElement("p");
    bracket.className = "bracket-line";
    bracket.dataset.field = "rentBracket";
    bracket.textContent =
      "Low " +
      YieldCalc.formatMoney(result.rentLow) +
      " a week. Mid " +
      YieldCalc.formatMoney(result.rentMid) +
      " a week. High " +
      YieldCalc.formatMoney(result.rentHigh) +
      " a week.";
    root.append(bracket);

    const note = document.createElement("p");
    note.className = "shared-note";
    note.textContent =
      "The mortgage repayment and the break-even rent are the same on every card, because the loan and the fixed costs do not change with rent.";
    root.append(note);
  }

  function renderScenarios(result) {
    const root = document.getElementById("scenarios");
    root.textContent = "";
    const mortgageWeekly = result.mortgageAvailable
      ? YieldCalc.formatMoney(result.weeklyMortgage)
      : "Not available";
    const mortgageAnnual = result.mortgageAvailable
      ? YieldCalc.formatMoney(result.annualMortgage)
      : "Not available";
    const breakText =
      result.breakEvenWeekly === null
        ? "Not available"
        : YieldCalc.formatMoney(result.breakEvenWeekly);
    const targetLabel =
      result.target > 0
        ? "Price for " + YieldCalc.formatTarget(result.target) + " gross yield"
        : "Price for your target gross yield";
    const vacancyLabel =
      "Vacancy allowance (" + formatWeeks(result.vacancyWeeks) + ")";
    const managementLabel =
      "Property management (" +
      YieldCalc.formatTarget(result.managementPct) +
      " of rent collected)";

    result.scenarios.forEach(function (scenario) {
      const card = document.createElement("article");
      card.className = "card" + (scenario.key === "mid" ? " card-mid" : "");
      card.dataset.scenario = scenario.key;

      const title = document.createElement("h3");
      title.textContent = scenario.label;
      card.append(title);

      const rent = document.createElement("p");
      rent.className = "rent-figure";
      rent.dataset.field = "weeklyRentFigure";
      rent.textContent = YieldCalc.formatMoney(scenario.weeklyRent) + " a week";
      card.append(rent);

      if (scenario.key === "mid") {
        const note = document.createElement("p");
        note.className = "card-note";
        note.textContent = result.midSubtitle;
        card.append(note);
      }

      const summary = document.createElement("p");
      summary.className = "summary";
      summary.dataset.field = "summary";
      summary.textContent = scenario.summary;
      card.append(summary);

      const returns = document.createElement("h4");
      returns.textContent = "Returns";
      card.append(returns);
      appendRow(card, "Gross yield", YieldCalc.formatPercent(scenario.grossYield), "grossYield", "emphasis");
      appendRow(card, "Net yield", YieldCalc.formatPercent(scenario.netYield), "netYield", "emphasis");
      appendRow(
        card,
        "Cash-on-cash return",
        YieldCalc.formatPercent(scenario.cashOnCash),
        "cashOnCash",
        "emphasis"
      );

      const income = document.createElement("h4");
      income.textContent = "Income and costs";
      card.append(income);
      appendRow(card, "Weekly rent income", YieldCalc.formatMoney(scenario.weeklyRent), "weeklyRent");
      appendRow(card, "Annual rent income", YieldCalc.formatMoney(scenario.annualRent), "annualRent");
      appendRow(card, "Fixed annual costs", YieldCalc.formatMoney(scenario.fixedCosts), "fixedCosts");
      appendRow(card, vacancyLabel, YieldCalc.formatMoney(scenario.vacancyCost), "vacancyCost");
      appendRow(card, managementLabel, YieldCalc.formatMoney(scenario.managementFee), "managementFee");
      appendRow(
        card,
        "Total annual operating costs",
        YieldCalc.formatMoney(scenario.operatingCosts),
        "operatingCosts",
        "total"
      );
      appendRow(card, "Net operating income", YieldCalc.formatMoney(scenario.noi), "noi", "total");

      const cash = document.createElement("h4");
      cash.textContent = "Mortgage and cash flow";
      card.append(cash);
      appendRow(card, "Weekly repayment", mortgageWeekly, "mortgageWeekly");
      appendRow(card, "Annual repayment", mortgageAnnual, "mortgageAnnual");

      const push = document.createElement("div");
      push.className = "card-push";
      card.append(push);

      const tone = result.mortgageAvailable ? YieldCalc.cashFlowTone(scenario.weeklyCashFlow) : "even";
      const band = document.createElement("div");
      band.className = "cashflow is-" + tone;
      const cashLabel = document.createElement("span");
      cashLabel.className = "cashflow-label";
      cashLabel.textContent = "Weekly cash flow after mortgage";
      const cashValue = document.createElement("span");
      cashValue.className = "cashflow-value";
      cashValue.dataset.field = "cashFlow";
      cashValue.textContent = result.mortgageAvailable
        ? YieldCalc.formatCashFlow(scenario.weeklyCashFlow)
        : "Not available";
      const tag = document.createElement("span");
      tag.className = "cashflow-tag";
      tag.textContent = result.mortgageAvailable ? YieldCalc.cashFlowTag(tone) : "";
      band.append(cashLabel, cashValue, tag);
      card.append(band);

      appendRow(card, "Break-even weekly rent", breakText, "breakEven");
      appendRow(card, targetLabel, scenario.targetPrice === null ? "Not available" : YieldCalc.formatMoney(scenario.targetPrice), "targetPrice");

      root.append(card);
    });
  }

  function formatWeeks(weeks) {
    const rounded = Math.round(weeks * 100 + 1e-8) / 100;
    let text = rounded.toFixed(2);
    if (text.endsWith(".00")) text = text.slice(0, -3);
    else if (text.endsWith("0")) text = text.slice(0, -1);
    return text + (rounded === 1 ? " week" : " weeks");
  }

  function render() {
    syncDepositAffix();
    const result = YieldCalc.calculate(readForm());
    renderWarnings(result.warnings);
    renderAssumptions(result);
    renderScenarios(result);
  }

  function copyWithSelection(href) {
    const fallback = document.getElementById("copy-fallback");
    fallback.hidden = false;
    fallback.value = href;
    fallback.focus();
    fallback.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (error) {
      ok = false;
    }
    return ok;
  }

  function markCopied() {
    const status = document.getElementById("copy-status");
    const fallback = document.getElementById("copy-fallback");
    fallback.hidden = true;
    status.className = "copy-status is-success";
    status.textContent = "Link copied to your clipboard.";
  }

  function copyLink() {
    const hrefUrl = new URL(window.location.href);
    hrefUrl.search = YieldCalc.toQuery(readForm());
    const href = hrefUrl.toString();
    window.history.replaceState(null, "", href);
    const status = document.getElementById("copy-status");
    if (copyWithSelection(href)) {
      markCopied();
      return;
    }
    status.className = "copy-status";
    status.textContent = "Select the link below and copy it.";
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(href).then(markCopied).catch(function () {});
    }
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
  });
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  document.getElementById("copy-link").addEventListener("click", copyLink);

  applyQuery();
  render();
})();
