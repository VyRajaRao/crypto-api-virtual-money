export default {
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/src/tests/jest-polyfills.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx)',
    '<rootDir>/src/**/*.test.(ts|tsx)',
    '<rootDir>/src/tests/unit/**/*.(test|spec).(ts|tsx)',
    '<rootDir>/src/tests/hooks/**/*.(test|spec).(ts|tsx)',
    '<rootDir>/src/tests/integration/**/*.(test|spec).(ts|tsx)',
    '<rootDir>/tests/**/*.test.(ts|tsx)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/src/tests/e2e/'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { useESM: true, tsconfig: 'tsconfig.app.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    'src/**/*.(ts|tsx)',
    '!src/**/*.d.ts',
    '!src/tests/**/*',
    '!src/vite-env.d.ts',
    '!src/main.tsx'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['html', 'text', 'lcov']
};
