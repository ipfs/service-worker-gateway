import React from 'react'

export default function Form({ handleSubmit, fileCid, setFileCid }): JSX.Element {

  return (
    <form id="add-file" onSubmit={handleSubmit}>
      <label htmlFor="file-name" className="f5 ma0 pb2 aqua fw4 db">CID</label>
      <input
        className="input-reset bn black-80 bg-white pa3 w-100 mb3"
        id="file-name"
        name="file-name"
        type="text"
        placeholder="bafk..."
        required
        value={fileCid} onChange={(e) => setFileCid(e.target.value)}
      />

      <button
        className="button-reset pv3 tc bn bg-animate bg-black-80 hover-bg-aqua white pointer w-100"
        id="add-submit"
        type="submit"
      >
        Fetch
      </button>
    </form>
  )
}
