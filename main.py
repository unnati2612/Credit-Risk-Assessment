from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import joblib
import shap
from contextlib import asynccontextmanager
from fastapi.staticfiles import StaticFiles


ml_model = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    ml_model["model"] = joblib.load("model.pkl")
    ml_model["threshold"] = joblib.load("best_threshold.pkl")

    yield

    ml_model.clear()


app = FastAPI(lifespan=lifespan)


class LoanApplication(BaseModel):
    person_age: int
    person_income: float
    person_home_ownership: str
    person_emp_length: float
    loan_intent: str
    loan_grade: str
    loan_amnt: float
    loan_int_rate: float
    loan_percent_income: float
    cb_person_default_on_file: str
    cb_person_cred_hist_length: int


def get_risk_explanation(input_df):
    """
    Explain the main factors contributing to the risk prediction.
    """

    calibrated_model = ml_model["model"]

    # Get the underlying trained pipeline
    calibrated_classifier = calibrated_model.calibrated_classifiers_[0]
    pipeline = calibrated_classifier.estimator

    # Separate preprocessing and XGBoost model
    preprocessor = pipeline.named_steps["preprocessor"]
    xgb_model = pipeline.named_steps["classifier"]

    # Transform input using the same preprocessing used during training
    transformed_input = preprocessor.transform(input_df)

    # Get feature names after one-hot encoding
    feature_names = preprocessor.get_feature_names_out()

    # SHAP explanation for the XGBoost model
    explainer = shap.TreeExplainer(xgb_model)
    shap_values = explainer.shap_values(transformed_input)

    # Make sure we have a simple 1D array
    if isinstance(shap_values, list):
        shap_values = shap_values[0]

    shap_values = shap_values[0]

    # Map transformed features back to original features
    original_features = list(input_df.columns)

    feature_contributions = {}

    for feature_name, shap_value in zip(feature_names, shap_values):

        # Remove transformer prefix
        clean_name = feature_name.split("__", 1)[-1]

        original_feature = clean_name

        # Find which original column this transformed feature belongs to
        for column in original_features:
            if clean_name == column or clean_name.startswith(column + "_"):
                original_feature = column
                break

        feature_contributions[original_feature] = (
            feature_contributions.get(original_feature, 0)
            + float(shap_value)
        )

    # Sort by absolute impact
    sorted_features = sorted(
        feature_contributions.items(),
        key=lambda x: abs(x[1]),
        reverse=True
    )

    explanations = []

    for feature, contribution in sorted_features[:5]:

        if contribution > 0:
            direction = "increases"
        else:
            direction = "reduces"

        explanations.append({
            "feature": feature,
            "impact": round(abs(contribution), 4),
            "direction": direction
        })

    return explanations


@app.post("/predict")
def predict(data: LoanApplication):

    input_df = pd.DataFrame([data.model_dump()])

    # Final calibrated probability
    probability = float(
        ml_model["model"].predict_proba(input_df)[:, 1][0]
    )

    threshold = float(ml_model["threshold"])

    prediction = int(probability >= threshold)

    # SHAP-based explanation
    explanations = get_risk_explanation(input_df)

    return {
        "default_probability": probability,
        "default_prediction": prediction,
        "threshold": threshold,
        "Result": "High Risk" if prediction == 1 else "Low Risk",
        "explanations": explanations
    }


app.mount(
    "/",
    StaticFiles(directory="static", html=True),
    name="static"
)