/** Deterministická morfologie a parsování dat/míst pro narativní rodinné texty. */

export function nfc(s: string): string {
  return s.normalize('NFC')
}

export function foldKey(s: string): string {
  return nfc(s).trim().toLocaleLowerCase('cs')
}

const MONTHS: Record<string, number> = {
  leden: 1,
  ledna: 1,
  lednu: 1,
  únor: 2,
  února: 2,
  únoru: 2,
  březen: 3,
  března: 3,
  březnu: 3,
  duben: 4,
  dubna: 4,
  dubnu: 4,
  květen: 5,
  května: 5,
  květnu: 5,
  červen: 6,
  června: 6,
  červnu: 6,
  červenec: 7,
  července: 7,
  červenci: 7,
  srpen: 8,
  srpna: 8,
  srpnu: 8,
  září: 9,
  říjen: 10,
  října: 10,
  říjnu: 10,
  listopad: 11,
  listopadu: 11,
  prosinec: 12,
  prosince: 12,
  prosinci: 12,
}

const MONTH_ALT = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|')

export interface ParsedDate {
  canonical: string
  index: number
  length: number
}

function formatDate(day: number | null, month: number | null, year: number, uncertain: boolean): string {
  const prefix = uncertain ? '?' : ''
  if (day != null && month != null) return `${prefix}${day}.${month}.${year}`
  if (month != null) return `${prefix}${month}.${year}`
  return `${prefix}${year}`
}

export function parseDatesInText(text: string): ParsedDate[] {
  const found: ParsedDate[] = []
  const occupied: Array<{ start: number; end: number }> = []

  const overlaps = (start: number, end: number) =>
    occupied.some((r) => start < r.end && end > r.start)

  const add = (index: number, length: number, canonical: string) => {
    if (!canonical || overlaps(index, index + length)) return
    found.push({ canonical, index, length })
    occupied.push({ start: index, end: index + length })
  }

  // 1. dne D. měsíc YYYY
  {
    const re = new RegExp(
      String.raw`(?:dne\s+)?(\d{1,2})\.\s*(?:\[[^\]]*\]\s*)?(${MONTH_ALT})\s+(\d{4})`,
      'gi',
    )
    for (const m of text.matchAll(re)) {
      if (m.index == null) continue
      const day = parseInt(m[1], 10)
      const month = MONTHS[foldKey(m[2])]
      const year = parseInt(m[3], 10)
      if (!month) continue
      add(m.index, m[0].length, formatDate(day, month, year, false))
    }
  }

  // 2. D. M. YYYY
  for (const m of text.matchAll(/(?:dne\s+)?(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/gi)) {
    if (m.index == null) continue
    const day = parseInt(m[1], 10)
    const month = parseInt(m[2], 10)
    const year = parseInt(m[3], 10)
    if (month < 1 || month > 12 || day < 1 || day > 31) continue
    add(m.index, m[0].length, formatDate(day, month, year, false))
  }

  // 3. v listopadu YYYY
  {
    const re = new RegExp(String.raw`v\s+(${MONTH_ALT})\s+(\d{4})`, 'gi')
    for (const m of text.matchAll(re)) {
      if (m.index == null) continue
      const month = MONTHS[foldKey(m[1])]
      const year = parseInt(m[2], 10)
      if (!month) continue
      add(m.index, m[0].length, formatDate(null, month, year, false))
    }
  }

  // 4. pravděpodobně/kolem r. YYYY
  for (const m of text.matchAll(/(?:pravděpodobně|kolem|asi|cca)\s+r\.\s*(\d{4})/gi)) {
    if (m.index == null) continue
    add(m.index, m[0].length, formatDate(null, null, parseInt(m[1], 10), true))
  }

  // 5. r. YYYY / roku YYYY
  for (const m of text.matchAll(/(?:roku|r\.)\s*(\d{4})/gi)) {
    if (m.index == null) continue
    add(m.index, m[0].length, formatDate(null, null, parseInt(m[1], 10), false))
  }

  found.sort((a, b) => a.index - b.index || a.length - b.length)
  return found
}

export function parseLifespanParens(text: string): Array<{
  birthDate: string
  deathDate: string
  index: number
  length: number
}> {
  const out: Array<{ birthDate: string; deathDate: string; index: number; length: number }> = []
  const re = /\((\d{4})\s*[-–]\s*(\d{4})\)/g
  for (const m of text.matchAll(re)) {
    if (m.index == null) continue
    out.push({
      birthDate: m[1],
      deathDate: m[2],
      index: m.index,
      length: m[0].length,
    })
  }
  return out
}

export type GenderHint = 'male' | 'female' | 'unknown'

interface GivenEntry {
  nominative: string
  gender: GenderHint
  forms: string[]
}

const GIVEN_ENTRIES: GivenEntry[] = [
  { nominative: 'Andrea', gender: 'female', forms: ['Andrey', 'Andree', 'Andreu', 'Andreou', 'Andreou'] },
  { nominative: 'Anna', gender: 'female', forms: ['Anny', 'Anně', 'Annu', 'Annou'] },
  { nominative: 'Antonie', gender: 'female', forms: ['Antonii', 'Antonií', 'Antonii'] },
  { nominative: 'Alžběta', gender: 'female', forms: ['Alžběty', 'Alžbětě', 'Alžbětu', 'Alžbětou'] },
  { nominative: 'Božena', gender: 'female', forms: ['Boženy', 'Boženě', 'Boženu', 'Boženou'] },
  { nominative: 'Dorota', gender: 'female', forms: ['Doroty', 'Dorotě', 'Dorotu', 'Dorotou'] },
  { nominative: 'Františka', gender: 'female', forms: ['Františky', 'Františce', 'Františku', 'Františkou'] },
  { nominative: 'Ivana', gender: 'female', forms: ['Ivany', 'Ivaně', 'Ivanu', 'Ivanou'] },
  { nominative: 'Jarmila', gender: 'female', forms: ['Jarmily', 'Jarmile', 'Jarmilu', 'Jarmilou'] },
  { nominative: 'Jenoféfa', gender: 'female', forms: ['Jenoféfy', 'Jenoféfě', 'Jenoféfu', 'Jenoféfou', 'Jenovéfa', 'Jenovéfy', 'Jenovéfou', 'Jenoféra', 'Jenoférou'] },
  { nominative: 'Josefa', gender: 'female', forms: ['Josefy', 'Josefě', 'Josefu', 'Josefou'] },
  { nominative: 'Julie', gender: 'female', forms: ['Julii', 'Julií'] },
  { nominative: 'Kateřina', gender: 'female', forms: ['Kateřiny', 'Kateřině', 'Kateřinu', 'Kateřinou'] },
  { nominative: 'Klára', gender: 'female', forms: ['Kláry', 'Kláře', 'Kláru', 'Klárou'] },
  { nominative: 'Klárka', gender: 'female', forms: ['Klárky', 'Klárce', 'Klárku'] },
  { nominative: 'Kristýna', gender: 'female', forms: ['Kristýny', 'Kristýně', 'Kristýnu', 'Kristýnou'] },
  { nominative: 'Mariana', gender: 'female', forms: ['Mariany', 'Marianě', 'Marianu', 'Marianou'] },
  { nominative: 'Marie', gender: 'female', forms: ['Marii', 'Marií'] },
  { nominative: 'Markéta', gender: 'female', forms: ['Markéty', 'Markétě', 'Markétu', 'Markétou'] },
  { nominative: 'Marta', gender: 'female', forms: ['Marty', 'Martě', 'Martu', 'Martou'] },
  { nominative: 'Milena', gender: 'female', forms: ['Mileny', 'Mileně', 'Milenu', 'Milenou'] },
  { nominative: 'Rosalie', gender: 'female', forms: ['Rosalii', 'Rosalií'] },
  { nominative: 'Terezie', gender: 'female', forms: ['Terezii', 'Terezií'] },
  { nominative: 'Veronika', gender: 'female', forms: ['Veroniky', 'Veronice', 'Veroniku', 'Veronikou'] },
  { nominative: 'Antonín', gender: 'male', forms: ['Antonína', 'Antonínovi', 'Antonínem'] },
  { nominative: 'Augustin', gender: 'male', forms: ['Augustina', 'Augustinovi', 'Augustinem'] },
  { nominative: 'Bartoloměj', gender: 'male', forms: ['Bartoloměje', 'Bartoloměji', 'Bartolomějem'] },
  { nominative: 'Bernard', gender: 'male', forms: ['Bernarda', 'Bernardovi', 'Bernardem'] },
  { nominative: 'Evangelista', gender: 'male', forms: ['Evangelisty', 'Evangelistovi'] },
  { nominative: 'Ladislav', gender: 'male', forms: ['Ladislava', 'Ladislavovi', 'Ladislavem'] },
  { nominative: 'Bohumil', gender: 'male', forms: ['Bohumila', 'Bohumilovi', 'Bohumilem'] },
  { nominative: 'Dobiáš', gender: 'male', forms: ['Dobiáše', 'Dobiášovi', 'Dobiášem'] },
  { nominative: 'Felix', gender: 'male', forms: ['Felixe', 'Felixovi', 'Felixem'] },
  { nominative: 'František', gender: 'male', forms: ['Františka', 'Františkovi', 'Františkem', 'Františku'] },
  { nominative: 'Hynek', gender: 'male', forms: ['Hynka', 'Hynkovi', 'Hynkem', 'Hynku', 'Hinek', 'Hinka'] },
  { nominative: 'Ignác', gender: 'male', forms: ['Ignáce', 'Ignácovi', 'Ignácem'] },
  { nominative: 'Jáchym', gender: 'male', forms: ['Jáchyma', 'Jáchymovi', 'Jáchymem'] },
  { nominative: 'Jan', gender: 'male', forms: ['Jana', 'Janovi', 'Janem', 'Janu'] },
  { nominative: 'Jaroslav', gender: 'male', forms: ['Jaroslava', 'Jaroslavovi', 'Jaroslavem'] },
  { nominative: 'Jiří', gender: 'male', forms: ['Jiřího', 'Jiřímu', 'Jiřím', 'Jiříkovi'] },
  { nominative: 'Josef', gender: 'male', forms: ['Josefa', 'Josefovi', 'Josefem', 'Josefu'] },
  { nominative: 'Karel', gender: 'male', forms: ['Karla', 'Karlovi', 'Karlem'] },
  { nominative: 'Kliment', gender: 'male', forms: ['Klimenta', 'Klimentovi', 'Klimentem'] },
  { nominative: 'Lukáš', gender: 'male', forms: ['Lukáše', 'Lukášovi', 'Lukášem', 'Lukáši'] },
  { nominative: 'Matěj', gender: 'male', forms: ['Matěje', 'Matějovi', 'Matějem'] },
  { nominative: 'Matyáš', gender: 'male', forms: ['Matyáše', 'Matyášovi', 'Matyášem'] },
  { nominative: 'Michal', gender: 'male', forms: ['Michala', 'Michalovi', 'Michalem'] },
  { nominative: 'Miroslav', gender: 'male', forms: ['Miroslava', 'Miroslavovi', 'Miroslavem'] },
  { nominative: 'Oldřich', gender: 'male', forms: ['Oldřicha', 'Oldřichovi', 'Oldřichem'] },
  { nominative: 'Ondřej', gender: 'male', forms: ['Ondřeje', 'Ondřejovi', 'Ondřejem'] },
  { nominative: 'Otto', gender: 'male', forms: ['Ottu', 'Otty', 'Ottovi', 'Ottem'] },
  { nominative: 'Pavel', gender: 'male', forms: ['Pavla', 'Pavlovi', 'Pavlem'] },
  { nominative: 'Václav', gender: 'male', forms: ['Václava', 'Václavovi', 'Václavem'] },
]

const GIVEN_LOOKUP = new Map<string, { nominative: string; gender: GenderHint }>()
for (const entry of GIVEN_ENTRIES) {
  GIVEN_LOOKUP.set(foldKey(entry.nominative), { nominative: entry.nominative, gender: entry.gender })
  for (const form of entry.forms) {
    if (!GIVEN_LOOKUP.has(foldKey(form))) {
      GIVEN_LOOKUP.set(foldKey(form), { nominative: entry.nominative, gender: entry.gender })
    }
  }
}

const GIVEN_ALT = [...new Set([...GIVEN_LOOKUP.keys()])]
  .sort((a, b) => b.length - a.length)
  .map(escapeRegExp)
  .join('|')

export const GIVEN_NAME_RE = new RegExp(`(?<![\\p{L}])(${GIVEN_ALT})(?![\\p{L}])`, 'giu')

export function resolveGivenName(raw: string): { nominative: string; gender: GenderHint } | null {
  return GIVEN_LOOKUP.get(foldKey(raw)) ?? null
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function palatalizeE(stem: string): string {
  const last = stem.slice(-1)
  const rest = stem.slice(0, -1)
  if (last === 'ň') return `${rest}ně`
  if (last === 'ť') return `${rest}tě`
  if (last === 'ď') return `${rest}dě`
  return `${stem}e`
}

function inflectSurname(nominative: string): string[] {
  const forms = new Set<string>([nominative])
  if (nominative.endsWith('ová')) {
    const base = nominative.slice(0, -1)
    forms.add(`${base}é`)
    forms.add(`${base}ou`)
    forms.add(`${base}ě`)
    return [...forms]
  }
  if (nominative.endsWith('ská') || nominative.endsWith('cká') || nominative.endsWith('á')) {
    const base = nominative.slice(0, -1)
    forms.add(`${base}é`)
    forms.add(`${base}ou`)
    return [...forms]
  }
  if (nominative.endsWith('ek')) {
    const stem = nominative.slice(0, -2)
    for (const s of [`${stem}ka`, `${stem}kovi`, `${stem}ku`, `${stem}kem`, `${stem}kové`, `${stem}ků`, `${stem}kových`, `${stem}kovým`]) {
      forms.add(s)
    }
    return [...forms]
  }
  if (nominative.endsWith('ec')) {
    const stem = `${nominative.slice(0, -2)}c`
    for (const s of [`${stem}e`, `${stem}ovi`, `${stem}em`, `${stem}ové`, `${stem}ů`, `${stem}ových`, `${stem}ovým`]) {
      forms.add(s)
    }
    return [...forms]
  }
  if (nominative.endsWith('a')) {
    const stem = nominative.slice(0, -1)
    for (const s of [`${stem}y`, `${stem}u`, `${stem}ovi`, `${stem}ou`, `${stem}ové`, `${stem}ů`, `${stem}ových`, `${stem}ovým`, `${stem}ovými`]) {
      forms.add(s)
    }
    return [...forms]
  }
  for (const s of [
    palatalizeE(nominative),
    `${nominative}ovi`,
    `${nominative}em`,
    `${nominative}ové`,
    `${nominative}ů`,
    `${nominative}ových`,
    `${nominative}ovým`,
    `${nominative}a`,
  ]) {
    forms.add(s)
  }
  return [...forms]
}

const KNOWN_SURNAMES = [
  'Babáčková', 'Bartoň', 'Bartoňová', 'Borkovec', 'Borkovcová', 'Brázda', 'Brázdová',
  'Dostálová', 'Drápalová', 'Fenclová', 'Fialová', 'Houška', 'Houšková', 'Horáková',
  'Hrnčíř', 'Hynek', 'Hynková', 'Kalinová', 'Kalina', 'Klein', 'Kleinová', 'Kučerová',
  'Kučera', 'Librová', 'Lhotská', 'Masařík', 'Masaříková', 'Masaryk', 'Myslivec',
  'Neužil', 'Neužilová', 'Peloušková', 'Peloušek', 'Peroutka', 'Peroutková',
  'Pohudková', 'Procházková', 'Pukl', 'Puklová', 'Rambousková', 'Riebl',
  'Sybr', 'Sybrová', 'Špičková', 'Štěpánek', 'Štěpánková', 'Tlustošová',
  'Trousil', 'Trousilová', 'Zelenka', 'Zelenková', 'Zelinger', 'Zelinka',
  'Zelnitius', 'Zrůbková',
]

const SURNAME_LOOKUP = new Map<string, string>()
for (const nom of KNOWN_SURNAMES) {
  for (const form of inflectSurname(nom)) {
    const key = foldKey(form)
    if (!SURNAME_LOOKUP.has(key)) SURNAME_LOOKUP.set(key, nom)
  }
}

export function resolveSurname(raw: string, gender: GenderHint = 'unknown'): string {
  const trimmed = nfc(raw).replace(/[.,;:]+$/g, '')
  if (gender === 'female' && /(ovou|ové|ově)$/i.test(trimmed)) {
    return trimmed.replace(/(ovou|ové|ově)$/i, 'ová')
  }
  const known = SURNAME_LOOKUP.get(foldKey(trimmed))
  if (known) {
    if (gender === 'female') return toFemaleSurname(known)
    if (gender === 'male') return toMaleSurname(known)
    return known
  }

  if (/(ovou|ové|ově)$/i.test(trimmed) && gender !== 'male') {
    return trimmed.replace(/(ovou|ové|ově)$/i, 'ová')
  }
  if (/skou$/i.test(trimmed) && gender !== 'male') {
    return `${trimmed.slice(0, -3)}ská`
  }
  if (trimmed.endsWith('ovi') && gender !== 'female') {
    const stem = trimmed.slice(0, -3)
    const fromStem = SURNAME_LOOKUP.get(foldKey(stem))
    if (fromStem) return toMaleSurname(fromStem)
    return stem
  }
  return trimmed
}

function toFemaleSurname(nom: string): string {
  if (nom.endsWith('ová') || nom.endsWith('ská') || nom.endsWith('cká') || nom.endsWith('á')) return nom
  if (nom.endsWith('a')) return `${nom.slice(0, -1)}ová`
  if (nom.endsWith('ek')) return `${nom.slice(0, -2)}ková`
  if (nom.endsWith('ec')) return `${nom.slice(0, -2)}cová`
  return `${nom}ová`
}

function toMaleSurname(nom: string): string {
  if (!nom.endsWith('ová')) return nom
  const stem = nom.slice(0, -3)
  const male = SURNAME_LOOKUP.get(foldKey(stem)) ?? SURNAME_LOOKUP.get(foldKey(`${stem}a`))
  if (male && !male.endsWith('ová')) return male
  if (stem.endsWith('k')) return `${stem}a`
  return stem
}

export function genderedSurname(base: string, gender: GenderHint): string {
  const known = SURNAME_LOOKUP.get(foldKey(base)) ?? resolveSurname(base, gender)
  if (gender === 'female') return toFemaleSurname(known)
  if (gender === 'male') return toMaleSurname(known)
  return known
}

export function lineageSurnameFromRod(rodTitle: string): string {
  const raw = rodTitle.replace(/^Rod\s+/i, '').trim()
  const known = SURNAME_LOOKUP.get(foldKey(raw))
  if (known) return genderedSurname(known, 'male')
  if (raw.endsWith('ků')) {
    const stem = raw.slice(0, -1)
    if (stem.endsWith('k')) {
      const asHynek = SURNAME_LOOKUP.get(foldKey(`${stem.slice(0, -1)}ek`))
      if (asHynek) return asHynek
      return `${stem}a`
    }
  }
  if (raw.endsWith('ů')) {
    const stem = raw.slice(0, -1)
    const knownStem = SURNAME_LOOKUP.get(foldKey(stem))
    if (knownStem) return genderedSurname(knownStem, 'male')
    return stem
  }
  return resolveSurname(raw, 'male')
}

const PLACE_FORMS: Array<[string, string[]]> = [
  ['Praha', ['Praze', 'Prahy', 'Prahou']],
  ['Brno', ['Brně', 'Brna', 'Brnem']],
  ['Brno, Ústřední hřbitov', ['brněnském Ústředním hřbitově', 'brněnském Ústředním hřbitov', 'Ústředním hřbitově']],
  ['Vídeň', ['Vídni', 'Vídně', 'Vídní']],
  ['Suchdol nad Lužnicí', ['Suchdola nad Lužnicí', 'Suchdole nad Lužnicí']],
  ['Podolí', ['Podolí']],
  ['Jesenice', ['Jesenici', 'Jesenice']],
  ['Kuželov', ['Kuželova', 'Kuželově', 'Kuželové']],
  ['Vejvanov', ['Vejvanova', 'Vejvanově']],
  ['Postoloprty', ['Postoloprtech', 'Postoloprt']],
  ['Netluky', ['Netluk', 'Netlukách']],
  ['Míchov', ['Míchova', 'Míchově']],
  ['Dalečín', ['Dalečína', 'Dalečíně']],
  ['Studnice', ['Studnic', 'Studnicích']],
  ['Jihlava', ['Jihlavy', 'Jihlavě']],
  ['Kuklík', ['Kuklíku', 'Kuklíka']],
  ['Líšná', ['Líšné', 'Líšnou']],
  ['Sněžné', ['Sněžném', 'Sněžného']],
  ['Jimramov', ['Jimramova', 'Jimramově']],
  ['Letovice', ['Letovic', 'Letovicích']],
  ['Třebětín', ['Třebětína', 'Třebětíně']],
  ['Olomučany', ['Olomučan', 'Olomučanech']],
  ['Bošovice', ['Bošovic', 'Bošovicích']],
  ['Pacov', ['Pacova', 'Pacově']],
  ['Klobouky', ['Kloboukách', 'Klobouk']],
  ['Brumovice', ['Brumovic', 'Brumovicích']],
  ['Krumvíř', ['Krumvíře', 'Krumvíři']],
  ['Rajhrad', ['Rajhradu', 'Rajhradě']],
  ['Žďárec', ['Žďárce', 'Žďárci']],
  ['Uherské Hradiště', ['Uherského Hradiště']],
  ['Černá Hora', ['Černé Hoře', 'Černé Hory']],
  ['Buštěhrad', ['Buštěhradu']],
  ['Herálec', ['Herálci', 'Herálce']],
  ['Olešnice', ['Olešnici']],
  ['Nové Město na Moravě', ['Novém Městě na Moravě']],
  ['Bystřice nad Pernštejnem', ['Bystřicí nad Pernštejnem']],
  ['Ubušín', ['Ubušíně']],
  ['Vříšť', ['Vříšti']],
  ['Buchlov', ['Buchlově']],
  ['Strážnice', ['Strážnice', 'Strážnici']],
  ['Hodonín', ['Hodoníně']],
  ['Rokycany', ['Rokycan', 'Rokycanech']],
  ['Zbiroh', ['Zbirohu']],
  ['Tišnov', ['Tišnova', 'Tišnově']],
  ['Královo Pole', ['Králově Poli', 'Brně - Králově Poli', 'Brně-Králově Poli']],
  ['Starý Brno', ['Starém Brně']],
  ['XXI. vídeňský okres', ['XXI. vídeňský okres']],
]

const PLACE_LOOKUP = new Map<string, string>()
for (const [nom, forms] of PLACE_FORMS) {
  PLACE_LOOKUP.set(foldKey(nom), nom)
  for (const f of forms) PLACE_LOOKUP.set(foldKey(f), nom)
}

export function resolvePlace(raw: string): string {
  let t = nfc(raw).replace(/\s+/g, ' ').replace(/[.,;:]+$/g, '').trim()
  t = t.replace(/\s+č(?:p)?\.?\s*\d+[a-zA-Z]?$/u, (m) => m.replace(/\s+/g, ' '))
  const withoutHouse = t.replace(/\s+č(?:p)?\.?\s*\d+[a-zA-Z]?$/u, '').trim()
  const house = t.match(/\s+(č(?:p)?\.?\s*\d+[a-zA-Z]?)$/u)?.[1]
  const known = PLACE_LOOKUP.get(foldKey(withoutHouse)) ?? PLACE_LOOKUP.get(foldKey(t))
  if (known) return house ? `${known} ${house.replace(/\s+/g, ' ')}` : known
  if (withoutHouse.endsWith('ově')) return house ? `${withoutHouse.slice(0, -3)}ov ${house}` : `${withoutHouse.slice(0, -3)}ov`
  if (withoutHouse.endsWith('icích')) return house ? `${withoutHouse.slice(0, -3)}e ${house}` : `${withoutHouse.slice(0, -3)}e`
  return t
}

const NOT_PLACE = /^(věku|sobotu|místě|oboru|matrice|zápis|přírodě|domě|stavení|obci|okrese|ulici|ul\.|době|letech|časech|souvislosti|zápalu|životě|rodině|manželství|generaci|generace|polovině|počátku|konci|území|katastru|povstání|univerzitě|školy|fakultě|Čech|Čechách)$/i

export function findPlacesInText(text: string): Array<{ place: string; index: number; length: number }> {
  const out: Array<{ place: string; index: number; length: number }> = []
  const re =
    /(?:\b(?:v|ve|z|ze|na|do|u)\s+(?:obci\s+|městečku\s+|osadě\s+)?)((?:sv\.\s+)?[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][\p{L}.]*(?:\s+(?:nad|pod|u|na)\s+[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][\p{L}.]*)?(?:\s+č(?:p)?\.?\s*\d+)?)/gu
  for (const m of text.matchAll(re)) {
    if (m.index == null) continue
    const raw = m[1]
    const first = raw.split(/\s+/)[0] ?? raw
    if (NOT_PLACE.test(first)) continue
    if (MONTHS[foldKey(first)]) continue
    out.push({
      place: resolvePlace(raw),
      index: m.index,
      length: m[0].length,
    })
  }
  const quoted = /místo\s+"([^"]+)"/gi
  for (const m of text.matchAll(quoted)) {
    if (m.index == null) continue
    out.push({
      place: resolvePlace(m[1]),
      index: m.index,
      length: m[0].length,
    })
  }
  return out
}

export function dateSpecificity(date: string): number {
  const d = date.replace(/^\?+/, '')
  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(d)) return 3
  if (/^\d{1,2}\.\d{4}$/.test(d)) return 2
  if (/^\d{4}$/.test(d)) return 1
  return 0
}

export function dateSortKey(date: string): string {
  if (!date) return '9999-99-99'
  const uncertain = date.startsWith('?') ? '1' : '0'
  const d = date.replace(/^\?+/, '')
  const full = d.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (full) {
    return `${full[3]}-${full[2].padStart(2, '0')}-${full[1].padStart(2, '0')}-${uncertain}`
  }
  const my = d.match(/^(\d{1,2})\.(\d{4})$/)
  if (my) return `${my[2]}-${my[1].padStart(2, '0')}-00-${uncertain}`
  const y = d.match(/^(\d{4})$/)
  if (y) return `${y[1]}-00-00-${uncertain}`
  return `8000-${d}`
}

export function pickBetterDate(current: string, incoming: string): string {
  if (!incoming) return current
  if (!current) return incoming
  const cs = dateSpecificity(current)
  const is_ = dateSpecificity(incoming)
  if (is_ > cs) return incoming
  return current
}

export function pickBetterPlace(current: string, incoming: string): string {
  if (!incoming) return current
  if (!current) return incoming
  if (incoming.length > current.length) return incoming
  return current
}
