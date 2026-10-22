// ============================================================
// Credit Risk Assessment — Frontend Logic
// ============================================================

const form = document.getElementById("riskForm");
const submitBtn = document.getElementById("submitBtn");
const errorNote = document.getElementById("errorNote");

const incomeInput = document.getElementById("person_income");
const amountInput = document.getElementById("loan_amnt");
const percentInput = document.getElementById("loan_percent_income");

const statusDot = document.querySelector(".dot");
const statusText = document.querySelector(".masthead__status span:last-child");


// ============================================================
// Field definitions
// ============================================================

const SELECT_FIELDS = {
    person_home_ownership: "Home ownership",
    loan_intent: "Purpose",
    loan_grade: "Loan grade",
    cb_person_default_on_file: "Prior default on file"
};


// These limits match the ranges defined in your HTML.
const INPUT_RULES = {
    person_age: {
        label: "Applicant age",
        min: 18,
        max: 100
    },

    person_income: {
        label: "Annual income",
        min: 1,
        max: 10000000
    },

    person_emp_length: {
        label: "Employment length",
        min: 0,
        max: 60
    },

    loan_amnt: {
        label: "Loan amount",
        min: 1,
        max: 1000000
    },

    loan_int_rate: {
        label: "Interest rate",
        min: 0,
        max: 40
    },

    loan_percent_income: {
        label: "Loan-to-income ratio",
        min: 0,
        max: 1
    },

    cb_person_cred_hist_length: {
        label: "Credit history length",
        min: 0,
        max: 60
    }
};


// ============================================================
// Auto-calculate loan-to-income ratio
// ============================================================

function recalcPercent() {
    const income = parseFloat(incomeInput.value);
    const amount = parseFloat(amountInput.value);

    if (income > 0 && amount >= 0) {
        percentInput.value = (amount / income).toFixed(2);
    } else {
        percentInput.value = "";
    }
}


incomeInput.addEventListener("input", recalcPercent);
amountInput.addEventListener("input", recalcPercent);


// ============================================================
// Input validation
// ============================================================

function checkInputs() {

    // Check dropdowns
    for (const [id, label] of Object.entries(SELECT_FIELDS)) {

        const field = document.getElementById(id);

        if (!field || !field.value) {
            return {
                error: `Please select "${label}".`
            };
        }
    }


    const outside = [];


    // Check numeric fields
    for (const [id, rule] of Object.entries(INPUT_RULES)) {

        const field = document.getElementById(id);

        if (!field) {
            continue;
        }

        const raw = field.value.trim();
        const value = parseFloat(raw);


        // Empty / non-numeric
        if (raw === "" || Number.isNaN(value)) {

            return {
                error: `Please enter a value for "${rule.label}".`
            };
        }


        // Hard range validation
        if (
            value < rule.min ||
            value > rule.max
        ) {
            return {
                error:
                    `"${rule.label}" must be between ${rule.min} and ${rule.max}.`
            };
        }
    }


    return {
        outside
    };
}


// ============================================================
// Error message
// ============================================================

function showError(message) {

    if (!errorNote) {
        return;
    }

    errorNote.textContent = message;
    errorNote.style.display = "block";
}


function clearError() {

    if (!errorNote) {
        return;
    }

    errorNote.textContent = "";
    errorNote.style.display = "none";
}


// ============================================================
// Service status
// ============================================================

async function checkService() {

    try {

        const response = await fetch("/openapi.json");

        if (!response.ok) {
            throw new Error("Service unavailable");
        }

        if (statusDot) {
            statusDot.classList.remove("down");
            statusDot.classList.add("ok");
        }

        if (statusText) {
            statusText.textContent = "SERVICE ONLINE";
        }

        return true;

    } catch (error) {

        if (statusDot) {
            statusDot.classList.remove("ok");
            statusDot.classList.add("down");
        }

        if (statusText) {
            statusText.textContent = "SERVICE OFFLINE";
        }

        return false;
    }
}


// ============================================================
// Button loading state
// ============================================================

function setLoading(isLoading) {

    if (!submitBtn) {
        return;
    }

    submitBtn.disabled = isLoading;

    if (isLoading) {
        submitBtn.classList.add("loading");
    } else {
        submitBtn.classList.remove("loading");
    }
}


// ============================================================
// Format feature names
// ============================================================

function formatFeatureName(name) {

    const names = {
        person_age: "Applicant age",
        person_income: "Annual income",
        person_home_ownership: "Home ownership",
        person_emp_length: "Employment length",
        loan_intent: "Loan purpose",
        loan_grade: "Loan grade",
        loan_amnt: "Loan amount",
        loan_int_rate: "Interest rate",
        loan_percent_income: "Loan-to-income ratio",
        cb_person_default_on_file: "Previous default",
        cb_person_cred_hist_length: "Credit history length"
    };

    return names[name] ||
        name
            .replaceAll("_", " ")
            .replace(/\b\w/g, char => char.toUpperCase());
}


// ============================================================
// Render prediction result
// ============================================================

function renderVerdict(data) {

    const verdict = document.querySelector(".verdict");

    if (!verdict) {
        return;
    }


    // Show result panel
    verdict.style.display = "block";


    // --------------------------------------------------------
    // Probability
    // --------------------------------------------------------

    const probability =
        Number(
            data.probability ??
            data.default_probability ??
            data.risk_probability ??
            0
        );


    const percentage =
        Math.max(0, Math.min(100, probability * 100));


    // --------------------------------------------------------
    // Gauge
    // --------------------------------------------------------

    const gaugeFill =
        document.querySelector(".gauge__fill");

    const gaugeNumber =
        document.querySelector(".gauge__number");

    const gaugePercent =
        document.querySelector(".gauge__percent");


    if (gaugeFill) {

        const circumference = 540.35;

        const offset =
            circumference -
            (percentage / 100) * circumference;

        gaugeFill.style.strokeDashoffset = offset;
    }


    if (gaugeNumber) {
        gaugeNumber.textContent =
            percentage.toFixed(0);
    }


    if (gaugePercent) {
        gaugePercent.textContent = "%";
    }


    // --------------------------------------------------------
    // Verdict / stamp
    // --------------------------------------------------------

    const stamp =
        document.querySelector(".stamp");


    const prediction =
        data.prediction ??
        data.verdict ??
        data.risk_level ??
        "";


    const predictionText =
        String(prediction).toLowerCase();


    if (stamp) {

        stamp.classList.remove(
            "risk-high",
            "stamp--in"
        );


        if (
            predictionText.includes("high") ||
            predictionText.includes("default") ||
            predictionText.includes("risk")
        ) {

            stamp.classList.add("risk-high");

        }


        // Restart animation
        void stamp.offsetWidth;

        stamp.classList.add("stamp--in");


        if (data.prediction !== undefined) {
            stamp.textContent = data.prediction;
        } else if (data.verdict !== undefined) {
            stamp.textContent = data.verdict;
        } else if (data.risk_level !== undefined) {
            stamp.textContent = data.risk_level;
        }
    }


    // --------------------------------------------------------
    // Ledger facts
    // --------------------------------------------------------

    const facts =
        document.querySelector(".ledger-facts");


    if (facts) {

        const probabilityFact =
            facts.querySelector(
                '[data-field="probability"]'
            );


        if (probabilityFact) {
            probabilityFact.textContent =
                `${percentage.toFixed(1)}%`;
        }
    }


    // --------------------------------------------------------
    // SHAP explanation
    // --------------------------------------------------------

    renderExplanation(data);
}


// ============================================================
// Render SHAP explanation
// ============================================================

function renderExplanation(data) {

    const list =
        document.querySelector(".risk-explanation__list");

    if (!list) {
        return;
    }


    // Try common API response names
    const explanations =
        data.explanations ??
        data.shap_explanations ??
        data.shap_values ??
        data.top_features ??
        [];


    if (!Array.isArray(explanations) || explanations.length === 0) {

        list.innerHTML = `
            <p class="explanation-empty">
                No feature-level explanation is available for this prediction.
            </p>
        `;

        return;
    }


    list.innerHTML = "";


    explanations.slice(0, 5).forEach((item, index) => {

        let feature;
        let value;
        let impact;


        if (typeof item === "object") {

            feature =
                item.feature ??
                item.name ??
                item.feature_name ??
                "Feature";

            value =
                item.value ??
                item.feature_value ??
                "";

            impact =
                item.impact ??
                item.shap_value ??
                item.contribution ??
                0;

        } else {

            feature = "Feature";
            value = "";
            impact = Number(item) || 0;
        }


        const numericImpact =
            Number(impact) || 0;


        const isRisk =
            numericImpact > 0;


        const itemElement =
            document.createElement("div");


        itemElement.className =
            `explanation-item ${
                isRisk
                    ? "explanation-item--risk"
                    : "explanation-item--safe"
            }`;


        const icon =
            isRisk ? "↑" : "↓";


        const direction =
            isRisk
                ? "Increases default risk"
                : "Reduces default risk";


        itemElement.innerHTML = `
            <div class="explanation-item__icon">
                ${icon}
            </div>

            <div class="explanation-item__content">

                <strong>
                    ${escapeHtml(formatFeatureName(feature))}
                </strong>

                <span>
                    ${direction}
                </span>

                <small>
                    Value: ${escapeHtml(String(value))}
                    · Impact: ${numericImpact.toFixed(4)}
                </small>

            </div>
        `;


        list.appendChild(itemElement);
    });
}


// ============================================================
// Escape HTML
// ============================================================

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// ============================================================
// Form submission
// ============================================================

form.addEventListener("submit", async function (event) {

    event.preventDefault();

    clearError();


    // --------------------------------------------------------
    // Validate inputs
    // --------------------------------------------------------

    const validation =
        checkInputs();


    if (validation.error) {

        showError(validation.error);

        return;
    }


    // --------------------------------------------------------
    // Recalculate ratio before sending
    // --------------------------------------------------------

    recalcPercent();


    // --------------------------------------------------------
    // Build request payload
    // --------------------------------------------------------

    const payload = {

        person_age:
            Number(
                document.getElementById("person_age").value
            ),

        person_income:
            Number(
                document.getElementById("person_income").value
            ),

        person_home_ownership:
            document.getElementById(
                "person_home_ownership"
            ).value,

        person_emp_length:
            Number(
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
            Number(
                document.getElementById(
                    "loan_amnt"
                ).value
            ),

        loan_int_rate:
            Number(
                document.getElementById(
                    "loan_int_rate"
                ).value
            ),

        loan_percent_income:
            Number(
                document.getElementById(
                    "loan_percent_income"
                ).value
            ),

        cb_person_default_on_file:
            document.getElementById(
                "cb_person_default_on_file"
            ).value,

        cb_person_cred_hist_length:
            Number(
                document.getElementById(
                    "cb_person_cred_hist_length"
                ).value
            )
    };


    // --------------------------------------------------------
    // Loading
    // --------------------------------------------------------

    setLoading(true);


    try {

        const response =
            await fetch("/predict", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(payload)
            });


        let data;

        try {
            data = await response.json();
        } catch {
            data = {};
        }


        // ----------------------------------------------------
        // API error
        // ----------------------------------------------------

        if (!response.ok) {

            const message =
                data.detail ??
                data.message ??
                "Unable to process the prediction.";

            throw new Error(message);
        }


        // ----------------------------------------------------
        // Render result
        // ----------------------------------------------------

        renderVerdict(data);


        // Scroll smoothly to result
        const verdict =
            document.querySelector(".verdict");

        if (verdict) {

            verdict.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }


    } catch (error) {

        console.error("Prediction error:", error);

        showError(
            error.message ||
            "Something went wrong while making the prediction."
        );

    } finally {

        setLoading(false);
    }

});


// ============================================================
// Initial page setup
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    // Hide error initially
    if (errorNote) {
        errorNote.style.display = "none";
    }


    // Hide verdict until prediction
    const verdict =
        document.querySelector(".verdict");

    if (verdict) {
        verdict.style.display = "none";
    }


    // Check FastAPI service
    checkService();

});