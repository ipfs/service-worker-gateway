function isAggregateError (err?: any): err is AggregateError {
  return err instanceof AggregateError || err?.name === 'AggregateError'
}

/**
 * Error instance properties are not enumerable so we must transform the error
 * into a plain object if we want to pass it to `JSON.stringify` or similar.
 */
export function errorToObject (err: Error): any {
  let errors

  if (isAggregateError(err)) {
    errors = err.errors.map(err => errorToObject(err))
  }

  return {
    name: err.name,
    message: err.message,
    stack: err.stack,
    errors
  }
}
