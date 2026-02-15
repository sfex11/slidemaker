import { test, expect } from '@playwright/test'

test.describe('Slide Maker E2E', () => {
  test('로그인 페이지가 렌더링된다', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: 'Slide Maker' })).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('비인증 사용자는 보호된 라우트에서 로그인으로 리다이렉트된다', async ({ page }) => {
    await page.goto('/projects')
    await expect(page).toHaveURL(/\/login/)
  })

  test('신규 사용자 로그인 후 대시보드에 진입한다', async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`
    const password = 'test-password-1234'

    await page.goto('/login')
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[type="password"]').fill(password)
    await page.getByRole('button', { name: '로그인' }).click()

    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: '내 프로젝트' })).toBeVisible()
  })
})
