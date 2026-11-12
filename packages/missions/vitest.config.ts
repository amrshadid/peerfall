import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // A cached transform keeps import.meta.glob's old file list after missions are added.
    fsModuleCache: false,
  },
})
