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

  const PRICE_HINT = "The price you would pay for the property.";

  function setImportStatus(text, kind) {
    const status = document.getElementById("import-status");
    status.className = "import-status" + (kind ? " is-" + kind : "");
    status.textContent = text;
  }

  function addFact(list, label, value) {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    term.textContent = label;
    const detail = document.createElement("dd");
    if (value instanceof Node) detail.append(value);
    else detail.textContent = value;
    row.append(term, detail);
    list.append(row);
  }

  function areaText(sqm, raw) {
    if (typeof sqm === "number" && Number.isFinite(sqm)) {
      return String(Math.round(sqm)).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " square metres";
    }
    return raw || "Not shown";
  }

  function moneyOr(amount) {
    return typeof amount === "number" ? YieldCalc.formatMoney(amount) : "not shown";
  }

  function renderCard(listing) {
    const card = document.getElementById("import-card");
    card.replaceChildren();
    const address = document.createElement("p");
    address.className = "import-address";
    address.textContent = listing.address;
    card.append(address);

    const facts = document.createElement("dl");
    facts.className = "import-facts";
    const bedCount = listing.bedrooms;
    const bathCount = listing.bathrooms;
    const beds = typeof bedCount === "number" ? bedCount + (bedCount === 1 ? " bedroom" : " bedrooms") : "Not shown";
    const baths = typeof bathCount === "number" ? bathCount + (bathCount === 1 ? " bathroom" : " bathrooms") : "Not shown";
    addFact(facts, "Bedrooms and bathrooms", beds + ", " + baths);
    addFact(facts, "Floor area", areaText(listing.floorAreaSqm, listing.floorAreaText));
    addFact(facts, "Land area", areaText(listing.landAreaSqm, listing.landAreaText));
    const councilText = typeof listing.councilRates === "number"
      ? "Council rates filled with " + moneyOr(listing.councilRates) + "."
      : "Council rates not shown.";
    addFact(
      facts,
      "Rates",
      "District rates " + moneyOr(listing.districtRates) + ". Regional rates " + moneyOr(listing.regionalRates) + ". " + councilText
    );
    addFact(
      facts,
      "Valuation",
      "Land value (LV) " + moneyOr(listing.lv) + ". Rateable value (RV) " + moneyOr(listing.rv) + "."
    );
    addFact(facts, "Sale method", listing.saleMethod || "Not shown");
    if (typeof listing.price === "number") {
      const shown = listing.pricePlus
        ? "Visible price " + listing.priceLabel + ". Purchase price filled with " + YieldCalc.formatMoney(listing.price) + "."
        : "Visible asking price " + YieldCalc.formatMoney(listing.price) + ".";
      addFact(facts, "Price", shown);
    }
    const link = document.createElement("a");
    link.href = listing.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Open the listing";
    addFact(facts, "Listing", link);
    card.append(facts);

    if (listing.pricePrompt) {
      const prompt = document.createElement("p");
      prompt.className = "import-prompt";
      prompt.textContent = listing.pricePrompt;
      card.append(prompt);
    }
    if (listing.rent && listing.rent.label) {
      const rent = document.createElement("p");
      rent.className = "import-rent";
      rent.textContent = listing.rent.note ? listing.rent.label + ". " + listing.rent.note : listing.rent.label;
      card.append(rent);
    }
    card.hidden = false;
  }

  function applyListing(listing) {
    document.getElementById("price").value = listing.priceInput || "";
    document.getElementById("price-hint").textContent = listing.pricePrompt || PRICE_HINT;
    document.getElementById("rates").value = listing.councilRatesInput || "";
    const estimate = document.getElementById("rent-estimate");
    if (listing.rent && listing.rent.available) {
      document.getElementById("rent-low").value = String(listing.rent.lower);
      document.getElementById("rent-high").value = String(listing.rent.upper);
      estimate.hidden = false;
      estimate.textContent = listing.rent.label + ". " + listing.rent.note;
    } else {
      document.getElementById("rent-low").value = "";
      document.getElementById("rent-high").value = "";
      estimate.hidden = false;
      estimate.textContent = (listing.rent && listing.rent.note) || "No market rent estimate for this town.";
    }
    renderCard(listing);
    render();
  }

  function importListing() {
    const raw = document.getElementById("import-url").value.trim();
    const button = document.getElementById("import-button");
    if (!raw) {
      setImportStatus("Paste a Property Brokers listing link.", "error");
      return;
    }
    button.disabled = true;
    setImportStatus("Reading the listing page.", "");
    fetch("/api/import?url=" + encodeURIComponent(raw), { headers: { Accept: "application/json" } })
      .then(function (response) {
        return response.json().then(function (payload) {
          return { response: response, payload: payload };
        }).catch(function () {
          return { response: response, payload: null };
        });
      })
      .then(function (result) {
        if (!result.response.ok || !result.payload || !result.payload.ok) {
          document.getElementById("import-card").hidden = true;
          setImportStatus((result.payload && result.payload.error) || "The listing could not be imported.", "error");
          return;
        }
        applyListing(result.payload.listing);
        setImportStatus("Listing imported. The fields below are filled and you can still edit them.", "success");
      })
      .catch(function () {
        document.getElementById("import-card").hidden = true;
        setImportStatus("The listing could not be imported.", "error");
      })
      .then(function () {
        button.disabled = false;
      });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
  });
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  document.getElementById("copy-link").addEventListener("click", copyLink);
  document.getElementById("import-button").addEventListener("click", importListing);
  document.getElementById("import-url").addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      importListing();
    }
  });

  const searchInput = document.getElementById("listing-search");
  const searchPopup = document.getElementById("listing-search-popup");
  const searchList = document.getElementById("listing-search-list");
  const searchEmpty = document.getElementById("listing-search-empty");
  const searchStatus = document.getElementById("listing-search-status");
  const searchPanel = document.getElementById("import-heading").closest("section");
  let searchTimer = 0;
  let searchToken = 0;
  let searchResults = [];
  let searchActive = -1;

  function setSearchStatus(text, kind) {
    searchStatus.className = "import-status" + (kind ? " is-" + kind : "");
    searchStatus.textContent = text;
  }

  function optionId(index) {
    return "listing-option-" + index;
  }

  function closeSearch(clearStatus) {
    searchPopup.hidden = true;
    searchList.hidden = false;
    searchEmpty.hidden = true;
    searchInput.setAttribute("aria-expanded", "false");
    searchInput.setAttribute("aria-activedescendant", "");
    searchPanel.classList.remove("is-search-open");
    searchActive = -1;
    if (clearStatus) setSearchStatus("", "");
  }

  function placeSearchPopup() {
    const rect = searchInput.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 16;
    const spaceAbove = rect.top - 16;
    const above = spaceBelow < 220 && spaceAbove > spaceBelow;
    searchPopup.classList.toggle("is-above", above);
    const available = Math.max(0, above ? spaceAbove : spaceBelow);
    searchPopup.style.maxHeight = Math.min(320, available) + "px";
  }

  function openSearchPopup() {
    searchPanel.classList.add("is-search-open");
    searchPopup.hidden = false;
    placeSearchPopup();
    searchInput.setAttribute("aria-expanded", "true");
  }

  function showSearchEmpty() {
    searchResults = [];
    searchActive = -1;
    searchList.replaceChildren();
    searchList.hidden = true;
    searchEmpty.hidden = false;
    searchInput.setAttribute("aria-activedescendant", "");
    openSearchPopup();
    setSearchStatus("", "");
  }

  function renderSearchOptions() {
    searchList.replaceChildren();
    searchEmpty.hidden = true;
    searchList.hidden = false;
    searchResults.forEach(function (result, index) {
      const option = document.createElement("li");
      option.id = optionId(index);
      option.className = "listing-option";
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", index === searchActive ? "true" : "false");
      const address = document.createElement("span");
      address.textContent = result.address;
      const place = document.createElement("span");
      place.className = "listing-option-place";
      place.textContent = result.suburb + ", " + result.town;
      const price = document.createElement("span");
      price.className = "listing-option-price";
      price.textContent = result.priceLabel;
      option.append(address, place, price);
      option.addEventListener("mousedown", function (event) {
        event.preventDefault();
        chooseSearchResult(index);
      });
      searchList.append(option);
    });
    openSearchPopup();
    const active = searchActive >= 0 ? document.getElementById(optionId(searchActive)) : null;
    searchInput.setAttribute("aria-activedescendant", active ? active.id : "");
    if (active) active.scrollIntoView({ block: "nearest" });
  }

  function moveSearchActive(next) {
    if (!searchResults.length || searchPopup.hidden) return;
    if (next < 0) next = 0;
    if (next >= searchResults.length) next = searchResults.length - 1;
    searchActive = next;
    renderSearchOptions();
  }

  function chooseSearchResult(index) {
    const result = searchResults[index];
    if (!result) return;
    searchInput.value = result.address;
    closeSearch(true);
    document.getElementById("import-url").value = result.url;
    importListing();
  }

  function runSearch() {
    const query = searchInput.value.trim().replace(/\s+/g, " ");
    if (query.length < 3) {
      searchToken += 1;
      closeSearch(true);
      return;
    }
    const token = searchToken + 1;
    searchToken = token;
    setSearchStatus("Searching listings.", "");
    fetch("/api/search?q=" + encodeURIComponent(query), { headers: { Accept: "application/json" } })
      .then(function (response) {
        return response.json().then(function (payload) {
          return { response: response, payload: payload };
        }).catch(function () {
          return { response: response, payload: null };
        });
      })
      .then(function (result) {
        if (token !== searchToken) return;
        if (!result.response.ok || !result.payload || !result.payload.ok) {
          searchResults = [];
          closeSearch(false);
          setSearchStatus((result.payload && result.payload.error) || "Property Brokers search could not be reached. You can still paste a listing link.", "error");
          return;
        }
        searchResults = result.payload.results || [];
        searchActive = -1;
        if (!searchResults.length) {
          showSearchEmpty();
          return;
        }
        setSearchStatus(searchResults.length === 1 ? "1 listing." : searchResults.length + " listings.", "");
        renderSearchOptions();
      })
      .catch(function () {
        if (token !== searchToken) return;
        searchResults = [];
        closeSearch(false);
        setSearchStatus("Property Brokers search could not be reached. You can still paste a listing link.", "error");
      });
  }

  function scheduleSearch() {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(runSearch, 300);
  }

  searchInput.addEventListener("input", scheduleSearch);
  searchInput.addEventListener("keydown", function (event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (searchPopup.hidden || !searchResults.length) return;
      moveSearchActive(searchActive + 1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (searchPopup.hidden || !searchResults.length) return;
      moveSearchActive(searchActive < 0 ? 0 : searchActive - 1);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (searchPopup.hidden || !searchResults.length) return;
      chooseSearchResult(searchActive >= 0 ? searchActive : 0);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeSearch(true);
    }
  });
  searchInput.addEventListener("blur", function () {
    window.setTimeout(function () {
      if (document.activeElement === searchInput) return;
      closeSearch(false);
    }, 150);
  });
  window.addEventListener("resize", function () {
    if (!searchPopup.hidden) placeSearchPopup();
  });

  applyQuery();
  render();
})();
