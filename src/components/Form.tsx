import React from 'react'

export default ({ handleSubmit, requestPath, setRequestPath }): JSX.Element => (
  <form id='add-file' onSubmit={handleSubmit}>
    <label htmlFor='inputContent' className='f5 ma0 pb2 aqua fw4 db'>CID, Content Path, or URL</label>
    <input
      className='input-reset bn black-80 bg-white pa3 w-100 mb3'
      id='inputContent'
      name='inputContent'
      type='text'
      placeholder='/ipfs/bafk.../path/to/file'
      required
      value={requestPath} onChange={(e) => setRequestPath(e.target.value)}
    />
  </form>
)
