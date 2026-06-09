import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: {
    preset: process.env.NITRO_PRESET ?? "node-server",
  },
  vite: {
    build: {
      minify: false,
      sourcemap: false,
      cssMinify: false,
    },
  },
});
