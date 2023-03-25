
export function AbortSignalGuard (signal): signal is AbortSignal {
  return signal !== null
}
