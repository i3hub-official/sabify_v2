// vite.config.ts
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(() => {
  return {
    plugins: [
      tailwindcss(),
      sveltekit(),
      basicSsl(),
    ],

    server: {
      host: '0.0.0.0',
      port: 1209,
      https: true,
      proxy: {
        '/ws': {
          target: 'ws://localhost:2605',
          ws: true,
        },
      },
    },

    optimizeDeps: {
      // Do NOT pre-bundle these huge libraries.
  exclude: [
    '@prisma/client',
    '.prisma/client',
  ],
    },

    ssr: {
     // tfjs-node / tfjs-node-gpu removed — same reasoning; the aliased
      // name is what SSR externalization actually checks, not the original.
      external: ['pg', 'ws', 'crypto', 'sharp', '@prisma/client', '.prisma/client'],
    },

    define: {
      'process.env': {},
      'global': 'globalThis',
    },

       build: {
      commonjsOptions: {
        transformMixedEsModules: true,
        exclude: [/@prisma\/client/, /\.prisma\/client/],
      },
      rollupOptions: {
        // Kept as-is: build-time externalization is a separate pass from
        // dev-time SSR resolution, and Prisma's native binary loading still
        // needs to stay external in the production bundle.
        external: ['@prisma/client', '.prisma/client'],
      },
    },
  };
});