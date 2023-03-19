import React from 'react'
import ReactDOMClient from 'react-dom/client';
import * as LibP2pPeer from '@libp2p/peer-id'
import './app.css';
import App from './app.tsx'

// set up debug logging for the things we care about:
localStorage.setItem('debug', 'libp2p:websockets,libp2p:webtransport,libp2p:kad-dht,libp2p:dialer')
globalThis.LibP2pPeer = LibP2pPeer

const container = document.getElementById('root')
const root = ReactDOMClient.createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
