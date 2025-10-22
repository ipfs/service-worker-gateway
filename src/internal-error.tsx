import React from 'react'
import { hydrateRoot } from 'react-dom/client'
import { InternalErrorPage } from './pages/errors/internal-error.jsx'
import { Page } from './pages/page.js'

hydrateRoot(document, (
  <>
    <Page>
      <InternalErrorPage />
    </Page>
  </>
))
