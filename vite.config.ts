import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

// Caminhos relativos: o mesmo build funciona em https://USUARIO.github.io/j1-musical/,
// em qualquer outro nome de repositório e até aberto direto do disco (duplo clique no index.html).
const base = process.env.BASE_PATH ?? './';

/**
 * Embute o JavaScript e o CSS no index.html. Navegadores bloqueiam scripts de módulo externos
 * em arquivos abertos do disco (file://); embutidos, o app abre com duplo clique.
 */
function inlineEntry(): Plugin {
  return {
    name: 'j1-inline-entry',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const bundle = ctx.bundle;
        if (!bundle) return html;
        let out = html;
        for (const [file, item] of Object.entries(bundle)) {
          const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          if (item.type === 'chunk' && item.isEntry) {
            const tag = new RegExp(`<script[^>]*src="[^"]*${escaped}"[^>]*></script>`);
            if (!tag.test(out)) continue;
            const code = item.code.replace(/<\/script/gi, '<\\/script');
            out = out.replace(tag, () => `<script type="module">${code}</script>`);
            delete bundle[file];
          } else if (item.type === 'asset' && file.endsWith('.css')) {
            const tag = new RegExp(`<link[^>]*href="[^"]*${escaped}"[^>]*>`);
            if (!tag.test(out)) continue;
            out = out.replace(tag, () => `<style>${String(item.source)}</style>`);
            delete bundle[file];
          }
        }
        return out;
      },
    },
  };
}

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: {
    // Um único arquivo de script (necessário para o embutimento acima).
    rolldownOptions: { output: { inlineDynamicImports: true } },
    chunkSizeWarningLimit: 1600,
  },
  plugins: [
    react(),
    inlineEntry(),
    VitePWA({
      // O registro é feito manualmente em main.tsx (apenas quando servido via http/https).
      injectRegister: false,
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'icons/favicon-32.png', 'icons/favicon-64.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'J1',
        short_name: 'J1',
        description: 'Treinamento de percepção musical',
        lang: 'pt-BR',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'any',
        background_color: '#F7F9FE',
        theme_color: '#FFFFFF',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
