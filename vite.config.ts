import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    rolldownOptions: {
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        verticalParallax: resolve(
          import.meta.dirname,
          'studies/vertical-parallax/index.html',
        ),
      },
    },
  },
})
