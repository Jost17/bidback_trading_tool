import React from 'react'
import ReactDOM from 'react-dom/client'
import TempApp from './TempApp'
import './index.css'

// Type check for window.tradingAPI to ensure preload script loaded
// Temporarily disabled for demo
// if (!window.tradingAPI) {
//   console.error('Trading API not available - preload script may have failed to load')
// }

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TempApp />
  </React.StrictMode>
)