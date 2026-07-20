import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "fyrlinc-logo.png",
        "icon-192x192.png",
        "icon-512x512.png",
      ],
      manifest: {
        name: "Fyrlinc - Fire Alarm Panel Monitoring",
        short_name: "Fyrlinc",
        description: "IoT Fire Alarm Panel Monitoring System",
        theme_color: "#0f0f0e",
        background_color: "#0f0f0e",
        display: "standalone",
        display_override: [
          "window-controls-overlay",
          "standalone",
          "minimal-ui",
        ],
        start_url: "/",
        scope: "/",
        id: "/",
        icons: [
          {
            src: "fyrlinc-logo.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "fyrlinc-logo.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "fyrlinc-logo.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
        // Include woff/woff2 in the precache so self-hosted fonts work offline
        globPatterns: ["**/*.{js,css,html,ico,png,jpg,jpeg,svg,woff,woff2}"],
        navigateFallback: "/index.html",
        // Runtime caching for Google Fonts — CacheFirst means the CSS and font
        // files are fetched once and served from the SW cache on all repeat visits,
        // eliminating any network round-trip for typography assets.
        runtimeCaching: [
          {
            // The googleapis CSS file that lists font face declarations
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-stylesheets",
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // The actual woff2 font binaries served from gstatic.com
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          firebase: ["firebase/app", "firebase/auth", "firebase/firestore"],
          vendor: ["lucide-react", "react-hook-form", "zod"],
        },
      },
    },
  },
});
