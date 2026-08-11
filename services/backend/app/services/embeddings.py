"""
Embeddings client wrapper.

Uses Google GenAI SDK to generate embeddings via gemini-embedding-001,
truncating vectors to 768 dimensions using Matryoshka representation learning.
Applies manual L2 normalization to the truncated vectors.
"""

import math
from google import genai
from google.genai import types
import structlog
from typing import cast
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.config import settings
from langfuse import observe

logger = structlog.get_logger()

# We initialize the client inside or at module level, but we need the API key to be set.
# The API key is propagated to os.environ["GEMINI_API_KEY"] in config.py.
client = genai.Client()

@observe(name="embed-texts")
@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    # In a real app we'd filter for 429/5xx, but for safety retry any Exception briefly
)
async def embed_texts(texts: list[str], task_type: str = "RETRIEVAL_DOCUMENT") -> list[list[float]]:
    """
    Embed a batch of strings using Gemini.
    Returns one vector per input string, truncated to 768 dimensions and L2 normalized.
    """
    if not texts:
        return []

    try:
        response = await client.aio.models.embed_content(
            model=settings.embedding_model,
            contents=texts,
            config=types.EmbedContentConfig(
                output_dimensionality=settings.embedding_dimensions,
                task_type=task_type,
            )
        )
        
        vectors = []
        for embedding_obj in response.embeddings:
            vector = embedding_obj.values
            
            # Manual L2 normalization is required for gemini-embedding-001 truncated vectors
            norm = math.sqrt(sum(v * v for v in vector))
            if norm > 0:
                vector = [v / norm for v in vector]
                
            vectors.append(vector)
            
        return vectors
    except Exception as e:
        logger.error("embedding_generation_failed", error=str(e))
        raise  # Let tenacity retry it

async def embed_text(text: str, task_type: str = "RETRIEVAL_DOCUMENT") -> list[float]:
    """Embed a single string."""
    vectors = await embed_texts([text], task_type=task_type)
    if vectors and len(vectors) > 0:
        return vectors[0]
    return []

def start_embedding_keep_alive():
    """No-op. Kept for backwards compatibility with main.py"""
    pass
