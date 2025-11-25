import { readFile } from 'node:fs/promises'

export interface ReportDetails {
  passingTests: string[]
  failingTests: string[]
  failureCount: number
  successCount: number
  successRate: number
}

export async function getReportDetails (path: string): Promise<ReportDetails> {
  let failureCount = 0
  let successCount = 0
  const passingTests: string[] = []
  const failingTests: string[] = []

  // parse the newline delimited JSON report at gwc-report-${name}.json and count the number of "PASS:" and "FAIL:" lines
  const report = await readFile(path, 'utf8')
  const lines = report.split('\n')
  for (const line of lines) {
    if (line.includes('--- FAIL:')) {
      failureCount++
      failingTests.push(line.split('--- FAIL: ')[1].split(' ')[0])
    } else if (line.includes('--- PASS:')) {
      successCount++
      passingTests.push(line.split('--- PASS: ')[1].split(' ')[0])
    }
  }
  const successRate = Number.parseFloat(((successCount / (successCount + failureCount)) * 100).toFixed(2))

  return {
    failingTests,
    passingTests,
    failureCount,
    successCount,
    successRate
  }
}
