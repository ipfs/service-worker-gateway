import React from 'react'
import { createRoot } from 'react-dom/client'
import { FetchErrorPage } from './pages/errors/fetch-error.jsx'

const app = document.getElementById('app')

if (!app) {
  throw new Error('Could not find div#app')
}

createRoot(app)
  .render((
    <>
      <FetchErrorPage />
    </>
  ))
