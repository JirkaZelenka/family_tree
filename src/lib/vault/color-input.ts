function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)))
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => clampByte(c).toString(16).padStart(2, '0')).join('')}`
}

function expandShortHex(hex: string): string | null {
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    return hex
      .split('')
      .map((c) => c + c)
      .join('')
  }
  if (/^[0-9a-f]{6}$/i.test(hex)) return hex
  return null
}

/** Převod vstupu (#hex, rgb(), nebo „255, 128, 64“) na #rrggbb. */
export function parseColorInput(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const hexMatch = trimmed.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hexMatch) {
    const expanded = expandShortHex(hexMatch[1])
    return expanded ? `#${expanded.toLowerCase()}` : null
  }

  const rgbMatch = trimmed.match(
    /^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/i,
  )
  if (rgbMatch) {
    return toHex(
      Number(rgbMatch[1]),
      Number(rgbMatch[2]),
      Number(rgbMatch[3]),
    )
  }

  const parts = trimmed.split(/[\s,;]+/).filter(Boolean)
  if (parts.length === 3 && parts.every((p) => /^\d{1,3}$/.test(p))) {
    return toHex(Number(parts[0]), Number(parts[1]), Number(parts[2]))
  }

  return null
}

export function colorInputToDisplay(hex: string): string {
  const normalized = parseColorInput(hex)
  if (!normalized) return hex
  const body = normalized.replace('#', '')
  const r = Number.parseInt(body.slice(0, 2), 16)
  const g = Number.parseInt(body.slice(2, 4), 16)
  const b = Number.parseInt(body.slice(4, 6), 16)
  return `rgb(${r}, ${g}, ${b})`
}
