import type { Gender } from '@/types/person'

/** Klíč bez diakritiky, malými písmeny (zelenkovi, bartonovi, …). */
export function normalizeLineageKey(lineage: string): string {
  return lineage
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
}

const LINEAGE_SURNAME_FORMS: Record<string, { male: string; female: string }> = {
  zelenkovi: { male: 'Zelenka', female: 'Zelenková' },
  spilkovi: { male: 'Spilka', female: 'Spilková' },
  hladikovi: { male: 'Hladík', female: 'Hladíková' },
  brazdovi: { male: 'Brazda', female: 'Brazdová' },
  nagyovi: { male: 'Nagy', female: 'Nagyová' },
  novotni: { male: 'Novotný', female: 'Novotná' },
  trousilovi: { male: 'Trousil', female: 'Trousilová' },
  borkovcovi: { male: 'Borkovec', female: 'Borkovcová' },
  hynkovi: { male: 'Hynek', female: 'Hynková' },
  pelouskovi: { male: 'Peloušek', female: 'Peloušková' },
  peroutkovi: { male: 'Peroutka', female: 'Peroutková' },
  kucerovi: { male: 'Kučera', female: 'Kučerová' },
  fialovi: { male: 'Fiala', female: 'Fialová' },
  stepankova: { male: 'Štěpánek', female: 'Štěpánková' },
  bartonovi: { male: 'Bartoň', female: 'Bartoňová' },
  masarikovi: { male: 'Masarík', female: 'Masaríková' },
}

function capitalizeWord(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Odvozené rodné příjmení z názvu rodu (`lineage`). */
export function lineageToMaidenName(lineage: string, gender: Gender): string {
  const key = normalizeLineageKey(lineage)
  const known = LINEAGE_SURNAME_FORMS[key]
  if (known) {
    return gender === 'female' ? known.female : known.male
  }

  let stem = key.replace(/ovi$/, '').replace(/ova$/, '').replace(/ove$/, '')
  if (stem.endsWith('ec')) {
    return gender === 'female'
      ? capitalizeWord(stem) + 'ová'
      : capitalizeWord(stem)
  }
  if (stem.endsWith('c')) {
    const base = stem + 'ec'
    return gender === 'female'
      ? capitalizeWord(base) + 'ová'
      : capitalizeWord(base)
  }
  if (stem.endsWith('k')) {
    return gender === 'female'
      ? capitalizeWord(stem) + 'ová'
      : capitalizeWord(stem.slice(0, -1)) + 'ek'
  }
  if (stem.endsWith('y')) {
    return gender === 'female'
      ? capitalizeWord(stem.slice(0, -1)) + 'á'
      : capitalizeWord(stem) + 'ý'
  }
  return gender === 'female'
    ? capitalizeWord(stem) + 'ová'
    : capitalizeWord(stem)
}
