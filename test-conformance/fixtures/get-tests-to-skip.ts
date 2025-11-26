import { getWontFixTests } from './get-wontfix-tests.js'

/**
 *
 * you can skip certain tests by setting SKIP_TESTS to a comma-separated list of test names
 *
 * @example
 *
 * ```
 * SKIP_TESTS='TestNativeDag/HEAD_plain_JSON_codec_with_no_explicit_format_returns_HTTP_200.*' npm run test
 * ```
 */
export function getTestsToSkip (): string[] {
  const envTestsToSkip = process.env.SKIP_TESTS != null ? process.env.SKIP_TESTS.split(',') : []
  const testsToSkip = [...getWontFixTests(), ...envTestsToSkip]
  return testsToSkip
}
