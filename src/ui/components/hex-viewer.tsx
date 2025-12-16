import React, { useState } from 'react'
import type { ReactElement } from 'react'

export interface HexViewerProps {
  bytes: Uint8Array
}

const ROW_SIZE = 16

/**
 * Map non-printable but important characters to a unicode symbol
 */
const CHAR_OVERRIDES: Record<string, string> = {
  '\n': '⏎',
  '\t': '↹',
  '\r': '␍',
  '\b': '⌫',
  '\f': '',
  '\v': '',
  '\0': '␀'
}

interface HexRowProps {
  offset: number
  hover: string
  bytes: Uint8Array
}

function HexRow ({ offset, hover, bytes }: HexRowProps): ReactElement {
  const [hoverIndex, setHoverIndex] = useState(-1)

  const row: ReactElement[] = []
  let key = 0

  // position in file
  row.push(<td key={`index-${key++}`} className='bg-gray-muted bb b--gray-muted bw2 pa1'><code>{offset.toString(16).padStart(8, '0').toUpperCase()}</code></td>)

  // hex view
  for (let i = offset; i < (offset + ROW_SIZE); i++) {
    let style = 'bg-gray bb b--gray bw2'

    if (i === hoverIndex) {
      style = hover
    }

    if (i >= bytes.byteLength) {
      // gone past the end of the buffer
      row.push((
        <>
          <td
            key={`index-${key++}`}
            className={`${style} pa1`}
          >
            <code>--</code>
          </td>
        </>
      ))
    } else {
      row.push((
        <>
          <td
            key={`index-${key++}`}
            className={`${style} pa1`}
            onMouseOver={() => setHoverIndex(i)}
            onMouseOut={() => setHoverIndex(-1)}
          >
            <code>{bytes[i].toString(16).padStart(2, '0').toUpperCase()}</code>
          </td>
        </>
      ))
    }
  }

  // text view
  for (let i = offset; i < (offset + ROW_SIZE); i++) {
    let style = 'bg-gray-muted bb b--gray-muted bw2'

    if (i === hoverIndex) {
      style = hover
    }

    if (i >= bytes.byteLength) {
      // gone past the end of the buffer
      row.push((
        <>
          <td
            key={`index-${key++}`}
            className={`${style} pa1`}
          >
            <code>  </code>
          </td>
        </>
      ))
    } else {
      // differentiate non-printable characters
      let char = String.fromCharCode(bytes[i])
      let control = false

      if (CHAR_OVERRIDES[char]) {
        char = CHAR_OVERRIDES[char]
        control = true
      }

      if (char !== ' ' && char.trim() === '') {
        char = '☐'
        control = true
      }

      row.push((
        <>
          <td
            key={`index-${key++}`}
            className={`${style} pa1`}
            onMouseOver={() => setHoverIndex(i)}
            onMouseOut={() => setHoverIndex(-1)}
          >
            <code className={control ? 'black-40' : ''}>{char}</code>
          </td>
        </>
      ))
    }
  }

  return (
    <>
      {row}
    </>
  )
}

export function HexViewer ({ bytes }: HexViewerProps): ReactElement {
  const hover = 'bb b--aqua bw2 bg-black-60 white'
  const rows: ReactElement[] = []

  for (let offset = 0; offset < bytes.byteLength; offset += ROW_SIZE) {
    rows.push(<HexRow key={`row-${offset}`} offset={offset} hover={hover} bytes={bytes} />)
  }

  return (
    <>
      <table className='ma2 collapse'>
        {
          rows.map((row, index) => {
            return (
              <tr key={`row-${index}`}>
                {row}
              </tr>
            )
          })
        }
      </table>
    </>
  )
}
