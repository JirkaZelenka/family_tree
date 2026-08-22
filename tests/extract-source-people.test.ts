import { describe, expect, it } from 'vitest'
import {
  parseDatesInText,
  resolveGivenName,
  resolvePlace,
  resolveSurname,
} from '@/lib/extract/czech-morphology'
import {
  extractPeopleFromSourceMarkdown,
  extractedPeopleToCsv,
  extractedPeopleToMarkdownTable,
  preprocessSourceMarkdown,
} from '@/lib/extract/source-people'

const SAMPLE = `# Krátký spis

### Rod Zelenků

### Karel Zelenka

Pocházel ze Suchdola nad Lužnicí v okrese Třeboň. Jeho rodným domem bylo stavení č. 14.
Karel Zelenka odešel za prací do Prahy. Oženil se s Marií Neužilovou.

### Jiří Zelenka

Narodil se manželům Marii a Karlovi Zelenkovým z Podolí dne 26. února 1930.
Tehdy ještě žila i babička novorozence, paní Terezie Zelenková ze Suchdola.
Jiří Zelenka se vyučil. Jeho manželkou se stala Jarmila M a s a ř í k o v á [Masaříková].

### Jan Masařík

Antonie Horáková se narodila r. 1881. Zemřela ve věku čtyřiasedmdesáti let 16. srpna 1955.

### Jan Masařík

Narodil se, když jeho rodiče pracovali ve Vídni. Jeho rodný list nese datum 12. ledna 1906 a místo "XXI. vídeňský okres."

Marie H o u š k o v á [Houšková] se narodila 30. září 1911.

Z manželství Kleinových se 27. června 1878 narodila dcera Julie.

### Jarmila Masaříková

Dcera Marie a Jana Masaříkových se narodila 6. prosince 1930.
Manželům Jarmile a Jiřímu Zelenkovým se narodila 11. června 1957 dcera Ivana a 25. [22.? číslice ve strojopisu je nejasná] prosince 1963 syn Jiří.
Ivana Zelenková se dne 16. prosince 1978 provdala za Otto Trousila, nar. 17. května 1956 v Praze.
Jejich děti jsou Klárka nar. 23. března 1980 a Michal, nar. 18. dubna 1982.

### Jan Bartoň

V 18. století následoval po hospodáři Lukáši Bartoňovi (zemřelém r. 1758) jeho syn František (1701 - 1787), syn tohoto Jiří (1753 - 1816).
Jan Bartoň zemřel v Míchově 28. listopadu 1883.

### Jaroslav Bartoň

Oženil se 4. srpna 1935 s F r a n t i š k o u  P u k l o v o u [Františkou Puklovou].
(Jaroslav nar. 3. 4. 1906, Františka 30. 9. 1909.)
Františka Bartoňová zemřela již 28. února 1987, manžel Jaroslav 30. června 1989.
`

describe('preprocessSourceMarkdown', () => {
  it('nahradí jména s mezerami tvarem z hranatých závorek', () => {
    const out = preprocessSourceMarkdown(
      'Jarmila M a s a ř í k o v á [Masaříková] a F r a n t i š k o u  P u k l o v o u [Františkou Puklovou].',
    )
    expect(out).toContain('Masaříková')
    expect(out).toContain('Františkou Puklovou')
    expect(out).not.toMatch(/M a s a ř í k o v á/)
  })
})

describe('czech morphology', () => {
  it('parsuje česká data na kanonický tvar D.M.RRRR', () => {
    const dates = parseDatesInText('Narodil se dne 26. února 1930 a zemřel r. 1989. Další 3. 4. 1906.')
    expect(dates.map((d) => d.canonical)).toEqual(['26.2.1930', '1989', '3.4.1906'])
  })

  it('převádí jména a příjmení do 1. pádu', () => {
    expect(resolveGivenName('Jiřího')?.nominative).toBe('Jiří')
    expect(resolveGivenName('Karlovi')?.nominative).toBe('Karel')
    expect(resolveSurname('Zelenkovým', 'male')).toBe('Zelenka')
    expect(resolveSurname('Bartoňové', 'female')).toBe('Bartoňová')
    expect(resolvePlace('Míchově')).toBe('Míchov')
    expect(resolvePlace('Suchdola nad Lužnicí')).toBe('Suchdol nad Lužnicí')
  })
})

describe('extractPeopleFromSourceMarkdown', () => {
  it('je deterministický na stejném vstupu', () => {
    const a = extractPeopleFromSourceMarkdown(SAMPLE)
    const b = extractPeopleFromSourceMarkdown(SAMPLE)
    expect(a).toEqual(b)
    expect(extractedPeopleToMarkdownTable(a)).toBe(extractedPeopleToMarkdownTable(b))
    expect(extractedPeopleToCsv(a)).toBe(extractedPeopleToCsv(b))
  })

  it('vytáhne klíčové osoby, data a místa', () => {
    const people = extractPeopleFromSourceMarkdown(SAMPLE)
    const byName = (given: string, family: string) =>
      people.filter((p) => p.givenName === given && p.familyName === family)

    const karel = byName('Karel', 'Zelenka')[0]
    expect(karel?.birthPlace).toMatch(/Suchdol nad Lužnicí/)

    const jiri1930 = byName('Jiří', 'Zelenka').find((p) => p.birthDate === '26.2.1930')
    expect(jiri1930).toBeTruthy()
    expect(jiri1930?.birthPlace).toMatch(/Podolí/)

    expect(byName('Marie', 'Neužilová').length).toBeGreaterThan(0)
    expect(byName('Jarmila', 'Masaříková')[0]?.birthDate).toBe('6.12.1930')

    const jan1906 = byName('Jan', 'Masařík').find((p) => p.birthDate === '12.1.1906')
    expect(jan1906?.birthPlace).toMatch(/vídeňský/)

    expect(byName('Antonie', 'Horáková')[0]?.birthDate).toBe('1881')
    expect(byName('Antonie', 'Horáková')[0]?.deathDate).toBe('16.8.1955')
    expect(byName('Marie', 'Houšková')[0]?.birthDate).toBe('30.9.1911')
    expect(byName('Julie', 'Kleinová')[0]?.birthDate).toBe('27.6.1878')

    expect(byName('Ivana', 'Zelenková')[0]?.birthDate).toBe('11.6.1957')
    expect(byName('Otto', 'Trousil')[0]?.birthDate).toBe('17.5.1956')
    expect(byName('Otto', 'Trousil')[0]?.birthPlace).toBe('Praha')
    expect(byName('Klárka', 'Trousilová')[0]?.birthDate ?? byName('Klárka', 'Trousil')[0]?.birthDate).toBe(
      '23.3.1980',
    )

    expect(byName('František', 'Bartoň').some((p) => p.birthDate === '1701' && p.deathDate === '1787')).toBe(
      true,
    )
    expect(byName('Lukáš', 'Bartoň')[0]?.deathDate).toBe('1758')

    const jaroslav = byName('Jaroslav', 'Bartoň').find((p) => p.birthDate === '3.4.1906')
    expect(jaroslav?.deathDate).toBe('30.6.1989')
    const frantiskaBirth =
      [...byName('Františka', 'Puklová'), ...byName('Františka', 'Bartoňová')].find((p) => p.birthDate)
        ?.birthDate
    expect(frantiskaBirth).toBe('30.9.1909')
  })

  it('řadí výstup stabilně (stejné pořadí při opakování)', () => {
    const a = extractPeopleFromSourceMarkdown(SAMPLE)
    const b = extractPeopleFromSourceMarkdown(SAMPLE)
    expect(a.map((p) => `${p.familyName}|${p.givenName}|${p.birthDate}`)).toEqual(
      b.map((p) => `${p.familyName}|${p.givenName}|${p.birthDate}`),
    )
  })
})
