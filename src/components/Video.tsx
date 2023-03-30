import React from 'react'

export default function Video ({ cid }: { cid: string }): JSX.Element {
  return (
    <video controls autoPlay loop className="center">
      <source src={`/ipfs/${cid}`} type="video/mp4" />
    </video>
  )
}
