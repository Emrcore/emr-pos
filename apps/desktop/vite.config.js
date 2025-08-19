// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",                 // prod'da file:// ile doðru yüklensin
  server: {
    host: "0.0.0.0",          // LAN üzerinden test için
    port: 5173,
    strictPort: true
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    emptyOutDir: true,
    sourcemap: false
  },
  optimizeDeps: {
    // native modüller/ana-proses paketleri renderer'da optimize edilmesin
    exclude: ["better-sqlite3"]
  },
  define: {
    // bazý kütüphaneler process.env bekler; renderer'da boþ obje yeterli
    "process.env": {}
  }
});
