import type { Page } from '@playwright/test'
import type { AuthUser } from '../src/auth/roles'

export const editorUser: AuthUser = {
  username: 'editor',
  role: 'editor',
  isAdmin: false,
  canEditSavedViews: true,
}

export async function mockLoggedIn(page: Page, user: AuthUser = editorUser) {
  await page.route('**/api/auth/csrf', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'ok' }),
    })
  })
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(user),
    })
  })
}

export async function mockLoggedOut(page: Page) {
  await page.route('**/api/auth/csrf', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'ok' }),
    })
  })
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Nepřihlášen.' }),
    })
  })
}
