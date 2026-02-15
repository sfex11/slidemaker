import { expect, test } from '@playwright/test'

test.describe('Auto Slide Foundry E2E', () => {
  test('비로그인 상태에서 로그인 화면이 보인다', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Auto Slide Foundry' })).toBeVisible()
    await expect(page.getByLabel('이메일')).toBeVisible()
    await expect(page.getByLabel('비밀번호')).toBeVisible()
    await expect(page.getByRole('button', { name: '시작하기' })).toBeVisible()
  })

  test('신규 사용자 로그인 후 자동 생성 화면으로 진입한다', async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`
    const password = 'test-password-1234'

    await page.goto('/')
    await page.getByLabel('이메일').fill(email)
    await page.getByLabel('비밀번호').fill(password)
    await page.getByRole('button', { name: '시작하기' }).click()

    await expect(page.getByText('No-edit HTML deck generation')).toBeVisible()
    await expect(page.getByRole('heading', { name: '자동 생성' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'HTML 슬라이드 자동 생성' })).toBeVisible()
  })

  test('입력 모드 전환(URL/PDF/Markdown)이 동작한다', async ({ page }) => {
    const email = `e2e-mode-${Date.now()}@example.com`
    const password = 'test-password-1234'

    await page.goto('/')
    await page.getByLabel('이메일').fill(email)
    await page.getByLabel('비밀번호').fill(password)
    await page.getByRole('button', { name: '시작하기' }).click()
    await expect(page.getByRole('heading', { name: '자동 생성' })).toBeVisible()

    await page.getByRole('tab', { name: /PDF/i }).click()
    await expect(page.getByText('PDF 업로드')).toBeVisible()

    await page.getByRole('tab', { name: /Markdown/i }).click()
    await expect(page.getByPlaceholder(/# 제목/)).toBeVisible()

    await page.getByRole('tab', { name: /URL/i }).click()
    await expect(page.getByPlaceholder('https://example.com/article')).toBeVisible()
  })
})
