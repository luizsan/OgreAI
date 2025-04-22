import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  base: "./",
  build: {
    outDir: "../output/html",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: "./index.html",
      }
    }
  },
  server:{
    fs: {
      allow: ["../shared/*", "."]
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@shared': resolve(__dirname, '../shared')
    }
  }
})
