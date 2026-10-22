# 💳 Explainable Credit Risk Assessment

An end-to-end machine learning project that predicts the probability of loan default and explains **why** an applicant is classified as high or low risk.

The project combines machine learning, probability calibration, threshold optimization, SHAP explainability, and a FastAPI-based deployment to create an interpretable credit risk assessment system.

---

## 📌 Project Overview

When a bank evaluates a loan application, it needs to identify applicants who are likely to default while avoiding unnecessary rejection of low-risk applicants.

This project takes information about a loan applicant and:

- Predicts the probability of loan default
- Classifies the applicant as **High Risk** or **Low Risk**
- Provides interpretable insights into the factors influencing the prediction
- Uses a tuned XGBoost model for improved performance
- Uses probability calibration to make predicted probabilities more reliable
- Uses SHAP for model explainability
- Exposes the trained model through a FastAPI API

The complete pipeline covers data cleaning, preprocessing, model development, evaluation, explainability, and deployment.

---

## 🎯 Problem Statement

The objective is to predict whether a loan applicant is likely to default.

### Target Variable

`loan_status`

- `0` → Loan repaid / No default
- `1` → Loan default

The dataset contains approximately **32,581 loan applications**, with around **22% default cases**, making this an imbalanced classification problem.

---

## 📊 Dataset

The dataset contains **12 columns** describing the applicant and loan.

Important features include:

| Feature | Description |
|---|---|
| `person_age` | Age of the applicant |
| `person_income` | Annual income |
| `person_home_ownership` | Home ownership status |
| `person_emp_length` | Employment length |
| `loan_intent` | Purpose of the loan |
| `loan_grade` | Loan grade |
| `loan_amnt` | Loan amount |
| `loan_int_rate` | Loan interest rate |
| `loan_status` | Target variable |
| `loan_percent_income` | Loan amount as a percentage of income |
| `cb_person_default_on_file` | Previous credit default history |
| `cb_person_cred_hist_length` | Length of credit history |

---

## 🔄 Machine Learning Pipeline

```text
Raw Dataset
     ↓
Data Exploration & EDA
     ↓
Data Cleaning
     ↓
Train-Test Split
     ↓
Preprocessing Pipeline
     ↓
Baseline Model
(Logistic Regression)
     ↓
XGBoost Model
     ↓
5-Fold Cross-Validation
     ↓
Hyperparameter Tuning
     ↓
Probability Calibration
     ↓
Threshold Optimization
     ↓
SHAP Explainability
     ↓
FastAPI Deployment
```

---

## 🧹 Data Cleaning

During exploratory data analysis, several data quality issues were identified.

Examples included:

- Impossible ages such as `144`
- Unrealistic employment lengths such as `123 years`
- Duplicate records
- Missing interest rates
- Missing employment lengths
- Zero loan amounts

The dataset was cleaned by removing duplicates and invalid values, resulting in approximately **31,522 clean records**.

---

## ⚙️ Data Preprocessing

The project uses a preprocessing pipeline to ensure that the same transformations are applied during both training and production.

The pipeline handles:

- Missing numerical values using median imputation
- Categorical variables using One-Hot Encoding
- Numerical feature scaling where required
- Unknown categorical values during inference

A `ColumnTransformer` is used to apply appropriate preprocessing to numerical and categorical features, while the complete preprocessing and model workflow is combined inside a pipeline.

---

## 🤖 Models

Two classification approaches were evaluated.

### 1. Logistic Regression

Logistic Regression was used as the baseline model because it is:

- Simple
- Fast
- Easy to interpret
- A useful benchmark for evaluating more complex models

### 2. XGBoost

XGBoost was selected as the final model because it can capture nonlinear relationships and feature interactions effectively in tabular data.

Using 5-fold stratified cross-validation:

| Model | ROC-AUC |
|---|---:|
| Logistic Regression | **0.87** |
| XGBoost | **0.94** |

XGBoost clearly outperformed the baseline model.

---

## 🔍 Hyperparameter Tuning

XGBoost was further optimized using `RandomizedSearchCV`.

The search evaluated:

- 150 parameter combinations
- 5-fold cross-validation
- Approximately 750 model training/evaluation runs

Average Precision was used as the optimization metric because the dataset contains relatively fewer default cases.

---

## 📈 Model Performance

On the final test set:

| Metric | Logistic Regression | Tuned XGBoost |
|---|---:|---:|
| Accuracy | 0.82 | **0.92** |
| Precision | 0.56 | **0.84** |
| Recall | 0.79 | **0.80** |
| F1 Score | 0.65 | **0.82** |

The tuned XGBoost model provided a significant improvement over the baseline.

---

## 🎚️ Threshold Optimization

Machine learning models produce probabilities rather than directly making business decisions.

Instead of automatically using the default threshold of `0.50`, the project optimized the classification threshold using the precision-recall relationship.

The selected threshold was:

```text
0.76
```

At this threshold:

- Precision → **0.98**
- Recall → **0.73**
- F1 Score → **0.83**

This creates a stricter definition of a high-risk applicant and significantly reduces false alarms.

The threshold is stored separately in:

```text
best_threshold.pkl
```

This makes it possible to change the business decision threshold without retraining the entire model.

---

## 🎯 Probability Calibration

Because class weighting was used to handle the imbalanced dataset, the raw model probabilities were not perfectly calibrated.

For example, some applicants predicted at approximately 45% risk had an actual default rate closer to 20%.

To address this, **Sigmoid Calibration (Platt Scaling)** with 5-fold cross-validation was applied.

The goal was to make predicted probabilities more closely represent actual probabilities.

---

## 🔎 Explainability with SHAP

A major focus of this project is interpretability.

The project uses **SHAP (SHapley Additive exPlanations)** to understand how individual features influence predictions.

### Important Risk Drivers

The major features influencing predictions included:

1. Loan-to-income ratio
2. Income
3. Interest rate

Higher loan-to-income ratios and higher interest rates generally increased predicted risk, while higher income reduced risk.

Loan grades and home ownership also influenced predictions.

### Global Explainability

SHAP summary analysis shows which features are most influential across the entire dataset.

### Local Explainability

A SHAP waterfall plot can explain why a particular applicant received a specific prediction.

---

## 🚨 Error Analysis

The project also analyzes classification errors rather than relying only on accuracy.

On the test set, the model produced:

- **211 false positives**
- **274 false negatives**

A false negative in this context means a risky applicant was classified as safe, which can represent a significant financial risk for a lender.

This is also why threshold selection is an important business decision.

---

## 🚀 Deployment

The trained model is deployed using **FastAPI**.

### API Endpoint

```text
POST /predict
```

The endpoint accepts the applicant's information and returns:

- Default probability
- Classification threshold
- Prediction
- Risk category

The application uses **Pydantic** for input validation.

The trained model and threshold are loaded using `joblib`.

### Application Flow

```text
User Input
    ↓
FastAPI
    ↓
Pydantic Validation
    ↓
Preprocessing Pipeline
    ↓
Calibrated XGBoost Model
    ↓
Default Probability
    ↓
Threshold = 0.76
    ↓
High Risk / Low Risk
```

The project also contains an HTML/CSS/JavaScript frontend that communicates with the `/predict` endpoint.

The application has been deployed using Render.

---

## 🗂️ Project Structure

```text
Credit-Risk-Assessment/
│
├── credit_risk_dataset.csv
├── model.ipynb
├── model.pkl
├── best_threshold.pkl
├── main.py
├── requirements.txt
├── .python-version
├── .gitignore
└── README.md
```

> The `static/` frontend directory is intentionally excluded from the public GitHub repository.

### File Description

| File | Purpose |
|---|---|
| `credit_risk_dataset.csv` | Training dataset |
| `model.ipynb` | EDA, preprocessing, model training, tuning, calibration and analysis |
| `model.pkl` | Saved trained model/pipeline |
| `best_threshold.pkl` | Saved optimized decision threshold |
| `main.py` | FastAPI application |
| `requirements.txt` | Python dependencies |
| `.python-version` | Python runtime version |
| `.gitignore` | Files excluded from Git |
| `README.md` | Project documentation |

The project documentation identifies the notebook, dataset, saved model, threshold, FastAPI application, dependencies, runtime configuration and deployment configuration as the main project components.

---

## 🛠️ Technologies Used

### Programming Language

- Python

### Machine Learning

- Scikit-learn
- XGBoost
- SHAP

### Data Analysis

- Pandas
- NumPy
- Matplotlib
- Seaborn

### Backend & Deployment

- FastAPI
- Pydantic
- Joblib
- Render

### Development Tools

- Jupyter Notebook
- VS Code
- Git
- GitHub

---

## ⚙️ Installation

Clone the repository:

```bash
git clone https://github.com/unnati2612/Credit-Risk-Assessment.git
```

Navigate to the project:

```bash
cd Credit-Risk-Assessment
```

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it on Windows:

```bash
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

## ▶️ Run the Application

Start the FastAPI application:

```bash
python main.py
```

The application will start locally and provide the URL in the terminal.

The API endpoint is:

```text
/predict
```

---

## 📌 Key Learnings

Through this project, I learned how to build an end-to-end machine learning system rather than only training a model.

Key learnings include:

- Handling imbalanced classification problems
- Building preprocessing pipelines
- Preventing data leakage
- Comparing baseline and advanced models
- Hyperparameter tuning
- Probability calibration
- Decision threshold optimization
- Model explainability using SHAP
- Error analysis
- Building APIs using FastAPI
- Deploying machine learning applications

---

## 🔮 Future Improvements

Possible improvements include:

- Select the decision threshold using real financial costs rather than only F1 score
- Add fairness and bias analysis
- Add data drift monitoring
- Validate the model on real-world banking data
- Integrate SHAP explanations directly into the web interface
- Add automated model retraining
- Add authentication and API security

These are important considerations for taking the project from a portfolio implementation toward a production-grade credit risk system.

---

## 👩‍💻 Author

**Unnati Salampuria**

B.Tech – Computer Science & Engineering (Artificial Intelligence)

GitHub: `unnati2612`

---

⭐ If you found this project useful, consider giving the repository a star.
