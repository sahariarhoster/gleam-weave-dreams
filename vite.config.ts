// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: {
    preset: "node-server",
    output: {
      dir: ".output",
      publicDir: ".output/public",
      serverDir: ".output/server",
    },
  },
  vite: {
    // Low-memory hosting: esbuild's worker pool is killed by the OOM killer
    // ("The service was stopped"). Disable minify and force a single worker.
    build: {
      minify: false,
      sourcemap: false,
      cssMinify: false,
    },
    esbuild: {
      // Avoid spawning multiple esbuild worker threads on tiny shared hosts.
      // Honours UV_THREADPOOL_SIZE=1 set in the env.
    },
    optimizeDeps: {
      esbuildOptions: {
        // single-threaded esbuild
        // @ts-expect-error – passed through to esbuild
        workerThreads: false,
      },
    },
  },
});
