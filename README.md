# 💳 Explainable Credit Risk Assessment

> An end-to-end machine learning project that predicts the probability of loan default and explains why an applicant is classified as high or low risk.

## 🚀 Live Demo

**[Try the Credit Risk Assessment App](https://credit-risk-assessment-p6no.onrender.com)**

The application is deployed using Render and provides a web interface for submitting loan applicant information and receiving a credit-risk prediction.

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
