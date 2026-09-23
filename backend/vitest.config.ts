import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // Cada arquivo de teste sobe seu próprio banco PGlite em memória.
    pool: 'forks',
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'segredo-de-teste-com-pelo-menos-32-caracteres',
      DATABASE_URL: '',
      PGLITE_DIR: 'memory://',
    },
  },
})
