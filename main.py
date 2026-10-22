from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

import joblib
import pandas as pd
import shap
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent

ml_model = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    model = joblib.load(BASE_DIR / "model.pkl")
    ml_model["model"] = model
    ml_model["threshold"] = float(joblib.load(BASE_DIR / "best_threshold.pkl"))

    # Build the SHAP explainers once (one per calibration fold)
    ml_model["explainers"] = []
    for calibrated in model.calibrated_classifiers_:
        pipeline = calibrated.estimator
        ml_model["explainers"].append((
            pipeline.named_steps["preprocessor"],
            shap.TreeExplainer(pipeline.named_steps["classifier"]),
        ))

    yield

    ml_model.clear()


app = FastAPI(lifespan=lifespan)


class LoanApplication(BaseModel):
    person_age: int = Field(ge=18, le=100)
    person_income: float = Field(gt=0)
    person_home_ownership: Literal["RENT", "OWN", "MORTGAGE", "OTHER"]
    person_emp_length: float = Field(ge=0, le=60)
    loan_intent: Literal["PERSONAL", "EDUCATION", "MEDICAL", "VENTURE",
                         "HOMEIMPROVEMENT", "DEBTCONSOLIDATION"]
    loan_grade: Literal["A", "B", "C", "D", "E", "F", "G"]
    loan_amnt: float = Field(gt=0)
    loan_int_rate: float = Field(ge=0, le=100)
    cb_person_default_on_file: Literal["Y", "N"]
    cb_person_cred_hist_length: int = Field(ge=0)
    # loan_percent_income is computed on the server, not sent by the client


def get_risk_explanation(input_df: pd.DataFrame):
    """Top 5 factors behind the prediction, averaged over all calibration folds."""
    columns_by_length = sorted(input_df.columns, key=len, reverse=True)

    def original_column(transformed_name: str) -> str:
        clean = transformed_name.split("__", 1)[-1]
        for col in columns_by_length:
            if clean == col or clean.startswith(col + "_"):
                return col
        return clean

    totals = {}
    explainers = ml_model["explainers"]

    for preprocessor, explainer in explainers:
        transformed = preprocessor.transform(input_df)
        names = preprocessor.get_feature_names_out()

        values = explainer.shap_values(transformed)
        if isinstance(values, list):
            values = values[-1]
        values = values[0]

        for name, value in zip(names, values):
            col = original_column(name)
            totals[col] = totals.get(col, 0.0) + float(value)

    contributions = {col: total / len(explainers) for col, total in totals.items()}
    top = sorted(contributions.items(), key=lambda x: abs(x[1]), reverse=True)[:5]

    return [
        {
            "feature": feature,
            "impact": round(abs(value), 4),
            "direction": "increases" if value > 0 else "reduces",
        }
        for feature, value in top
    ]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict")
def predict(data: LoanApplication):
    record = data.model_dump()
    record["loan_percent_income"] = round(record["loan_amnt"] / record["person_income"], 2)
    input_df = pd.DataFrame([record])

    probability = float(ml_model["model"].predict_proba(input_df)[:, 1][0])
    threshold = ml_model["threshold"]
    prediction = int(probability >= threshold)

    try:
        explanations = get_risk_explanation(input_df)
    except Exception as e:
        print(f"Explanation failed: {e}")
        explanations = []

    return {
        "default_probability": probability,
        "default_prediction": prediction,
        "threshold": threshold,
        "Result": "High Risk" if prediction == 1 else "Low Risk",
        "explanations": explanations,
    }


app.mount("/", StaticFiles(directory=BASE_DIR / "static", html=True), name="static")