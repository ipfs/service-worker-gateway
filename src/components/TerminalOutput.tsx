import React from 'react'

export default function TerminalOutput({ output, terminalRef }) {
  return (
    <div id="terminal" className="terminal" ref={terminalRef}>
      { output.length > 0 &&
        <div id="output">
          { output.map((log, index) =>
            <p key={index} style={{'color': log.color}} id={log.id}>
              {log.content}
            </p>)
          }
        </div>
      }
    </div>
  )
}
