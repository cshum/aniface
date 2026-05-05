import { defineConfig } from 'vite'
import { resolve } from 'path'

// Vite config for demo/development builds
export default defineConfig({
  root: 'demo',
  base: process.env.NODE_ENV === 'production' ? '/aniface/' : '/',  // GitHub Pages base URL in production
  plugins: [
    {
      name: 'aniface-self-reference',
      enforce: 'pre',
      resolveId(source) {
        if (source === 'aniface') {
          return resolve(__dirname, './src/index.ts')
        }

        return null
      }
    }
  ],
  build: {
    outDir: '../dist-demo',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      'aniface': resolve(__dirname, './src/index.ts')
    }
  }
})

