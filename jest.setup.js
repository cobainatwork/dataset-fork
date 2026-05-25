// Test environment setup: extend timeout, set test env vars
jest.setTimeout(10000);

// Ensure tests use a separate Postgres schema or test DB
process.env.NODE_ENV = 'test';
