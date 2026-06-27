const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

module.exports = createJestConfig({
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.js'],
  testPathIgnorePatterns: [
    '<rootDir>/.claude/',
    '<rootDir>/.next/',
    '<rootDir>/.open-next/',
    '<rootDir>/node_modules/',
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/.claude/',
    '<rootDir>/.next/',
    '<rootDir>/.open-next/',
  ],
});
