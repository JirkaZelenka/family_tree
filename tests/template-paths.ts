/** Kořen ukázkových dat ve složce templates (ne v .gitignore). */
export const TEMPLATE_DATA_ROOT = 'templates/data'

export function templateDataPath(...segments: string[]): string {
  return [TEMPLATE_DATA_ROOT, ...segments].join('/')
}
