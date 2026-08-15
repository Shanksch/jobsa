"""
LiteLLM Router — model_list built from Settings, so model names, API
keys, and fallbacks all trace back to app.config as the single source
of truth instead of a second YAML file to keep in sync.
"""

from litellm import Router

from app.config import settings

router = Router(
    model_list=[
        {
            "model_name": "jobsa-autofill",
            "litellm_params": {
                "model": settings.autofill_primary_model,
                "api_key": settings.gemini_api_key,
            },
        },
        {
            "model_name": "jobsa-autofill-fallback",
            "litellm_params": {
                "model": settings.autofill_fallback_model,
                "api_key": settings.groq_api_key,
            },
        },
        {
            "model_name": "jobsa-match",
            "litellm_params": {
                "model": settings.match_primary_model,
                "api_key": settings.gemini_api_key,
            },
        },
        {
            "model_name": "jobsa-match-fallback",
            "litellm_params": {
                "model": settings.match_fallback_model,
                "api_key": settings.groq_api_key,
            },
        },
    ],
    fallbacks=[
        {"jobsa-autofill": ["jobsa-autofill-fallback"]},
        {"jobsa-match": ["jobsa-match-fallback"]},
    ],
)
