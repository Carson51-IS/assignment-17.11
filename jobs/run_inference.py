"""Backward-compatible entrypoint — fraud scoring (see run_fraud_inference.py)."""

from run_fraud_inference import run_fraud_inference

if __name__ == "__main__":
    n = run_fraud_inference()
    print(f"Inference complete. Predictions written: {n}")
