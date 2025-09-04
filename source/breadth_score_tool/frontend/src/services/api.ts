// API Service with error handling and retry logic
const API_BASE_URL = 'http://localhost:3001/api'

interface APIResponse<T> {
  data: T
  success: boolean
  message?: string
}

class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public endpoint?: string
  ) {
    super(message)
    this.name = 'APIError'
  }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const fetchWithRetry = async (
  url: string,
  options: RequestInit = {},
  retries = 3
): Promise<Response> => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      if (!response.ok) {
        throw new APIError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          url
        )
      }

      return response
    } catch (error) {
      if (i === retries - 1) throw error
      
      // Exponential backoff
      await delay(Math.pow(2, i) * 1000)
    }
  }
  
  throw new APIError('Max retries exceeded')
}

export const apiService = {
  // Get current breadth score
  async getCurrentStatus() {
    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/current-status`)
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Failed to fetch current status:', error)
      throw new APIError(
        'Unable to fetch current market status. Please check your connection.',
        0,
        'current-status'
      )
    }
  },

  // Get historical breadth scores
  async getBreadthScores(startDate?: string, endDate?: string, limit?: number) {
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      if (limit) params.append('limit', limit.toString())
      
      const url = `${API_BASE_URL}/breadth-scores?${params.toString()}`
      const response = await fetchWithRetry(url)
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Failed to fetch breadth scores:', error)
      throw new APIError(
        'Unable to fetch historical data. Please try again.',
        0,
        'breadth-scores'
      )
    }
  },

  // Get yearly summaries
  async getYearlySummaries(limit?: number) {
    try {
      const params = new URLSearchParams()
      if (limit) params.append('limit', limit.toString())
      
      const url = `${API_BASE_URL}/yearly-summaries?${params.toString()}`
      const response = await fetchWithRetry(url)
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Failed to fetch yearly summaries:', error)
      throw new APIError(
        'Unable to fetch market summaries.',
        0,
        'yearly-summaries'
      )
    }
  },

  // Health check
  async healthCheck() {
    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/health`, {}, 1)
      return response.ok
    } catch {
      return false
    }
  }
}

// Hook for API calls with loading and error states
export const useAPI = () => {
  return {
    apiService,
    isOnline: navigator.onLine,
    APIError
  }
}
