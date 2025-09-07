import { defineConfig } from "vite";

export default defineConfig({
  base: "/",
  server: {
    port: 5174, // port dev
    strictPort: true, // échoue si pris (sinon Vite incrémente)
    host: false, // accessible sur le LAN
  },
});
