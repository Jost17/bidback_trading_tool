import React from 'react'

function TestApp() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: 'blue' }}>✅ Test App Loading Successfully</h1>
      <p>This is a minimal test to verify React is working correctly.</p>
      <p>Current time: {new Date().toLocaleTimeString()}</p>
    </div>
  )
}

export default TestApp