"""Hugging Face Gradio entry point.

The Expo app uses the FastAPI routes imported from ``main``. Gradio provides
the free Spaces runtime and a small browser-facing health check at ``/ui``.
"""

import os

import gradio as gr
import uvicorn
from fastapi import FastAPI

from main import app as api_app


def health_message():
    return "FastAPI backend is running. Use /health to inspect model status."


demo = gr.Interface(
    fn=health_message,
    inputs=[],
    outputs=gr.Textbox(label="Status"),
    title="ReLeaf Waste Identification API",
    description="The mobile app uses the FastAPI endpoints on this Space.",
    api_name=False,
)

app: FastAPI = gr.mount_gradio_app(api_app, demo, path="/ui")


if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "7860")),
    )
