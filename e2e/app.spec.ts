import { test, expect } from '@playwright/test'
import { mockLoggedIn } from './auth'

test.describe('with all lineages', () => {
  test.beforeEach(async ({ page }) => {
    await mockLoggedIn(page)
  })

  test('loads app with sample data', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Family Tree Graph')).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('tab', { name: /Sféra/i })).toBeVisible({ timeout: 15000 })
  })

  test('switches views', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('tab', { name: /Strom/i }).click()
    await expect(page.getByText('Jan Novák')).toBeVisible({ timeout: 15000 })
  })
})

test('hides lineages the user is not allowed to see', async ({ page }) => {
  await mockLoggedIn(page, {
    username: 'reader',
    role: 'readonly',
    isAdmin: false,
    canEditSavedViews: false,
    allowedLineages: ['novakovi'],
  })
  await page.goto('/')
  await page.getByRole('tab', { name: /Strom/i }).click()
  await expect(page.getByText('Jan Novák')).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('František Dvořák')).toHaveCount(0)
  await expect(page.getByText('dvorakovi')).toHaveCount(0)
  await expect(page.getByText('X', { exact: true }).first()).toBeVisible()
})
