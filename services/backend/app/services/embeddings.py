"""
Embeddings client wrapper.

Uses fastembed to generate vectors locally with nomic-ai/nomic-embed-text-v1.5 (768 dims).
"""

from fastembed import TextEmbedding
import asyncio
from concurrent.futures import ThreadPoolExecutor

EMBEDDING_MODEL = "nomic-ai/nomic-embed-text-v1.5"
EMBEDDING_DIM = 768

# Initialize globally so model is loaded once
_embedding_model = None
_executor = ThreadPoolExecutor(max_workers=2)

def _get_model():
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = TextEmbedding(model_name=EMBEDDING_MODEL, threads=1)
    return _embedding_model

def _embed_sync(texts: list[str]) -> list[list[float]]:
    model = _get_model()
    # model.embed returns a generator of numpy arrays
    embeddings = list(model.embed(texts))
    return [e.tolist() for e in embeddings]

async def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Embed a batch of strings. Returns one vector per input string, in
    the same order as the input. Empty input returns an empty list.
    """
    if not texts:
        return []
        
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, _embed_sync, texts)

async def embed_text(text: str) -> list[float]:
    """Embed a single string."""
    vectors = await embed_texts([text])
    return vectors[0]