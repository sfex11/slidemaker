import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Simple test component
function TestButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} type="button">
      {children}
    </button>
  )
}

// Simple card component
function SlideCard({ title, content }: { title: string; content: string }) {
  return (
    <div data-testid="slide-card">
      <h2>{title}</h2>
      <p>{content}</p>
    </div>
  )
}

describe('React Component Tests', () => {
  it('should render button with text', () => {
    render(<TestButton onClick={() => {}}>Click Me</TestButton>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('should handle button click', async () => {
    const user = userEvent.setup()
    let clicked = false
    render(
      <TestButton onClick={() => { clicked = true }}>
        Click Me
      </TestButton>
    )

    await user.click(screen.getByRole('button'))
    expect(clicked).toBe(true)
  })

  it('should render slide card with correct content', () => {
    render(<SlideCard title="Test Title" content="Test Content" />)

    expect(screen.getByTestId('slide-card')).toBeInTheDocument()
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })
})
