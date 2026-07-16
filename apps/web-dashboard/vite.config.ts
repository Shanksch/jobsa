import { defineConfig, createLogger } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const logger = createLogger();
const originalWarn = logger.warn;
logger.warn = (msg, options) => {
  if (msg.includes("optimizeDeps.esbuildOptions")) return;
  originalWarn(msg, options);
};

export default defineConfig({
  customLogger: logger,
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
