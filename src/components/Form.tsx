import React from 'react'

const Form: React.FC<{
  handleSubmit(e: React.FormEvent<HTMLFormElement>): void
  requestPath: string
  setRequestPath(path: string): void
}> = ({
  handleSubmit,
  requestPath,
  setRequestPath
}) => (
  <form id='add-file' onSubmit={handleSubmit}>
    <label htmlFor='inputContent' className='f5 ma0 pb2 teal fw4 db'>CID, Content Path, or URL</label>
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

export default Form
