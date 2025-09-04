import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Header } from '../Header'

describe('Header Component', () => {
  it('should render header component', () => {
    render(<Header />)
    
    // Check if header is rendered
    const header = document.querySelector('header, .header, [role="banner"]')
    expect(header).toBeTruthy()
  })

  it('should display application title', () => {
    render(<Header />)
    
    // Check for title or brand
    expect(
      screen.getByText(/stockbee|market|monitor/i) ||
      screen.getByText(/breadth/i)
    ).toBeInTheDocument()
  })

  it('should be accessible', () => {
    render(<Header />)
    
    // Should have proper semantic structure
    const header = document.querySelector('header, [role="banner"]')
    expect(header).toBeTruthy()
  })
})