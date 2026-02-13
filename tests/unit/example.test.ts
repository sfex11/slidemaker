import { describe, it, expect } from 'vitest'

describe('Example Unit Tests', () => {
  it('should pass basic assertion', () => {
    expect(1 + 1).toBe(2)
  })

  it('should work with strings', () => {
    const greeting = 'Hello, World!'
    expect(greeting).toContain('Hello')
    expect(greeting.length).toBeGreaterThan(0)
  })

  it('should work with arrays', () => {
    const items = ['slide1', 'slide2', 'slide3']
    expect(items).toHaveLength(3)
    expect(items).toContain('slide2')
  })

  it('should work with objects', () => {
    const slide = {
      id: '1',
      title: 'Test Slide',
      content: 'Test Content',
    }
    expect(slide).toHaveProperty('id')
    expect(slide.title).toBe('Test Slide')
  })
})

describe('Utility Functions', () => {
  it('should generate unique IDs', () => {
    const { randomUUID } = require('crypto')
    const id1 = randomUUID()
    const id2 = randomUUID()
    expect(id1).not.toBe(id2)
    expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  })
})
