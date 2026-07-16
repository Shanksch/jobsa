import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client

from app.config import settings

security = HTTPBearer()

supabase = None
if settings.supabase_configured:
    supabase = create_client(
        settings.supabase_url,
        settings.supabase_service_role_key or settings.supabase_anon_key,
    )

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Validate the JWT from the Authorization header and return the UserProfile dictionary.
    Creates a new UserProfile in Supabase if one doesn't exist for this authenticated user.
    """
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase is not configured.",
        )

    token = credentials.credentials
    try:
        # Use the supabase client to get user by JWT
        res = supabase.auth.get_user(token)
        user = res.user
        if not user or not user.email:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}"
        )

    # Find profile in Supabase
    profile_res = supabase.table("user_profiles").select("*").eq("id", user.id).execute()
    profiles = profile_res.data

    if not profiles:
        # Create profile
        new_profile = {
            "id": user.id,
            "email": user.email,
            "full_name": user.user_metadata.get("full_name", "User"),
            "summary": "Career profile summary",
        }
        insert_res = supabase.table("user_profiles").insert(new_profile).execute()
        return insert_res.data[0]
    
    return profiles[0]
