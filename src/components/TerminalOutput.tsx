import React, { useEffect } from 'react'

import type { OutputLine } from './types.ts'

interface TerminalOutputProps {
  output: OutputLine[]
  terminalRef: React.RefObject<HTMLDivElement>
}

export default function TerminalOutput ({ output, terminalRef }: TerminalOutputProps): JSX.Element {
  const terminalEl = terminalRef.current
  useEffect(() => {
    if (terminalEl == null) return
    terminalEl.scroll?.({ top: terminalEl.scrollHeight, behavior: 'smooth' })
  }, [output])

  return (
    <div id="terminal" className="terminal" ref={terminalRef}>
      { output.length > 0 &&
        <div id="output"> {
          output.map((log, index) => {
            if (log.content == null || log.content.trim() === '') {
              return <br key={index} />
            }
            return (
              <p key={index} style={{ color: log.color }} id={log.id}>
                {log.content}
              </p>
            )
          })
        } </div>
      }
    </div>
  )
}
