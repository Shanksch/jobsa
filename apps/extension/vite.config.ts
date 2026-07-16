import { defineConfig, createLogger } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import manifest from "./manifest.json";

const logger = createLogger();
const originalWarn = logger.warn;
logger.warn = (msg, options) => {
  if (msg.includes("optimizeDeps.esbuildOptions")) return;
  originalWarn(msg, options);
};

export default defineConfig({
  customLogger: logger,
  plugins: [
    react(),
    tailwindcss(),
    crx({ manifest }),
  ],
  server: {
    port: 5174,
    strictPort: true,
    hmr: {
      port: 5174,
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
