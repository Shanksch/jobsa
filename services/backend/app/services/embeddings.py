"""
Embeddings client wrapper.

Uses Hugging Face's Free Inference API to offload embedding generation,
since local models (fastembed/onnxruntime) require more RAM than the
512MB limit available on the free Render tier.
"""

import asyncio
import os

import httpx

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
                    EMBEDDING_API_URL, headers=headers, json={"inputs": texts}, timeout=30.0
                )
            except httpx.RequestError as exc:
                print(f"Embedding API request error: {exc}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(2.0)
                    continue
                return []  # Gracefully fail so autofill can continue with base profile

            if response.status_code == 200:
                result = response.json()
                # The API returns a list of lists of floats
                return result

            elif response.status_code == 503:
                # Model is loading, wait and retry
                try:
                    error_data = response.json()
                    wait_time = error_data.get("estimated_time", 10.0)
                except Exception:
                    wait_time = 10.0

                # Cap the wait time to avoid hanging too long
                wait_time = min(wait_time, 10.0)
                await asyncio.sleep(wait_time)
            else:
                print(f"Embedding API failed with status {response.status_code}: {response.text}")
                return []  # Gracefully fail

        return []  # Gracefully fail if max retries exceeded


async def embed_text(text: str) -> list[float]:
    """Embed a single string."""
    vectors = await embed_texts([text])
    if vectors and len(vectors) > 0:
        return vectors[0]
    return []
