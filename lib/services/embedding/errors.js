class OptimisticLockError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OptimisticLockError';
  }
}

module.exports = { OptimisticLockError };
