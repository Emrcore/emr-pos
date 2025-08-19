// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",                 // prod'da file:// ile do�ru y�klensin
  server: {
    host: "0.0.0.0",          // LAN �zerinden test i�in
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
    // native mod�ller/ana-proses paketleri renderer'da optimize edilmesin
    exclude: ["better-sqlite3"]
  },
  define: {
    // baz� k�t�phaneler process.env bekler; renderer'da bo� obje yeterli
    "process.env": {}
  }
});
