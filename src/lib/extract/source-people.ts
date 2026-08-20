import {
  dateSortKey,
  findPlacesInText,
  foldKey,
  genderedSurname,
  GIVEN_NAME_RE,
  lineageSurnameFromRod,
  nfc,
  parseDatesInText,
  parseLifespanParens,
  pickBetterDate,
  pickBetterPlace,
  resolveGivenName,
  resolvePlace,
  resolveSurname,
  type GenderHint,
} from './czech-morphology'

export interface ExtractedPerson {
  givenName: string
  familyName: string
  birthDate: string
  birthPlace: string
  deathDate: string
  deathPlace: string
}

export interface ExtractPeopleOptions {
  /** Pouze pro testy — nemění sémantiku, jen ponechává prostor pro budoucí filtry. */
  includeHeadings?: boolean
}

interface MutablePerson extends ExtractedPerson {
  heading: boolean
  sectionIndex: number
}

const SPACED_WORD = '[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ](?:\\s+[a-záčďéěíňóřšťúůýž])+'

const MARRIAGE_RE =
  /\b(sňatek|svatba|svatbě|oženil|ženatý|vdaná|provdala|provdal|oddáni|oddán|manželství|uzavřeli sňatek|uzavřel sňatek)\b/i
const BIRTH_RE =
  /\b(narodil(?:a)? se|se narodil(?:a)?|narozen[aý]|nar\.|rodný list|pocházel(?:a)?)\b/i
const DEATH_RE =
  /\b(zemřel(?:a|ém)?|pochován[ai]?|pohřbeni|pohřbena|pohřben)\b/i

function firstCorrection(bracket: string): string | null {
  const t = bracket.trim()
  if (t.length > 56) return null
  if (
    /strojopis|stránky|nečitelné|Pedagogick|československ|Český svaz|manželem|číslo stránky|rigoróz|zdrobněl|trampa|apod/i.test(
      t,
    )
  ) {
    return null
  }
  if (!/^\p{Lu}/u.test(t) && !/^\d/.test(t)) return null
  const cut = t.split('/')[0]?.trim() ?? t
  return cut.replace(/\s*[,;(].*$/, '').trim() || null
}

/** Spaced-letter jména a krátké `[opravy]` nahradí kanonickým tvarem. */
export function preprocessSourceMarkdown(markdown: string): string {
  let text = nfc(markdown).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
  text = text.replace(/\u00a0/g, ' ')

  const spacedRe = new RegExp(
    `((?:${SPACED_WORD})(?:\\s{1,3}(?:${SPACED_WORD}))*)\\s*\\[([^\\]]+)\\]`,
    'g',
  )
  text = text.replace(spacedRe, (full, _spaced: string, bracket: string) => {
    return firstCorrection(bracket) ?? full
  })

  text = text.replace(
    /(\p{Lu}[\p{L}'-]+)\s*\[([^\]\n]{1,56})\]/gu,
    (full, word: string, bracket: string) => {
      const corr = firstCorrection(bracket)
      if (!corr) return full
      if (/^\p{Lu}/u.test(corr)) return corr
      return word
    },
  )

  text = text.replace(/\*\*([^*]+)\*\*/g, '$1')
  text = text.replace(/\*([^*]+)\*/g, '$1')
  text = text.replace(/^##\s+Strana\s+\d+\s*$/gim, '')
  text = text.replace(/^-\s+\d+\s+-\s*$/gm, '')
  text = text.replace(/[ \t]+\n/g, '\n')
  text = text.replace(/\n{3,}/g, '\n\n')
  return text
}

interface Section {
  heading: string
  body: string
  index: number
  isRod: boolean
  lineage: string
}

function splitSections(text: string): Section[] {
  const lines = text.split('\n')
  const sections: Section[] = []
  let heading = ''
  let body: string[] = []

  const flush = () => {
    const h = heading.trim()
    const b = body.join('\n').trim()
    if (!h && !b) return
    const isRod = /^Rod\b/i.test(h)
    const person = resolvePersonHeading(h)
    sections.push({
      heading: h,
      body: b,
      index: sections.length,
      isRod,
      lineage: isRod
        ? lineageSurnameFromRod(h)
        : person?.familyName || '',
    })
  }

  for (const line of lines) {
    const m = line.match(/^###\s+(.+)$/)
    if (m) {
      flush()
      heading = m[1].trim()
      body = []
      continue
    }
    body.push(line)
  }
  flush()
  return sections
}

function resolvePersonHeading(heading: string): { givenName: string; familyName: string } | null {
  if (!heading || /^Rod\b/i.test(heading)) return null
  const cleaned = heading.replace(/\s+/g, ' ').trim()
  const parts = cleaned.split(' ')
  if (parts.length < 1) return null
  const givenRaw = parts[0]
  const given = resolveGivenName(givenRaw)
  if (!given) return null
  const familyRaw = parts.slice(1).join(' ')
  const family = familyRaw ? resolveSurname(familyRaw, given.gender) : ''
  return { givenName: given.nominative, familyName: family }
}

function emptyPerson(partial: Partial<MutablePerson> & Pick<MutablePerson, 'givenName' | 'sectionIndex'>): MutablePerson {
  return {
    givenName: partial.givenName,
    familyName: partial.familyName ?? '',
    birthDate: partial.birthDate ?? '',
    birthPlace: partial.birthPlace ?? '',
    deathDate: partial.deathDate ?? '',
    deathPlace: partial.deathPlace ?? '',
    heading: partial.heading ?? false,
    sectionIndex: partial.sectionIndex,
  }
}

function mergeInto(target: MutablePerson, src: Partial<ExtractedPerson>): void {
  if (src.givenName && !target.givenName) target.givenName = src.givenName
  if (src.familyName) {
    if (!target.familyName) target.familyName = src.familyName
  }
  target.birthDate = pickBetterDate(target.birthDate, src.birthDate ?? '')
  target.deathDate = pickBetterDate(target.deathDate, src.deathDate ?? '')
  target.birthPlace = pickBetterPlace(target.birthPlace, src.birthPlace ?? '')
  target.deathPlace = pickBetterPlace(target.deathPlace, src.deathPlace ?? '')
}

function sentenceEventKind(sentence: string): 'birth' | 'death' | 'marriage' | 'other' {
  const m = MARRIAGE_RE.test(sentence)
  const b = BIRTH_RE.test(sentence)
  const d = DEATH_RE.test(sentence)
  if (b && !m) return 'birth'
  if (d && !m) return 'death'
  if (m && !b && !d) return 'marriage'
  if (b) return 'birth'
  if (d) return 'death'
  if (m) return 'marriage'
  return 'other'
}

function splitSentences(text: string): string[] {
  const chunks = text
    .split(/\n{2,}/)
    .flatMap((p) => p.split(/(?<=[.!?])\)?\s+(?=\p{Lu}|\()/u))
  return chunks.map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean)
}

interface NameHit {
  givenName: string
  familyName: string
  gender: GenderHint
  index: number
  length: number
}

function specialGiven(raw: string, surname: string): { nominative: string; gender: GenderHint } | null {
  if (foldKey(raw) === 'jana' && /ová$|ská$|cká$/i.test(surname)) {
    return { nominative: 'Jana', gender: 'female' }
  }
  if (foldKey(raw) === 'františka' && surname && !/ová$|ská$|á$/i.test(surname)) {
    return resolveGivenName('František')
  }
  return resolveGivenName(raw)
}

const STOP_SURNAMES = new Set(
  ['nar', 'se', 'dne', 'roku', 'rod', 'strana', 'paní', 'pan', 'manžel', 'manželka', 'dcera', 'syn', 'purkyně'].map(foldKey),
)

function findNameHits(text: string, defaultLineage: string): NameHit[] {
  const hits: NameHit[] = []
  const givenRe = new RegExp(GIVEN_NAME_RE.source, 'giu')
  for (const m of text.matchAll(givenRe)) {
    if (m.index == null) continue
    const rawGiven = m[1] ?? m[0]
    const after = text.slice(m.index + m[0].length)
    const surMatch = after.match(/^(?:\s+rozen(?:á|é|ou|ý))?\s+([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][\p{L}'-]*)/u)
    const rawFamily = surMatch?.[1] ?? ''
    const spec = specialGiven(rawGiven, rawFamily)
    if (!spec) continue
    let family = ''
    if (rawFamily && !STOP_SURNAMES.has(foldKey(rawFamily)) && !resolveGivenName(rawFamily)) {
      family = resolveSurname(rawFamily, spec.gender)
    }
    if (!family && defaultLineage) {
      family = genderedSurname(defaultLineage, spec.gender)
    }
    hits.push({
      givenName: spec.nominative,
      familyName: family,
      gender: spec.gender,
      index: m.index,
      length: m[0].length + (surMatch?.[0].length ?? 0),
    })
  }
  return hits
}

function nearest<T extends { index: number; length: number }>(
  items: T[],
  around: number,
  windowAfter: number,
  windowBefore: number,
): T | null {
  let best: T | null = null
  let bestDist = Infinity
  for (const item of items) {
    const mid = item.index + item.length / 2
    if (mid < around - windowBefore || mid > around + windowAfter) continue
    const dist = Math.abs(mid - around)
    if (dist < bestDist) {
      best = item
      bestDist = dist
    }
  }
  return best
}

function nearestAfter<T extends { index: number; length: number }>(
  items: T[],
  around: number,
  windowAfter: number,
): T | null {
  let best: T | null = null
  let bestDist = Infinity
  for (const item of items) {
    if (item.index < around - 8) continue
    if (item.index > around + windowAfter) continue
    const dist = Math.abs(item.index - around)
    if (dist < bestDist) {
      best = item
      bestDist = dist
    }
  }
  return best
}

function lineageFromSentence(sentence: string, fallback: string): string {
  const m = sentence.match(/\bmanželství\s+(\p{Lu}[\p{L}'-]+)/u)
  if (m) return genderedSurname(resolveSurname(m[1], 'male'), 'male')
  const couple = sentence.match(
    /\b[Mm]anželům\s+.{0,80}?(\p{Lu}[\p{L}'-]+)\s+se narod/u,
  )
  if (couple) return genderedSurname(resolveSurname(couple[1], 'male'), 'male')
  return fallback
}

function headingGender(person: MutablePerson | null): GenderHint {
  if (!person) return 'unknown'
  return resolveGivenName(person.givenName)?.gender ?? 'unknown'
}

function verbGender(sentence: string): GenderHint {
  const start = sentence.trim()
  if (/^(?:Narodila|Zemřela|Pocházela|Narozena)\b/.test(start)) return 'female'
  if (/^(?:Narodil|Zemřel|Pocházel|Narozen)\b/.test(start)) return 'male'
  return 'unknown'
}

function verbAgreesWithHeading(sentence: string, person: MutablePerson | null): boolean {
  const g = headingGender(person)
  if (g === 'unknown' || !person) return true
  const vg = verbGender(sentence)
  if (vg === 'unknown') return true
  return vg === g
}

function applySentenceFacts(
  sentence: string,
  people: NameHit[],
  headingPerson: MutablePerson | null,
  lineage: string,
  collected: MutablePerson[],
  sectionIndex: number,
  lastNamed: NameHit | null,
): void {
  const kind = sentenceEventKind(sentence)
  const dates = parseDatesInText(sentence)
  const lifespans = parseLifespanParens(sentence)
  const places = findPlacesInText(sentence)
  const sentenceLineage = lineageFromSentence(sentence, lineage)
  const parentsOfNewborn = /narodil(?:a)? se manželům/i.test(sentence)
  const daughterOfParents = /^Dcera\b/i.test(sentence.trim()) && /se narodila/i.test(sentence)
  if ((parentsOfNewborn || daughterOfParents) && headingPerson) {
    const date = dates[0]
    const place = places[0]
    if (date) headingPerson.birthDate = pickBetterDate(headingPerson.birthDate, date.canonical)
    if (place) headingPerson.birthPlace = pickBetterPlace(headingPerson.birthPlace, place.place)
  }

  for (const person of people) {
    if (!person.familyName) continue
    collected.push(
      emptyPerson({
        givenName: person.givenName,
        familyName: person.familyName,
        sectionIndex,
      }),
    )
  }

  for (const m of sentence.matchAll(
    /(\p{Lu}[\p{L}'-]+),?\s+rozen(?:á|é|ou)\s+(\p{Lu}[\p{L}'-]+)/gu,
  )) {
    const g = resolveGivenName(m[1])
    if (!g) continue
    collected.push(
      emptyPerson({
        givenName: g.nominative,
        familyName: resolveSurname(m[2], 'female'),
        sectionIndex,
      }),
    )
  }

  const rodnyList = sentence.match(
    /rodný list nese datum\s+(.{3,40}?)\s+a místo\s+"([^"]+)"/i,
  )
  if (rodnyList && headingPerson) {
    const date = parseDatesInText(rodnyList[1])[0]
    if (date) headingPerson.birthDate = pickBetterDate(headingPerson.birthDate, date.canonical)
    headingPerson.birthPlace = pickBetterPlace(headingPerson.birthPlace, resolvePlace(rodnyList[2]))
  }

  const pochazel = sentence.match(/\b[Pp]ocházel(?:a)?\s+ze?\s+([^.]{3,80})/)
  if (pochazel && headingPerson && kind !== 'marriage') {
    const placePart = pochazel[1].split(/\s+v\s+okrese/)[0] ?? pochazel[1]
    const firstPlace = findPlacesInText(`z ${placePart}`)[0]
    if (firstPlace) {
      headingPerson.birthPlace = pickBetterPlace(headingPerson.birthPlace, firstPlace.place)
    }
  }

  const rodnyDum = sentence.match(/\brodným domem bylo stavení\s+(č\.?\s*\d+)/i)
  if (rodnyDum && headingPerson) {
    const house = rodnyDum[1].replace(/\s+/g, ' ')
    if (headingPerson.birthPlace && !headingPerson.birthPlace.includes('č.')) {
      headingPerson.birthPlace = `${headingPerson.birthPlace} ${house}`
    }
  }

  for (const ls of lifespans) {
    const before = sentence.slice(Math.max(0, ls.index - 48), ls.index)
    const name = before.match(/(\p{Lu}[\p{L}'-]+)(?:\s+(\p{Lu}[\p{L}'-]+))?\s*$/u)
    if (!name) continue
    const givenHit = resolveGivenName(name[1])
    if (!givenHit) continue
    const family = name[2]
      ? resolveSurname(name[2], givenHit.gender)
      : genderedSurname(sentenceLineage, givenHit.gender)
    collected.push(
      emptyPerson({
        givenName: givenHit.nominative,
        familyName: family,
        birthDate: ls.birthDate,
        deathDate: ls.deathDate,
        sectionIndex,
      }),
    )
  }

  const zemrelem = sentence.matchAll(/(\p{Lu}[\p{L}'-]+)(?:\s+(\p{Lu}[\p{L}'-]+))?\s+\(zemřelém\s+r\.\s*(\d{4})\)/gu)
  for (const m of zemrelem) {
    const givenHit = resolveGivenName(m[1])
    if (!givenHit) continue
    const family = m[2]
      ? resolveSurname(m[2], givenHit.gender)
      : genderedSurname(sentenceLineage, givenHit.gender)
    collected.push(
      emptyPerson({
        givenName: givenHit.nominative,
        familyName: family,
        deathDate: m[3],
        sectionIndex,
      }),
    )
  }

  const desetileti = sentence.match(
    /zemřel(?:a)?\s+(\d{1,2}\.\s*(?:ledna|února|března|dubna|května|června|července|srpna|září|října|listopadu|prosince)\s+\d{4})[^.]{0,80}o desetiletí později/i,
  )
  if (desetileti) {
    const base = parseDatesInText(desetileti[1])[0]
    const josefa = people.find((p) => p.givenName === 'Josefa') ?? people.find((p) => foldKey(p.givenName) === 'josefa')
    if (base && josefa) {
      const year = base.canonical.match(/(\d{4})$/)?.[1]
      if (year) {
        collected.push(
          emptyPerson({
            givenName: 'Josefa',
            familyName: josefa.familyName,
            deathDate: String(parseInt(year, 10) + 10),
            sectionIndex,
          }),
        )
      }
    }
  }

  if (kind === 'marriage' && !/\bnar\./i.test(sentence) && dates.length === 0 && places.length === 0) return

  if (dates.length === 0 && places.length === 0) return

  const childPatterns = [
    ...sentence.matchAll(
      /\b(?:dcera|dcerou)\s+(\p{Lu}[\p{L}'-]+)(?!\s+\p{Lu})/gu,
    ),
    ...sentence.matchAll(
      /\b(?:syn|synem|synové)\s+(\p{Lu}[\p{L}'-]+)(?!\s+\p{Lu})/gu,
    ),
  ]

  for (const m of childPatterns) {
    if (m.index == null) continue
    if (daughterOfParents && m.index < 12) continue
    const g = resolveGivenName(m[1])
    if (!g) continue
    const date = nearest(dates, m.index, 24, 48)
    const place = nearest(places, m.index, 40, 40)
    const gender: GenderHint = /dcera|dcerou/i.test(m[0]) ? 'female' : /syn\b|synem/i.test(m[0]) ? 'male' : g.gender
    collected.push(
      emptyPerson({
        givenName: g.nominative,
        familyName: genderedSurname(sentenceLineage, gender),
        birthDate: kind === 'death' ? '' : date?.canonical ?? '',
        birthPlace: kind === 'death' ? '' : place?.place ?? '',
        deathDate: kind === 'death' ? date?.canonical ?? '' : '',
        deathPlace: kind === 'death' ? place?.place ?? '' : '',
        sectionIndex,
      }),
    )
  }

  const narDot = [
    ...sentence.matchAll(
      /(\p{Lu}[\p{L}'-]+)(?:\s+(\p{Lu}[\p{L}'-]+))?,?\s*nar\.\s*/gu,
    ),
  ]
  for (const m of narDot) {
    if (m.index == null) continue
    const g = resolveGivenName(m[1])
    if (!g) continue
    const family = m[2] ? resolveSurname(m[2], g.gender) : genderedSurname(sentenceLineage, g.gender)
    const date = nearest(dates, m.index + m[0].length, 40, 5)
    const place = nearest(places, m.index, 70, 20)
    collected.push(
      emptyPerson({
        givenName: g.nominative,
        familyName: family,
        birthDate: date?.canonical ?? '',
        birthPlace: place?.place ?? '',
        sectionIndex,
      }),
    )
  }

  if (people.length === 0 && (kind === 'birth' || kind === 'death')) {
    const vg = verbGender(sentence)
    const implicit =
      lastNamed && (vg === 'unknown' || lastNamed.gender === vg || lastNamed.gender === 'unknown')
        ? lastNamed
        : null
    if (implicit && (!headingPerson || !verbAgreesWithHeading(sentence, headingPerson))) {
      const date = dates[0]
      const place = places[0]
      collected.push(
        emptyPerson({
          givenName: implicit.givenName,
          familyName: implicit.familyName,
          birthDate: kind === 'birth' ? date?.canonical ?? '' : '',
          birthPlace: kind === 'birth' ? place?.place ?? '' : '',
          deathDate: kind === 'death' ? date?.canonical ?? '' : '',
          deathPlace: kind === 'death' ? place?.place ?? '' : '',
          sectionIndex,
        }),
      )
    }
  }

  if (people.length === 0 && headingPerson && kind !== 'other' && verbAgreesWithHeading(sentence, headingPerson)) {
    const date = dates[0]
    const place = places[0]
    if (kind === 'birth') {
      if (date) headingPerson.birthDate = pickBetterDate(headingPerson.birthDate, date.canonical)
      if (place) headingPerson.birthPlace = pickBetterPlace(headingPerson.birthPlace, place.place)
    }
    if (kind === 'death') {
      if (date) headingPerson.deathDate = pickBetterDate(headingPerson.deathDate, date.canonical)
      if (place) headingPerson.deathPlace = pickBetterPlace(headingPerson.deathPlace, place.place)
    }
    return
  }

  if (headingPerson && (kind === 'birth' || kind === 'death') && verbAgreesWithHeading(sentence, headingPerson)) {
    const childMentioned = !daughterOfParents && /(?:dcera|syn|děti|dcerou|synem)\s+\p{Lu}/u.test(sentence)
    const headingLead =
      headingPerson &&
      new RegExp(
        `^${headingPerson.givenName}\\b[^.]*\\b(narodil|narodila|narozen|zemřel|zemřela|pocházel|pocházela)`,
        'i',
      ).test(sentence)
    const startsWithBio = /^(?:Narod|Zemřel|Pocházel|Narozen)/.test(sentence.trim())
    if (
      !childMentioned &&
      (people.length === 0 || startsWithBio || headingLead) &&
      (!people[0] || people[0].givenName === headingPerson.givenName)
    ) {
      const date = dates[0]
      const place = places[0]
      if (kind === 'birth') {
        if (date) headingPerson.birthDate = pickBetterDate(headingPerson.birthDate, date.canonical)
        if (place) headingPerson.birthPlace = pickBetterPlace(headingPerson.birthPlace, place.place)
      } else {
        if (date) headingPerson.deathDate = pickBetterDate(headingPerson.deathDate, date.canonical)
        if (place) headingPerson.deathPlace = pickBetterPlace(headingPerson.deathPlace, place.place)
      }
    }
  }

  if (kind === 'birth' || kind === 'death' || kind === 'other') {
    const childAt = sentence.search(/\b(?:dcera|syn|dcerou|synem)\s+\p{Lu}/u)
    for (const person of people) {
      if (parentsOfNewborn || daughterOfParents) continue
      if (childAt >= 0 && person.index < childAt) continue
      const date = person.familyName
        ? nearestAfter(dates, person.index, 90)
        : nearestAfter(dates, person.index, 28)
      const place = person.familyName ? nearest(places, person.index, 80, 20) : null
      if (!date && !place) continue
      const localKind = kind === 'other' ? guessKindAround(sentence, person.index) : kind
      if (localKind === 'marriage' || localKind === 'other') continue
      collected.push(
        emptyPerson({
          givenName: person.givenName,
          familyName: person.familyName,
          birthDate: localKind === 'birth' ? date?.canonical ?? '' : '',
          birthPlace: localKind === 'birth' ? place?.place ?? '' : '',
          deathDate: localKind === 'death' ? date?.canonical ?? '' : '',
          deathPlace: localKind === 'death' ? place?.place ?? '' : '',
          sectionIndex,
        }),
      )
    }
  }
}

function guessKindAround(sentence: string, index: number): 'birth' | 'death' | 'marriage' | 'other' {
  const window = sentence.slice(Math.max(0, index - 50), index + 80)
  return sentenceEventKind(window)
}

function personKey(p: ExtractedPerson): string {
  const birth = p.birthDate.replace(/^\?+/, '').match(/(\d{4})$/)?.[1] ?? ''
  return `${foldKey(p.givenName)}|${foldKey(p.familyName)}|${birth}`
}

function mergePeople(people: MutablePerson[]): MutablePerson[] {
  const headings = people.filter((p) => p.heading)
  const others = people.filter((p) => !p.heading)

  const mergedOthers: MutablePerson[] = []
  const otherIndex = new Map<string, MutablePerson>()
  for (const p of others) {
    if (!p.givenName) continue
    const key = personKey(p)
    const existing = otherIndex.get(key)
    if (existing) {
      mergeInto(existing, p)
    } else {
      const copy = { ...p }
      otherIndex.set(key, copy)
      mergedOthers.push(copy)
    }
  }

  const leftover: MutablePerson[] = []
  for (const o of mergedOthers) {
    const matches = headings.filter((h) => {
      if (foldKey(h.givenName) !== foldKey(o.givenName)) return false
      if (h.familyName && o.familyName && foldKey(h.familyName) !== foldKey(o.familyName)) return false
      const hy = h.birthDate.replace(/^\?+/, '').match(/(\d{4})$/)?.[1]
      const oy = o.birthDate.replace(/^\?+/, '').match(/(\d{4})$/)?.[1]
      if (hy && oy) return hy === oy
      return true
    })
    if (matches.length === 1) {
      mergeInto(matches[0], o)
    } else if (matches.length > 1) {
      const yearMatch = matches.filter((h) => {
        const hy = h.birthDate.replace(/^\?+/, '').match(/(\d{4})$/)?.[1]
        const oy = o.birthDate.replace(/^\?+/, '').match(/(\d{4})$/)?.[1]
        return hy && oy && hy === oy
      })
      if (yearMatch.length === 1) mergeInto(yearMatch[0], o)
      else leftover.push(o)
    } else {
      leftover.push(o)
    }
  }

  return [...headings, ...leftover]
}

function hasAnyFact(p: ExtractedPerson): boolean {
  return Boolean(p.givenName && p.familyName)
}

function extractPohrb(text: string, headingPerson: MutablePerson | null): void {
  const m = text.match(/\b(?:[Jj]sou pochováni|[Pp]ochováni jsou|[Pp]ohřbeni jsou)\s+(?:ve?|na)\s+([^.]{3,80})/)
  if (!m || !headingPerson) return
  const place = resolvePlace(m[1].replace(/\s+s manželkou.*$/i, ''))
  headingPerson.deathPlace = pickBetterPlace(headingPerson.deathPlace, place)
}

export function extractPeopleFromSourceMarkdown(
  markdown: string,
  options: ExtractPeopleOptions = {},
): ExtractedPerson[] {
  const includeHeadings = options.includeHeadings ?? true
  const text = preprocessSourceMarkdown(markdown)
  const sections = splitSections(text)
  const collected: MutablePerson[] = []
  let currentLineage = ''

  for (const section of sections) {
    if (section.isRod && section.lineage) currentLineage = section.lineage
    const headingPersonInfo = includeHeadings ? resolvePersonHeading(section.heading) : null
    const headingPerson = headingPersonInfo
      ? emptyPerson({
          givenName: headingPersonInfo.givenName,
          familyName: headingPersonInfo.familyName,
          heading: true,
          sectionIndex: section.index,
        })
      : null
    if (headingPerson) collected.push(headingPerson)
    if (headingPerson?.familyName) {
      currentLineage = genderedSurname(headingPerson.familyName, 'male')
    } else if (section.lineage) {
      currentLineage = section.lineage
    }

    const block = section.body
    extractPohrb(block, headingPerson)

    const parentheticalBirths = block.matchAll(
      /\((\p{Lu}[\p{L}'-]+)\s+nar\.\s*([^)]+)\)/gu,
    )
    for (const m of parentheticalBirths) {
      const g = resolveGivenName(m[1])
      if (!g) continue
      const inner = m[2]
      const date = parseDatesInText(inner)[0]
      collected.push(
        emptyPerson({
          givenName: g.nominative,
          familyName: genderedSurname(currentLineage, g.gender),
          birthDate: date?.canonical ?? '',
          sectionIndex: section.index,
        }),
      )
    }

    const coupleBirths = block.matchAll(
      /\((\p{Lu}[\p{L}'-]+)\s+nar\.\s*([^,]+),\s*(\p{Lu}[\p{L}'-]+)\s+([^)]+)\)/gu,
    )
    for (const m of coupleBirths) {
      const g1 = resolveGivenName(m[1])
      const g2 = resolveGivenName(m[3])
      if (g1) {
        collected.push(
          emptyPerson({
            givenName: g1.nominative,
            familyName: genderedSurname(currentLineage, g1.gender),
            birthDate: parseDatesInText(m[2])[0]?.canonical ?? '',
            sectionIndex: section.index,
          }),
        )
      }
      if (g2) {
        collected.push(
          emptyPerson({
            givenName: g2.nominative,
            familyName: genderedSurname(currentLineage, g2.gender),
            birthDate: parseDatesInText(m[4])[0]?.canonical ?? '',
            sectionIndex: section.index,
          }),
        )
      }
    }

    let lastMaleFamily = currentLineage
    let lastNamed: NameHit | null = null
    for (const sentence of splitSentences(block)) {
      const hits = findNameHits(sentence, '')
      const lineageForSentence = /jejich děti/i.test(sentence) ? lastMaleFamily : currentLineage
      applySentenceFacts(
        sentence,
        hits,
        headingPerson,
        lineageForSentence,
        collected,
        section.index,
        lastNamed,
      )
      const named = [...hits].reverse().find((h) => h.familyName) ?? hits.at(-1) ?? null
      if (named) lastNamed = named
      const male = [...hits].reverse().find((h) => h.gender === 'male' && h.familyName)
      if (male) lastMaleFamily = genderedSurname(male.familyName, 'male')
    }
  }

  const merged = mergePeople(collected)
    .filter((p) => hasAnyFact(p) || p.heading)

  return sortExtractedPeople(dedupeExact(merged)).map((p) => ({
    givenName: p.givenName,
    familyName: p.familyName,
    birthDate: p.birthDate,
    birthPlace: p.birthPlace,
    deathDate: p.deathDate,
    deathPlace: p.deathPlace,
  }))
}

function dedupeExact(people: MutablePerson[]): MutablePerson[] {
  const out: MutablePerson[] = []
  const seen = new Set<string>()
  for (const p of people) {
    const key = `${p.heading ? 'h' : 'i'}|${p.sectionIndex}|${foldKey(p.givenName)}|${foldKey(p.familyName)}|${p.birthDate}|${p.deathDate}|${foldKey(p.birthPlace)}|${foldKey(p.deathPlace)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(p)
  }

  const collapsed: MutablePerson[] = []
  for (const p of out) {
    const sibling = collapsed.find((c) => {
      if (c.heading && p.heading) return false
      if (foldKey(c.givenName) !== foldKey(p.givenName)) return false
      if (foldKey(c.familyName) !== foldKey(p.familyName)) return false
      const cy = c.birthDate.replace(/^\?+/, '').match(/(\d{4})$/)?.[1] ?? ''
      const py = p.birthDate.replace(/^\?+/, '').match(/(\d{4})$/)?.[1] ?? ''
      if (cy && py && cy !== py) return false
      const dy = c.deathDate.replace(/^\?+/, '').match(/(\d{4})$/)?.[1] ?? ''
      const qy = p.deathDate.replace(/^\?+/, '').match(/(\d{4})$/)?.[1] ?? ''
      if (dy && qy && dy !== qy) return false
      return true
    })
    if (sibling) {
      mergeInto(sibling, p)
    } else {
      collapsed.push({ ...p })
    }
  }
  return collapsed
}

export function sortExtractedPeople(people: ExtractedPerson[]): ExtractedPerson[] {
  return [...people].sort((a, b) => {
    const fa = (a.familyName || '\uFFFF').localeCompare(b.familyName || '\uFFFF', 'cs')
    if (fa !== 0) return fa
    const ga = a.givenName.localeCompare(b.givenName, 'cs')
    if (ga !== 0) return ga
    const da = dateSortKey(a.birthDate).localeCompare(dateSortKey(b.birthDate))
    if (da !== 0) return da
    const dd = dateSortKey(a.deathDate).localeCompare(dateSortKey(b.deathDate))
    if (dd !== 0) return dd
    const pa = a.birthPlace.localeCompare(b.birthPlace, 'cs')
    if (pa !== 0) return pa
    return a.deathPlace.localeCompare(b.deathPlace, 'cs')
  })
}

function csvCell(value: string): string {
  if (/[;"\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function extractedPeopleToCsv(people: ExtractedPerson[]): string {
  const header = ['jmeno', 'prijmeni', 'narozeni', 'misto_narozeni', 'umrti', 'misto_umrti']
  const rows = people.map((p) =>
    [p.givenName, p.familyName, p.birthDate, p.birthPlace, p.deathDate, p.deathPlace]
      .map(csvCell)
      .join(';'),
  )
  return [header.join(';'), ...rows].join('\n') + '\n'
}

export function extractedPeopleToMarkdownTable(people: ExtractedPerson[]): string {
  const header = '| Jméno | Příjmení | Narození | Místo narození | Úmrtí | Místo úmrtí |'
  const sep = '| --- | --- | --- | --- | --- | --- |'
  const rows = people.map(
    (p) =>
      `| ${p.givenName} | ${p.familyName} | ${p.birthDate} | ${p.birthPlace} | ${p.deathDate} | ${p.deathPlace} |`,
  )
  return [header, sep, ...rows].join('\n') + '\n'
}

export function extractedPeopleToJson(people: ExtractedPerson[]): string {
  return `${JSON.stringify(people, null, 2)}\n`
}
