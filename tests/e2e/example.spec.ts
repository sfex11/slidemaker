import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/')

    // Wait for the page to be ready
    await page.waitForLoadState('networkidle')

    // Should redirect to login page (root is protected)
    await expect(page).toHaveURL(/login/)
  })

  test('should have correct page title', async ({ page }) => {
    await page.goto('/login')

    // Check page title exists
    const title = await page.title()
    expect(title).toBeTruthy()
  })
})

test.describe('Navigation', () => {
  test('should be able to navigate to login page', async ({ page }) => {
    await page.goto('/login')

    // Login page should be accessible
    await expect(page).toHaveURL(/login/)
  })
})

test.describe('Responsive Design', () => {
  test('should display correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/login')

    // Page should still be visible on mobile
    await expect(page.locator('body')).toBeVisible()
  })

  test('should display correctly on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/login')

    // Page should be visible on desktop
    await expect(page.locator('body')).toBeVisible()
  })
})
