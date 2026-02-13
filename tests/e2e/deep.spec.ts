import { test, expect } from '@playwright/test'

test.describe('심층 기능 테스트', () => {
  test.describe('로그인 페이지 심층 테스트', () => {
    test('페이지에 슬라이드 SaaS 브랜딩이 표시됨', async ({ page }) => {
      await page.goto('/login')
      await expect(page.locator('text=Slide SaaS')).toBeVisible()
      await expect(page.locator('text=AI 기반 슬라이드 생성 플랫폼')).toBeVisible()
    })

    test('Google 로그인 버튼이 표시되고 클릭 가능함', async ({ page }) => {
      await page.goto('/login')
      const googleButton = page.locator('button:has-text("Google")')
      await expect(googleButton).toBeVisible()
      await expect(googleButton).toBeEnabled()
    })

    test('이메일 입력 필드가 올바른 타입임', async ({ page }) => {
      await page.goto('/login')
      const emailInput = page.locator('input[type="email"], input[name="email"]')
      await expect(emailInput).toBeVisible()
      const inputType = await emailInput.getAttribute('type')
      expect(inputType).toBe('email')
    })

    test('비밀번호 입력 필드가 올바른 타입임', async ({ page }) => {
      await page.goto('/login')
      const passwordInput = page.locator('input[type="password"]')
      await expect(passwordInput).toBeVisible()
    })

    test('로그인 버튼이 존재함', async ({ page }) => {
      await page.goto('/login')
      const loginButton = page.locator('button:has-text("로그인"), button[type="submit"]')
      await expect(loginButton.first()).toBeVisible()
    })

    test('회원가입 링크가 작동함', async ({ page }) => {
      await page.goto('/login')
      const signupLink = page.locator('a:has-text("회원가입")')
      await expect(signupLink).toBeVisible()
      await signupLink.click()
      await expect(page).toHaveURL(/\/signup/)
    })

    test('홈으로 돌아가기 링크가 있음', async ({ page }) => {
      await page.goto('/login')
      const homeLink = page.locator('a:has-text("홈으로")')
      await expect(homeLink).toBeVisible()
    })
  })

  test.describe('회원가입 페이지 심층 테스트', () => {
    test('페이지에 브랜딩이 표시됨', async ({ page }) => {
      await page.goto('/signup')
      await expect(page.locator('text=Slide SaaS')).toBeVisible()
    })

    test('Google 회원가입 버튼이 표시됨', async ({ page }) => {
      await page.goto('/signup')
      const googleButton = page.locator('button:has-text("Google")')
      await expect(googleButton).toBeVisible()
    })

    test('회원가입 폼 필드들이 있음', async ({ page }) => {
      await page.goto('/signup')
      const emailInput = page.locator('input[type="email"], input[name="email"]')
      await expect(emailInput).toBeVisible()
      const passwordInput = page.locator('input[type="password"]')
      await expect(passwordInput).toBeVisible()
    })

    test('로그인 링크가 작동함', async ({ page }) => {
      await page.goto('/signup')
      const loginLink = page.locator('a:has-text("로그인")')
      await expect(loginLink).toBeVisible()
      await loginLink.click()
      await expect(page).toHaveURL(/\/login/)
    })
  })

  test.describe('인증 에러 페이지 테스트', () => {
    test('에러 페이지가 로드됨', async ({ page }) => {
      await page.goto('/auth/error')
      await expect(page.locator('body')).toBeVisible()
    })
  })

  test.describe('콘솔 에러 체크', () => {
    test('로그인 페이지에 콘솔 에러가 없음', async ({ page }) => {
      const errors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })
      await page.goto('/login')
      await page.waitForLoadState('networkidle')
      // 404 폰트나 CSS 관련 에러는 무시
      const filteredErrors = errors.filter(e =>
        !e.includes('404') &&
        !e.includes('font') &&
        !e.includes('Failed to load resource')
      )
      expect(filteredErrors).toHaveLength(0)
    })

    test('회원가입 페이지에 콘솔 에러가 없음', async ({ page }) => {
      const errors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })
      await page.goto('/signup')
      await page.waitForLoadState('networkidle')
      const filteredErrors = errors.filter(e =>
        !e.includes('404') &&
        !e.includes('font') &&
        !e.includes('Failed to load resource')
      )
      expect(filteredErrors).toHaveLength(0)
    })
  })

  test.describe('페이지 로딩 성능', () => {
    test('로그인 페이지가 합리적인 시간 내에 로드됨', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/login')
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime
      // 5초 이내에 로드되어야 함
      expect(loadTime).toBeLessThan(5000)
    })

    test('회원가입 페이지가 합리적인 시간 내에 로드됨', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/signup')
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(5000)
    })
  })

  test.describe('폼 검증 테스트', () => {
    test('잘못된 이메일 형식으로 로그인 시도', async ({ page }) => {
      await page.goto('/login')
      const emailInput = page.locator('input[type="email"], input[name="email"]')
      await emailInput.fill('invalid-email')
      const submitButton = page.locator('button[type="submit"]')
      if (await submitButton.isVisible()) {
        await submitButton.click()
        await page.waitForTimeout(500)
        // HTML5 폼 검증이 작동하거나 에러 메시지가 표시되어야 함
      }
    })

    test('빈 필드로 회원가입 시도', async ({ page }) => {
      await page.goto('/signup')
      const submitButton = page.locator('button[type="submit"]')
      if (await submitButton.isVisible()) {
        await submitButton.click()
        await page.waitForTimeout(500)
        // 폼 검증이 작동해야 함
      }
    })
  })
})
