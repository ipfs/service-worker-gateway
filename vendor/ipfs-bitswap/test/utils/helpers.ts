
// @ts-expect-error no types
import range from 'lodash.range'
import { expect } from 'aegir/chai'

export const orderedFinish = (n: number): { (i: number): void, assert: () => void } => {
  const r = range(1, n + 1)
  const finishes: number[] = []

  const output = (i: number): void => {
    finishes.push(i)
  }

  output.assert = () => {
    expect(finishes.length).to.equal(n)
    expect(r).to.deep.equal(finishes, `Invalid finish order: ${finishes}`)
  }

  return output
}

export const countToFinish = (n: number): { (): void, assert: () => void } => {
  let pending = n

  const output = (): void => {
    pending--
  }

  output.assert = () => {
    expect(pending).to.equal(0, `too many finishes, expected only ${n}`)
  }

  return output
}
