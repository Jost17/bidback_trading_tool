import { useState, useEffect } from 'react'

interface UseAppInitializationReturn {
  isInitialized: boolean
  error: string | null
  initializationProgress: string
}

export function useAppInitialization(): UseAppInitializationReturn {
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initializationProgress, setInitializationProgress] = useState('Starting...')

  useEffect(() => {
    async function initialize() {
      try {
        // Step 1: Check if trading API is available
        setInitializationProgress('Checking Trading API...')
        
        // Temporarily skip API check for browser demo
        const isElectron = window.electronAPI || window.tradingAPI
        if (!isElectron) {
          console.warn('Running in browser demo mode - skipping API checks')
          setInitializationProgress('Browser demo mode - Ready!')
          await new Promise(resolve => setTimeout(resolve, 1000))
          setIsInitialized(true)
          return
        }
        
        if (!window.tradingAPI) {
          throw new Error('Trading API not available')
        }
        
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Step 2: Test database connection
        setInitializationProgress('Connecting to database...')
        const dbInfo = await window.tradingAPI.getDatabaseInfo()
        console.log('Database info:', dbInfo)
        
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Step 3: Load initial data
        setInitializationProgress('Loading application data...')
        try {
          // Try to load some initial breadth data to test the connection
          const breadthData = await window.tradingAPI.getBreadthData()
          console.log('Initial breadth data loaded:', breadthData.length, 'records')
        } catch (breadthError) {
          console.warn('No breadth data available yet:', breadthError)
        }
        
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Step 4: Initialize complete
        setInitializationProgress('Ready!')
        await new Promise(resolve => setTimeout(resolve, 200))
        
        setIsInitialized(true)
        
      } catch (err) {
        console.error('App initialization failed:', err)
        setError(err instanceof Error ? err.message : 'Unknown initialization error')
      }
    }

    initialize()
  }, [])

  return {
    isInitialized,
    error,
    initializationProgress
  }
}