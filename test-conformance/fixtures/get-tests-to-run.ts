import { getWontFixTests } from './get-wontfix-tests.js'

/**
 *
 * You can see output for specific tests with something like
 *
 * @example
 *
 * ```
 * DEBUG="gateway-conformance*,gateway-conformance*:trace" RUN_TESTS='TestNativeDag/HEAD_plain_JSON_codec_with_no_explicit_format_returns_HTTP_200.*' npm run test
 * ```
 *
 * If you run `npm run update` and see that some passing tests are removed, you should probably verify that those tests
 * pass. You can chose to not update `expected-failing-tests.json` and `expected-passing-tests.json` and then choose to
 * save the removed passing tests to a file to ensure that they do still pass with a command like:
 *
 * @example
 * ```
 * DEBUG="gateway-conformance*,gateway-conformance*:trace" RUN_TESTS="$(jq -r '.[]' removed-passing-tests.json | paste -sd ',' -)" npm run test
 * ```
 */
export function getTestsToRun (): string[] {
  const envTestsToRun = process.env.RUN_TESTS != null ? process.env.RUN_TESTS.split(',') : []
  // by default, we filter out tests that we know we are not going to fix...
  // set FORCE_RUN=true to run all tests you set in RUN_TESTS (even if they are in the wontfix list)
  const shouldFilterOutWontFixTests = process.env.FORCE_RUN == null
  const wontFixTests = getWontFixTests()
  // TODO: tests to run can be gotest based regex, we need to be smarter about filtering.
  const testsToRun = shouldFilterOutWontFixTests ? envTestsToRun.filter((test) => !wontFixTests.includes(test)) : envTestsToRun
  return testsToRun
}
