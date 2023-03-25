import React from 'react'

export default function ({ configType, setConfigType }): JSX.Element {
  const onChange = (e: React.ChangeEvent<HTMLInputElement>): void => setConfigType(e.target.value)

  return (
    <fieldset className="bn flex items-center pb2" style={{ padding: 0, paddingBottom: '0.5rem' }} >
      {/* <span className="mr2 f5 ma0 pb2 aqua fw4 db">js-libp2p communication config:</span> */}
      <span className="mr2 f5 aqua fw4 db">js-libp2p communication config:</span>
      <span className="ml2">
        <input className="mr2" type="radio" id="ipni" name="configType" value="ipni" checked={configType === 'ipni'} onChange={onChange}/>
        <label htmlFor="ipni" className="lh-copy f5">IPNI</label>
      </span>
      <span className="ml2">
        <input className="mr2" type="radio" id="dht" name="configType" value="dht" checked={configType === 'dht'} onChange={onChange} />
        <label htmlFor="dht" className="lh-copy f5">DHT</label>
      </span>
    </fieldset>
  )
}
