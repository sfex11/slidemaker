import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

function TestButton({ children }: { children: React.ReactNode }) {
  return (
    <button type="button">
      {children}
    </button>
  )
}

function SlideCard({ title, content }: { title: string; content: string }) {
  return (
    <article data-testid="slide-card">
      <h2>{title}</h2>
      <p>{content}</p>
    </article>
  )
}

describe('React Render Tests', () => {
  it('버튼 텍스트가 렌더링된다', () => {
    const html = renderToStaticMarkup(<TestButton>Click Me</TestButton>)
    expect(html).toContain('Click Me')
    expect(html).toContain('type="button"')
  })

  it('슬라이드 카드 타이틀/본문이 렌더링된다', () => {
    const html = renderToStaticMarkup(
      <SlideCard title="Test Title" content="Test Content" />
    )

    expect(html).toContain('data-testid="slide-card"')
    expect(html).toContain('Test Title')
    expect(html).toContain('Test Content')
  })

  it('여러 카드가 순서대로 렌더링된다', () => {
    const html = renderToStaticMarkup(
      <section>
        <SlideCard title="A" content="1" />
        <SlideCard title="B" content="2" />
      </section>
    )

    expect(html.indexOf('A')).toBeLessThan(html.indexOf('B'))
  })
})
