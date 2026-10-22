(() => {
  const form = document.getElementById("riskForm");
  const submitBtn = document.getElementById("submitBtn");
  const errorNote = document.getElementById("errorNote");
  const verdict = document.getElementById("verdict");

  const incomeInput = document.getElementById("person_income");
  const amountInput = document.getElementById("loan_amnt");
  const percentInput = document.getElementById("loan_percent_income");

  const gaugeFill = document.getElementById("gaugeFill");
  const gaugeThreshold = document.getElementById("gaugeThreshold");
  const probNumber = document.getElementById("probNumber");
  const stampBadge = document.getElementById("stampBadge");
  const stampText = document.getElementById("stampText");

  const factProb = document.getElementById("factProb");
  const factThreshold = document.getElementById("factThreshold");
  const factResult = document.getElementById("factResult");

  const apiDot = document.getElementById("apiDot");
  const apiStatusText = document.getElementById("apiStatusText");

  // SHAP explanation elements
  const riskExplanation = document.getElementById("riskExplanation");
  const explanationList = document.getElementById("explanationList");

  const GAUGE_CIRCUMFERENCE = 540.35;

  // =========================================================
  // Auto-calculate loan-to-income ratio
  // =========================================================

  function recalcPercent() {
    const income = parseFloat(incomeInput.value);
    const amount = parseFloat(amountInput.value);

    if (income > 0 && amount >= 0) {
      percentInput.value = (amount / income).toFixed(2);
    }
  }

  incomeInput.addEventListener("input", recalcPercent);
  amountInput.addEventListener("input", recalcPercent);

  recalcPercent();


  // =========================================================
  // Service status check
  // =========================================================

  fetch("/openapi.json", {
    method: "GET"
  })
    .then((res) => {

      if (res.ok) {

        apiDot.classList.add("ok");
        apiStatusText.textContent = "service ready";

      } else {

        throw new Error("bad status");

      }

    })
    .catch(() => {

      apiDot.classList.add("down");
      apiStatusText.textContent = "service unreachable";

    });


  // =========================================================
  // Loading state
  // =========================================================

  function setLoading(isLoading) {

    submitBtn.disabled = isLoading;

    submitBtn.classList.toggle(
      "loading",
      isLoading
    );

    submitBtn.querySelector(".btn-label").textContent =
      isLoading
        ? "Reviewing file…"
        : "Assess risk";
  }


  // =========================================================
  // Error handling
  // =========================================================

  function showError(message) {

    errorNote.textContent = message;
    errorNote.hidden = false;

  }


  function clearError() {

    errorNote.hidden = true;
    errorNote.textContent = "";

  }


  // =========================================================
  // Animate probability number
  // =========================================================

  function animateNumber(el, from, to, duration) {

    const start = performance.now();

    function tick(now) {

      const t = Math.min(
        1,
        (now - start) / duration
      );

      const eased =
        1 - Math.pow(1 - t, 3);

      const value =
        from + (to - from) * eased;

      el.textContent =
        value.toFixed(1);

      if (t < 1) {

        requestAnimationFrame(tick);

      } else {

        el.textContent =
          to.toFixed(1);

      }

    }

    requestAnimationFrame(tick);
  }


  // =========================================================
  // Format feature names
  // =========================================================

  function formatFeatureName(feature) {

    if (!feature) {
      return "Unknown factor";
    }

    const featureNames = {

      person_age: "Applicant age",

      person_income: "Annual income",

      person_home_ownership:
        "Home ownership",

      person_emp_length:
        "Employment length",

      loan_intent:
        "Loan purpose",

      loan_grade:
        "Loan grade",

      loan_amnt:
        "Loan amount",

      loan_int_rate:
        "Interest rate",

      loan_percent_income:
        "Loan-to-income ratio",

      cb_person_default_on_file:
        "Previous default history",

      cb_person_cred_hist_length:
        "Credit history length"

    };

    return (
      featureNames[feature] ||
      feature
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) =>
          char.toUpperCase()
        )
    );
  }


  // =========================================================
  // Render SHAP explanations
  // =========================================================

  function renderExplanations(explanations) {

    // Clear previous explanations
    explanationList.innerHTML = "";


    // If no explanations are returned
    if (
      !explanations ||
      explanations.length === 0
    ) {

      explanationList.innerHTML = `
        <p class="explanation-empty">
          No explanation was generated for this assessment.
        </p>
      `;

      return;
    }


    // Display each explanation
    explanations.forEach((item) => {

      const card =
        document.createElement("div");

      card.className =
        "explanation-item";


      // -----------------------------------------------------
      // If backend returns an object
      // -----------------------------------------------------

      if (
        typeof item === "object" &&
        item !== null
      ) {

        const feature =
          formatFeatureName(item.feature);

        const direction =
          item.direction || "";

        const impact =
          item.impact !== undefined
            ? Number(item.impact)
            : null;


        const isIncreasing =
          direction
            .toLowerCase()
            .includes("increase");


        const isReducing =
          direction
            .toLowerCase()
            .includes("reduc");


        // Decide visual class
        if (isIncreasing) {

          card.classList.add(
            "explanation-item--risk"
          );

        } else if (isReducing) {

          card.classList.add(
            "explanation-item--safe"
          );

        }


        // Icon
        let icon = "•";

        if (isIncreasing) {
          icon = "↑";
        }

        if (isReducing) {
          icon = "↓";
        }


        // Impact text
        let impactText = "";

        if (impact !== null) {

          impactText =
            `Impact: ${Math.abs(impact).toFixed(4)}`;

        }


        card.innerHTML = `
          <div class="explanation-item__icon">
            ${icon}
          </div>

          <div class="explanation-item__content">

            <strong>
              ${feature}
            </strong>

            <span>
              ${direction}
            </span>

            ${
              impactText
                ? `<small>${impactText}</small>`
                : ""
            }

          </div>
        `;

      }


      // -----------------------------------------------------
      // If backend returns a simple string
      // -----------------------------------------------------

      else {

        card.innerHTML = `
          <div class="explanation-item__icon">
            •
          </div>

          <div class="explanation-item__content">
            <span>
              ${item}
            </span>
          </div>
        `;

      }


      explanationList.appendChild(card);

    });
  }


  // =========================================================
  // Render final verdict
  // =========================================================

  function renderVerdict(data) {

    const probabilityPct =
      data.default_probability * 100;

    const thresholdPct =
      data.threshold * 100;

    const isHighRisk =
      data.default_prediction === 1;


    // Show verdict
    verdict.hidden = false;


    // Scroll to result
    verdict.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });


    // -------------------------------------------------------
    // Gauge
    // -------------------------------------------------------

    const offset =
      GAUGE_CIRCUMFERENCE *
      (1 - probabilityPct / 100);


    gaugeFill.style.stroke =
      isHighRisk
        ? "var(--risk-red)"
        : "var(--brass)";


    requestAnimationFrame(() => {

      gaugeFill.style.strokeDashoffset =
        offset;

    });


    // -------------------------------------------------------
    // Threshold marker
    // -------------------------------------------------------

    gaugeThreshold.style.transform =
      `rotate(${thresholdPct * 3.6}deg)`;


    // -------------------------------------------------------
    // Probability number
    // -------------------------------------------------------

    animateNumber(
      probNumber,
      0,
      probabilityPct,
      1000
    );


    // -------------------------------------------------------
    // Risk stamp
    // -------------------------------------------------------

    stampBadge.classList.remove(
      "stamp--in",
      "risk-high"
    );

    void stampBadge.offsetWidth;


    if (isHighRisk) {

      stampBadge.classList.add(
        "risk-high"
      );

      stampText.textContent =
        "HIGH RISK";

    } else {

      stampText.textContent =
        "LOW RISK";

    }


    requestAnimationFrame(() => {

      stampBadge.classList.add(
        "stamp--in"
      );

    });


    // -------------------------------------------------------
    // Ledger facts
    // -------------------------------------------------------

    factProb.textContent =
      `${probabilityPct.toFixed(1)}%`;

    factThreshold.textContent =
      `${thresholdPct.toFixed(1)}%`;

    factResult.textContent =
      data.Result;


    // -------------------------------------------------------
    // SHAP explanation
    // -------------------------------------------------------

    renderExplanations(
      data.explanations
    );

  }


  // =========================================================
  // Submit form
  // =========================================================

  form.addEventListener(
    "submit",
    async (e) => {

      e.preventDefault();

      clearError();

      setLoading(true);


      // -----------------------------------------------------
      // Prepare request data
      // -----------------------------------------------------

      const payload = {

        person_age:
          parseInt(
            document.getElementById(
              "person_age"
            ).value,
            10
          ),

        person_income:
          parseFloat(
            incomeInput.value
          ),

        person_home_ownership:
          document.getElementById(
            "person_home_ownership"
          ).value,

        person_emp_length:
          parseFloat(
            document.getElementById(
              "person_emp_length"
            ).value
          ),

        loan_intent:
          document.getElementById(
            "loan_intent"
          ).value,

        loan_grade:
          document.getElementById(
            "loan_grade"
          ).value,

        loan_amnt:
          parseFloat(
            amountInput.value
          ),

        loan_int_rate:
          parseFloat(
            document.getElementById(
              "loan_int_rate"
            ).value
          ),

        loan_percent_income:
          parseFloat(
            percentInput.value
          ),

        cb_person_default_on_file:
          document.getElementById(
            "cb_person_default_on_file"
          ).value,

        cb_person_cred_hist_length:
          parseInt(
            document.getElementById(
              "cb_person_cred_hist_length"
            ).value,
            10
          )

      };


      // -----------------------------------------------------
      // Send request
      // -----------------------------------------------------

      try {

        const res =
          await fetch(
            "/predict",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify(payload)
            }
          );


        // ---------------------------------------------------
        // Handle API errors
        // ---------------------------------------------------

        if (!res.ok) {

          const body =
            await res
              .json()
              .catch(() => null);

          const detail =
            body && body.detail
              ? JSON.stringify(
                  body.detail
                )
              : `HTTP ${res.status}`;

          throw new Error(detail);

        }


        // ---------------------------------------------------
        // Read API response
        // ---------------------------------------------------

        const data =
          await res.json();


        console.log(
          "Prediction response:",
          data
        );


        // ---------------------------------------------------
        // Display result
        // ---------------------------------------------------

        renderVerdict(data);

      }


      // -----------------------------------------------------
      // Catch errors
      // -----------------------------------------------------

      catch (err) {

        console.error(
          "Prediction error:",
          err
        );

        showError(
          `Could not reach the ledger. ${
            err.message ||
            "Check the service is running."
          }`
        );

      }


      // -----------------------------------------------------
      // Stop loading
      // -----------------------------------------------------

      finally {

        setLoading(false);

      }

    }
  );

})();