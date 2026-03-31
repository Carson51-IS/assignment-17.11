import json
from datetime import datetime, timezone

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from config import ARTIFACTS_DIR, METRICS_PATH, MODEL_METADATA_PATH, MODEL_PATH, WH_DB_PATH
from utils_db import sqlite_conn

MODEL_VERSION = "1.0.0"


def train_and_save() -> None:
    with sqlite_conn(WH_DB_PATH) as conn:
        df = pd.read_sql("SELECT * FROM modeling_orders", conn)

    label_col = "label_late_delivery"

    feature_cols = [c for c in df.columns if c != label_col]
    X = df[feature_cols]
    y = df[label_col].astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    numeric_features = [
        "num_items",
        "total_value",
        "avg_line_price",
        "customer_age",
        "order_dow",
        "order_month",
    ]
    categorical_features = ["gender"]

    numeric_pipe = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
        ]
    )

    categorical_pipe = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_pipe, numeric_features),
            ("cat", categorical_pipe, categorical_features),
        ],
        remainder="drop",
    )

    clf = LogisticRegression(max_iter=2000)

    model = Pipeline(
        steps=[
            ("prep", preprocessor),
            ("clf", clf),
        ]
    )

    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "f1": float(f1_score(y_test, y_pred)),
        "roc_auc": float(roc_auc_score(y_test, y_prob)),
        "row_count_train": int(len(X_train)),
        "row_count_test": int(len(X_test)),
    }

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    joblib.dump(model, str(MODEL_PATH))

    metadata = {
        "model_version": MODEL_VERSION,
        "trained_at_utc": datetime.now(timezone.utc).isoformat(),
        "feature_list": feature_cols,
        "label": label_col,
        "warehouse_table": "modeling_orders",
        "warehouse_rows": int(len(df)),
    }

    with open(MODEL_METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    with open(METRICS_PATH, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print("Training complete.")
    print(f"Saved model: {MODEL_PATH}")
    print(f"Saved metadata: {MODEL_METADATA_PATH}")
    print(f"Saved metrics: {METRICS_PATH}")


if __name__ == "__main__":
    train_and_save()
