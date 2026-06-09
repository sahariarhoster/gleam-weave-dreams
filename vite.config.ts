// @lovable.dev/vite-tanstack-config already includes nitro (cloudflare default).
// For self-hosted cPanel/Node builds, set BUILD_TARGET=node before `vite build`
// to switch the nitro preset to `node-server`. Lovable preview leaves it unset
// so the default Cloudflare Worker output is used (required by the preview proxy).
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const isNodeBuild = process.env.BUILD_TARGET === "node";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  ...(isNodeBuild
    ? {
        nitro: {
          preset: "node-server",
        },
      }
    : {}),
  vite: {
    build: {
      minify: false,
      sourcemap: false,
      cssMinify: false,
    },
  },
});
