import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '@/i18n'
import { LoginPage } from '@/components/auth/LoginPage'

describe('LoginPage', () => {
  it('shows a classic username and password form', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText('Jméno')).toBeInTheDocument()
    expect(screen.getByLabelText('Heslo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Přihlásit se' })).toBeInTheDocument()
  })
})
