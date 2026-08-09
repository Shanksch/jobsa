"""
Embeddings client wrapper.

Uses Hugging Face's Free Inference API to fit within the 512MB RAM limit.
To eliminate the "cold start" lag (model inactivity), we include a
background task that pings the model every few minutes to keep it warm.
"""

import asyncio
import os
from typing import cast

import httpx
import structlog

logger = structlog.get_logger()

EMBEDDING_API_URL = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIM = 384


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Embed a batch of strings using the Hugging Face Free Inference API.
    Returns one vector per input string.
    """
    if not texts:
        return []

    headers = {}
    hf_token = os.environ.get("HUGGINGFACE_API_KEY")
    if hf_token:
        headers["Authorization"] = f"Bearer {hf_token}"

    async with httpx.AsyncClient() as client:
        # Retry logic for cold starts (503) and connection errors
        max_retries = 5
        for attempt in range(max_retries):
            try:
                response = await client.post(
                    EMBEDDING_API_URL,
                    headers=headers,
                    json={"inputs": texts, "options": {"wait_for_model": True}},
                    timeout=60.0,
                )
            except httpx.RequestError as exc:
                logger.warning("embedding_api_request_error", error=str(exc))
                if attempt < max_retries - 1:
                    await asyncio.sleep(2.0)
                    continue
                return []  # Gracefully fail

            if response.status_code == 200:
                result = response.json()
                return cast("list[list[float]]", result)

            elif response.status_code == 503:
                # Model is loading, wait and retry
                try:
                    error_data = response.json()
                    wait_time = error_data.get("estimated_time", 10.0)
                except Exception:
                    wait_time = 10.0

                wait_time = min(wait_time, 10.0)
                await asyncio.sleep(wait_time)
            else:
                logger.warning(
                    "embedding_api_failed", status=response.status_code, body=response.text[:200]
                )
                return []  # Gracefully fail

        return []  # Gracefully fail if max retries exceeded


async def embed_text(text: str) -> list[float]:
    """Embed a single string."""
    vectors = await embed_texts([text])
    if vectors and len(vectors) > 0:
        return vectors[0]
    return []


async def _keep_alive_task():
    """Pings the HF model every 4 minutes to prevent it from going to sleep."""
    while True:
        try:
            # Send a tiny dummy request to keep the model warm in HF's cache
            logger.info("pinging_huggingface_api_to_keep_warm")
            await embed_text("keep_warm")
        except Exception as e:
            logger.warning("huggingface_keep_alive_failed", error=str(e))
        # Hugging Face usually unloads models after ~5-10 minutes of inactivity
        await asyncio.sleep(240)


def start_embedding_keep_alive():
    """
    Call this from your FastAPI application startup event (lifespan)
    to ensure the Hugging Face model never goes to sleep.
    """
    asyncio.create_task(_keep_alive_task())
