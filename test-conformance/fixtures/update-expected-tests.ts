/* eslint-disable no-console */
/**
 * Script that will read gwc-report-all.json and update the expected-passing-tests.json and expected-failing-tests.json files with the latest test results.
 *
 * This is useful when you want to update the expected test results after running the tests with the following command:
 *
 * ```bash
 * SUCCESS_RATE=100 npm run test -- --bail=false
 * ```
 *
 * This will run all the tests and update the expected-passing-tests.json and expected-failing-tests.json files with the latest test results.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import readline from 'node:readline'
import { getReportDetails } from './get-report-details.js'

/**
 * Prompt the user with a yes / no question.
 *
 * @param {string} question - – The text to show.
 * @returns {Promise<boolean>} Resolves to the user’s choice.
 */
async function confirm (question: string): Promise<boolean> {
  const hint = ' [y/n] '
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  return new Promise(resolve => {
    const ask = (): void => {
      rl.question(`${question}${hint}`, input => {
        const a = input.trim().toLowerCase()

        if (['y', 'yes'].includes(a)) { rl.close(); resolve(true); return }
        if (['n', 'no'].includes(a)) { rl.close(); resolve(false); return }

        console.log('Please type "y" or "n" then press Enter.')
        ask() // repeat until valid
      })
    }
    ask()
  })
}
// display a warning that this should not be done blindly and that the updated passing and failing tests should be checked for correctness
console.warn('WARNING: This will update the expected-passing-tests.json and expected-failing-tests.json files with the latest test results.')
console.warn('WARNING: This should not be done blindly and that the updated passing and failing tests should be checked for correctness.')

const expectedPassingTestsPath = join(process.cwd(), 'src', 'expected-passing-tests.json')
const expectedFailingTestsPath = join(process.cwd(), 'src', 'expected-failing-tests.json')

const currentPassingTests: string[] = JSON.parse(await readFile(expectedPassingTestsPath, 'utf-8'))
const currentFailingTests: string[] = JSON.parse(await readFile(expectedFailingTestsPath, 'utf-8'))

const { passingTests, failingTests } = await getReportDetails('gwc-report-all.json')

// output the differences between the current passing and failing tests and the new passing and failing tests
console.log('Differences between the current passing and failing tests and the new passing and failing tests:')
console.log('Added passing tests:')
const passingTestAdditions = passingTests.filter((test: string) => !currentPassingTests.includes(test))
console.log(passingTestAdditions)
console.log('Removed passing tests:')
const passingTestRemovals = currentPassingTests.filter((test: string) => !passingTests.includes(test))
console.log(passingTestRemovals)
console.log('Added failing tests:')
const failingTestAdditions = failingTests.filter((test: string) => !currentFailingTests.includes(test))
console.log(failingTestAdditions)
console.log('Removed failing tests:')
const failingTestRemovals = currentFailingTests.filter((test: string) => !failingTests.includes(test))
console.log(failingTestRemovals)

if (failingTestAdditions.length > 0 || passingTestRemovals.length > 0) {
  console.warn('WARNING: There are previously passing tests that are now failing, is this expected?')
}

if (passingTestRemovals.length + failingTestRemovals.length + passingTestAdditions.length + failingTestAdditions.length > 0) {
  const answer = await confirm('Are you sure you want to update the expected-passing-tests.json and expected-failing-tests.json files with the latest test results?')

  if (!answer) {
    console.log('Aborting.')

    if (passingTestRemovals.length > 0) {
      // to help with debugging, we can save the removed passing tests to a file to ensure that they do still pass with a command like:
      // DEBUG="gateway-conformance*,gateway-conformance*:trace" RUN_TESTS="$(jq -r '.[]' removed-passing-tests.json | paste -sd ',' -)" npm run test
      const shouldSaveRemovedPassingTests = await confirm('Should we save the removed passing tests to removed-passing-tests.json file?')
      if (shouldSaveRemovedPassingTests) {
        await writeFile('removed-passing-tests.json', JSON.stringify(passingTestRemovals, null, 2) + '\n')
      }
    }

    process.exit(0)
  }
  await writeFile(expectedPassingTestsPath, JSON.stringify(passingTests, null, 2) + '\n')
  await writeFile(expectedFailingTestsPath, JSON.stringify(failingTests, null, 2) + '\n')
} else {
  console.log('No changes to the expected-passing-tests.json and expected-failing-tests.json files.')
}
