"""
File storage service — abstracts storage backend.

Uses Supabase Storage when configured, falls back to local filesystem.
Designed for easy swap between storage providers.
"""

import os
import uuid
from pathlib import Path

import structlog

from app.config import settings

logger = structlog.get_logger()


class StorageService:
    """File storage abstraction over Supabase Storage or local filesystem."""

    def __init__(self) -> None:
        self._supabase_client = None
        if settings.supabase_configured:
            try:
                from supabase import create_client

                self._supabase_client = create_client(
                    settings.supabase_url,
                    settings.supabase_service_role_key or settings.supabase_anon_key,
                )

                try:
                    # Ensure bucket exists
                    buckets = self._supabase_client.storage.list_buckets()
                    if settings.supabase_storage_bucket not in [b.name for b in buckets]:
                        self._supabase_client.storage.create_bucket(
                            settings.supabase_storage_bucket, options={"public": False}
                        )
                except Exception as e:
                    logger.warning("supabase_bucket_init_failed", error=str(e))

                logger.info("storage_initialized", backend="supabase")
            except Exception as e:
                logger.warning("supabase_storage_init_failed", error=str(e))
        else:
            logger.info("storage_initialized", backend="local")

    @property
    def _is_supabase(self) -> bool:
        return self._supabase_client is not None

    async def upload(
        self,
        file_bytes: bytes,
        original_filename: str,
        profile_id: str,
        content_type: str = "application/octet-stream",
    ) -> str:
        """Upload a file and return the storage path."""
        file_id = str(uuid.uuid4())[:8]
        safe_name = original_filename.replace(" ", "_")
        storage_path = f"{profile_id}/{file_id}_{safe_name}"

        if self._is_supabase:
            bucket = settings.supabase_storage_bucket
            self._supabase_client.storage.from_(bucket).upload(
                path=storage_path,
                file=file_bytes,
                file_options={"content-type": content_type},
            )
            logger.info("file_uploaded", backend="supabase", path=storage_path)
        else:
            local_dir = Path("uploads") / profile_id
            local_dir.mkdir(parents=True, exist_ok=True)
            local_path = local_dir / f"{file_id}_{safe_name}"
            local_path.write_bytes(file_bytes)
            storage_path = str(local_path)
            logger.info("file_uploaded", backend="local", path=storage_path)

        return storage_path

    async def download(self, storage_path: str) -> bytes:
        """Download a file by its storage path."""
        if self._is_supabase:
            bucket = settings.supabase_storage_bucket
            return self._supabase_client.storage.from_(bucket).download(storage_path)
        else:
            local_path = Path(storage_path)
            if not local_path.exists():
                raise FileNotFoundError(f"File not found: {storage_path}")
            return local_path.read_bytes()

    async def delete(self, storage_path: str) -> None:
        """Delete a file by its storage path."""
        if self._is_supabase:
            bucket = settings.supabase_storage_bucket
            self._supabase_client.storage.from_(bucket).remove([storage_path])
            logger.info("file_deleted", backend="supabase", path=storage_path)
        else:
            local_path = Path(storage_path)
            if local_path.exists():
                os.remove(local_path)
                logger.info("file_deleted", backend="local", path=storage_path)


# Singleton instance
storage_service = StorageService()
