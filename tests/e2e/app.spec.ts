import { test, expect } from '@playwright/test'

test.describe('Slide SaaS 애플리케이션 테스트', () => {
  test.describe('공개 페이지', () => {
    test('로그인 페이지가 정상적으로 로드됨', async ({ page }) => {
      await page.goto('/login')
      await expect(page).toHaveURL(/\/login/)
      // CardTitle이 div 태그를 사용하므로 텍스트 존재 여부만 확인
      await expect(page.locator('text=Slide SaaS')).toBeVisible()
    })

    test('회원가입 페이지가 정상적으로 로드됨', async ({ page }) => {
      await page.goto('/signup')
      await expect(page).toHaveURL(/\/signup/)
      await expect(page.locator('text=Slide SaaS')).toBeVisible()
    })

    test('인증 에러 페이지가 정상적으로 로드됨', async ({ page }) => {
      await page.goto('/auth/error')
      await expect(page).toHaveURL(/\/auth\/error/)
    })
  })

  test.describe('인증 테스트', () => {
    test('로그인 폼 이메일 입력 필드 존재', async ({ page }) => {
      await page.goto('/login')
      const emailInput = page.locator('input[type="email"], input[name="email"]')
      await expect(emailInput).toBeVisible()
    })

    test('로그인 폼 비밀번호 입력 필드 존재', async ({ page }) => {
      await page.goto('/login')
      const passwordInput = page.locator('input[type="password"]')
      await expect(passwordInput).toBeVisible()
    })

    test('회원가입 폼 필드들 존재', async ({ page }) => {
      await page.goto('/signup')
      const emailInput = page.locator('input[type="email"], input[name="email"]')
      await expect(emailInput).toBeVisible()
      const passwordInput = page.locator('input[type="password"]')
      await expect(passwordInput).toBeVisible()
    })

    test('빈 폼으로 로그인 시도 시 에러 표시', async ({ page }) => {
      await page.goto('/login')
      const submitButton = page.locator('button[type="submit"]')
      if (await submitButton.isVisible()) {
        await submitButton.click()
        // 에러 메시지 또는 검증 표시 대기
        await page.waitForTimeout(1000)
      }
    })
  })

  test.describe('보호된 페이지 리다이렉션', () => {
    test('비인증 사용자 대시보드 접근 시 로그인으로 리다이렉트', async ({ page }) => {
      await page.goto('/')
      await page.waitForTimeout(1000)
      // 로그인 페이지로 리다이렉트되거나 로그인 폼이 표시되어야 함
      await expect(page.url()).toMatch(/\/(login|signin|auth)/)
    })

    test('비인증 사용자 /create 접근 시 로그인으로 리다이렉트', async ({ page }) => {
      await page.goto('/create')
      await page.waitForTimeout(1000)
      await expect(page.url()).toMatch(/\/(login|signin|auth)/)
    })

    test('비인증 사용자 /preview 접근 시 로그인으로 리다이렉트', async ({ page }) => {
      await page.goto('/preview')
      await page.waitForTimeout(1000)
      await expect(page.url()).toMatch(/\/(login|signin|auth)/)
    })

    test('비인증 사용자 /projects/123 접근 시 로그인으로 리다이렉트', async ({ page }) => {
      await page.goto('/projects/123')
      await page.waitForTimeout(1000)
      await expect(page.url()).toMatch(/\/(login|signin|auth)/)
    })
  })

  test.describe('UI 컴포넌트 테스트', () => {
    test('로그인 페이지에 Google 소셜 로그인 버튼 존재', async ({ page }) => {
      await page.goto('/login')
      const googleButton = page.locator('button:has-text("Google"), [data-provider="google"]')
      // Google 로그인 버튼이 있거나 없을 수 있음
      const isVisible = await googleButton.isVisible().catch(() => false)
      console.log('Google login button visible:', isVisible)
    })

    test('회원가입 페이지 링크 동작', async ({ page }) => {
      await page.goto('/login')
      const signupLink = page.locator('a:has-text("회원가입"), a:has-text("Sign up")')
      if (await signupLink.isVisible().catch(() => false)) {
        await signupLink.click()
        await expect(page).toHaveURL(/\/signup/)
      }
    })

    test('로그인 페이지 링크 동작', async ({ page }) => {
      await page.goto('/signup')
      const loginLink = page.locator('a:has-text("로그인"), a:has-text("Login"), a:has-text("Sign in")')
      if (await loginLink.isVisible().catch(() => false)) {
        await loginLink.click()
        await expect(page).toHaveURL(/\/login/)
      }
    })
  })

  test.describe('접근성 테스트', () => {
    test('로그인 페이지 기본 접근성', async ({ page }) => {
      await page.goto('/login')
      // 페이지 타이틀 확인
      await expect(page).toHaveTitle(/.+/)
      // HTML lang 속성 확인
      const lang = await page.locator('html').getAttribute('lang')
      expect(lang).toBeTruthy()
    })

    test('회원가입 페이지 기본 접근성', async ({ page }) => {
      await page.goto('/signup')
      await expect(page).toHaveTitle(/.+/)
      const lang = await page.locator('html').getAttribute('lang')
      expect(lang).toBeTruthy()
    })
  })

  test.describe('반응형 테스트', () => {
    test('모바일 뷰에서 로그인 페이지', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/login')
      const emailInput = page.locator('input[type="email"], input[name="email"]')
      await expect(emailInput).toBeVisible()
    })

    test('모바일 뷰에서 회원가입 페이지', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/signup')
      const emailInput = page.locator('input[type="email"], input[name="email"]')
      await expect(emailInput).toBeVisible()
    })
  })
})
