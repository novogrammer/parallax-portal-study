import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  root: resolve(import.meta.dirname, 'src'),
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        index: resolve(import.meta.dirname, 'src/index.html'),
        verticalParallax: resolve(
          import.meta.dirname,
          'src/studies/vertical-parallax/index.html',
        ),
      },
    },
  },
})
