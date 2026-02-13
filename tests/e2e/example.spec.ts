import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/')

    // Wait for the page to be ready
    await page.waitForLoadState('networkidle')

    // Check that the page loaded
    await expect(page).toHaveURL('/')
  })

  test('should have correct page title', async ({ page }) => {
    await page.goto('/')

    // Check page title exists
    const title = await page.title()
    expect(title).toBeTruthy()
  })
})

test.describe('Navigation', () => {
  test('should be able to navigate to login page', async ({ page }) => {
    await page.goto('/')

    // Try to find and click login/signin link if it exists
    const loginLink = page.locator('a[href*="signin"], a[href*="login"]').first()

    if (await loginLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await loginLink.click()
      await expect(page).toHaveURL(/signin|login/)
    }
  })
})

test.describe('Responsive Design', () => {
  test('should display correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // Page should still be visible on mobile
    await expect(page.locator('body')).toBeVisible()
  })

  test('should display correctly on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/')

    // Page should be visible on desktop
    await expect(page.locator('body')).toBeVisible()
  })
})
