/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Chrome Extension API types (used via externally_connectable)
declare namespace chrome {
  namespace runtime {
    const lastError: { message: string } | undefined;
    function sendMessage(
      extensionId: string,
      message: any,
      callback?: (response: any) => void
    ): void;
  }
}
