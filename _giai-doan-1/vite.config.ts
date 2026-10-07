import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";

import { fileURLToPath } from "node:url";

export default defineConfig({
  server: { host: true },
  resolve: {
    alias: {
      "react-router/dom": fileURLToPath(
        new URL(
          "./node_modules/react-router/dist/production/dom-export.mjs",
          import.meta.url,
        ),
      ),
      "react-router": fileURLToPath(
        new URL(
          "./node_modules/react-router/dist/production/index.mjs",
          import.meta.url,
        ),
      ),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    visualizer({
      template: "raw-data",
      filename: "dist/stats.json",
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  base: "./",
  esbuild: {
    legalComments: "none",
    drop: ["debugger"],
  },
  build: {
    target: "es2022",
    minify: "terser",
    terserOptions: {
      compress: {
        passes: 2,
        drop_debugger: true,
      },
      format: {
        comments: false,
      },
    },
    assetsInlineLimit: 4096,
    cssMinify: true,
    rollupOptions: {
      output: {
        chunkFileNames(chunkInfo) {
          const id = chunkInfo.facadeModuleId || "";
          const normalized = id.replace(/\\/g, "/");
          if (normalized.includes("/src/lessons/lesson1/"))
            return "assets/lesson1-[hash].js";
          if (normalized.includes("/src/lessons/lesson2/"))
            return "assets/lesson2-[hash].js";
          if (normalized.includes("/src/lessons/lesson3/"))
            return "assets/lesson3-[hash].js";
          if (normalized.includes("/src/lessons/lesson4/"))
            return "assets/lesson4-[hash].js";
          if (normalized.includes("/src/lessons/lesson5/"))
            return "assets/lesson5-[hash].js";
          return "assets/[name]-[hash].js";
        },
        entryFileNames: "assets/index-[hash].js",
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("@dnd-kit")) {
              return "vendor-dnd";
            }
            if (
              id.includes("react-dom") ||
              (id.includes("/react/") && !id.includes("react-router")) ||
              id.includes("scheduler")
            ) {
              return "vendor-react";
            }
            if (id.includes("react-router")) {
              return "vendor-router";
            }
            if (id.includes("motion")) {
              return "vendor-motion";
            }
            if (id.includes("canvas-confetti")) {
              return "vendor-confetti";
            }
          }
        },
      },
    },
  },
});
