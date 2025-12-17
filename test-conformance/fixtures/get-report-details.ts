import { readFile } from 'node:fs/promises'

interface TestOutput {
  Time: string
  Action: 'output'
  Package: string
  Test: string
  Output: string
}

interface TestStarted {
  Time: string
  Action: 'run'
  Package: string
  Test: string
}

interface TestFinished {
  Time: string
  Action: 'pass' | 'fail'
  Package: string
  Test: string
  Elapsed: number
}

type TestResult = TestStarted | TestOutput | TestFinished

export interface Test {
  result: 'pass' | 'fail'
  output: string
}

export interface ReportDetails {
  passingTests: Record<string, Test>
  failingTests: Record<string, Test>
  failureCount: number
  successCount: number
  successRate: number
}

export async function getReportDetails (path: string): Promise<Record<string, Test>> {
  const tests: Record<string, Test> = {}

  // parse the newline delimited JSON report at gwc-report-${name}.json and count the number of "PASS:" and "FAIL:" lines
  const report = await readFile(path, 'utf8')
  const lines = report.split('\n')
  for (const line of lines) {
    if (line.trim() === '') {
      continue
    }

    const progress: TestResult = JSON.parse(line)

    if (progress.Test == null) {
      // only interested in test events
      continue
    }

    if (progress.Action === 'run') {
      tests[progress.Test] = {
        result: 'pass',
        output: ''
      }
    } else if (progress.Action === 'output') {
      tests[progress.Test].output += progress.Output
    } else if (progress.Action === 'pass') {
      tests[progress.Test].result = 'pass'
      tests[progress.Test].output = ''
    } else if (progress.Action === 'fail') {
      tests[progress.Test].result = 'fail'
    }
  }

  return tests
}
