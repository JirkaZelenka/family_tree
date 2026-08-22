import { describe, expect, it } from 'vitest'
import { parse as parseYaml } from 'yaml'
import {
  buildPlaceIndex,
  listUnresolvedPlaces,
  parsePlacesFile,
  resolvePlaceCoords,
} from '@/lib/map/places'
import placesYaml from '../data/.family-tree/places.yaml?raw'

describe('places mapping', () => {
  it('resolves known Czech places from places.yaml', () => {
    const file = parsePlacesFile(parseYaml(placesYaml))
    const index = buildPlaceIndex(file.places)

    expect(resolvePlaceCoords('Praha', index)).toMatchObject({
      lat: 50.0755,
      lon: 14.4378,
    })
    expect(resolvePlaceCoords('Vejvanov', index)?.name).toBe('Vejvanov, Rokycany')
    expect(resolvePlaceCoords('Wien', index)?.name).toBe('Vídeň')
  })

  it('keeps ambiguous places without coords unresolved', () => {
    const file = parsePlacesFile(parseYaml(placesYaml))
    const index = buildPlaceIndex(file.places)
    expect(resolvePlaceCoords('Jesenice', index)).toBeNull()
    expect(resolvePlaceCoords('Nemělkov u Sušic', index)).toBeNull()

    const unresolved = listUnresolvedPlaces(file.places)
    expect(unresolved.map((p) => p.name)).toEqual(
      expect.arrayContaining([
        'Jesenice',
        'Polepšovice u Uherského Hradiště',
        'Nemělkov u Sušic',
      ]),
    )
  })

  it('resolves Prague districts and falls back to the city', () => {
    const file = parsePlacesFile(parseYaml(placesYaml))
    const index = buildPlaceIndex(file.places)

    expect(resolvePlaceCoords('Praha - Podolí', index)).toMatchObject({
      name: 'Praha - Podolí',
      lat: 50.0515,
      lon: 14.4208,
    })
    expect(resolvePlaceCoords('Praha - Dejvice', index)).toMatchObject({
      name: 'Praha - Dejvice',
      lat: 50.0755,
      lon: 14.4378,
    })
  })
})
