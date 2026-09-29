import { test, expect } from '@playwright/test'
import { mockLoggedIn, mockLoggedOut } from './auth'

test('shows login form when logged out', async ({ page }) => {
  await mockLoggedOut(page)
  await page.goto('/')
  await expect(page.getByLabel('Jméno')).toBeVisible()
  await expect(page.getByLabel('Heslo')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Přihlásit se' })).toBeVisible()
})

test('logs in with username and password', async ({ page }) => {
  await mockLoggedOut(page)
  await page.route('**/api/auth/login', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        username: 'editor',
        role: 'editor',
        isAdmin: false,
        canEditSavedViews: true,
      }),
    })
  })
  await page.goto('/')
  await page.getByLabel('Jméno').fill('editor')
  await page.getByLabel('Heslo').fill('secret')
  await page.getByRole('button', { name: 'Přihlásit se' }).click()
  await mockLoggedIn(page)
  await expect(page.getByRole('tab', { name: /Sféra/i })).toBeVisible({ timeout: 15000 })
})
