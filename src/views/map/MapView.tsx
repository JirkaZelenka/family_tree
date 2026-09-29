import { useEffect, useMemo, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import { useTranslation } from 'react-i18next'
import { useGraphStore } from '@/stores/graph-store'
import { useTimeStore } from '@/stores/time-store'
import { useVaultStore } from '@/stores/vault-store'
import { lineageColor } from '@/lib/vault/lineage-colors'
import {
  buildPlaceIndex,
  listUnresolvedPlaces,
  normalizePlaceKey,
  resolvePlaceCoords,
} from '@/lib/map/places'
import {
  buildResidenceSegments,
  jitterOffset,
  residencePlaceAtYear,
} from '@/lib/map/residence'
import { PersonMedallion } from '@/components/person/PersonMedallion'
import type { ViewProps } from '../types'

const CZ_CENTER: [number, number] = [49.75, 15.5]
const CZ_BOUNDS = L.latLngBounds(
  L.latLng(46.2, 9.5),
  L.latLng(52.2, 22.8),
)

const iconCache = new Map<string, L.DivIcon>()

function personDotIcon(color: string, selected: boolean): L.DivIcon {
  const key = `${color}|${selected ? 1 : 0}`
  const cached = iconCache.get(key)
  if (cached) return cached

  const size = selected ? 16 : 12
  const border = selected ? 3 : 2
  const icon = L.divIcon({
    className: 'family-map-dot',
    html: `<span style="
      display:block;
      width:${size}px;
      height:${size}px;
      border-radius:50%;
      background:${color};
      border:${border}px solid #fff;
      box-shadow:0 1px 4px rgba(15,23,42,.45);
    "></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
  iconCache.set(key, icon)
  return icon
}

function MapResizeFix() {
  const map = useMap()
  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 50)
    return () => window.clearTimeout(timer)
  }, [map])
  return null
}

function MapDeselect({ onDeselect }: { onDeselect: () => void }) {
  useMapEvents({
    click: (e) => {
      // klik na podklad (ne na marker) — marker stopPropagation
      if ((e.originalEvent.target as HTMLElement | null)?.closest?.('.leaflet-marker-icon')) {
        return
      }
      onDeselect()
    },
  })
  return null
}

interface MapMarker {
  id: string
  fullName: string
  birthYear: number | null
  placeLabel: string
  color: string
  lat: number
  lon: number
}

export function MapView({ className }: ViewProps) {
  const { t } = useTranslation()
  const persons = useGraphStore((s) => s.persons)
  const setSelectedId = useGraphStore((s) => s.setSelectedId)
  const selectedPersonId = useGraphStore((s) => s.selectedId)
  const setHoveredId = useGraphStore((s) => s.setHoveredId)
  const getPerson = useGraphStore((s) => s.getPerson)
  const isPersonVisible = useTimeStore((s) => s.isPersonVisible)
  const currentYear = useTimeStore((s) => s.currentYear)
  const showAllPeople = useTimeStore((s) => s.showAllPeople)
  const colors = useVaultStore((s) => s.vault?.config.lineageColors ?? {})
  const places = useVaultStore((s) => s.vault?.places ?? [])

  const [cardPersonId, setCardPersonId] = useState<string | null>(null)

  const placeIndex = useMemo(() => buildPlaceIndex(places), [places])
  const unresolved = useMemo(() => listUnresolvedPlaces(places), [places])

  const { markers, withoutMapCount, unresolvedPeopleByPlace } = useMemo(() => {
    void showAllPeople
    const byPlace = new Map<string, MapMarker[]>()
    let withoutMap = 0
    const byUnresolved = new Map<string, number>()

    const bumpUnresolved = (placeName: string) => {
      const key = normalizePlaceKey(placeName)
      const entry = unresolved.find((p) => normalizePlaceKey(p.name) === key)
      const label = entry?.name ?? placeName
      byUnresolved.set(label, (byUnresolved.get(label) ?? 0) + 1)
    }

    for (const person of persons.values()) {
      if (person.redacted) continue
      if (!isPersonVisible(person.birthYear, person.deathYear, person.death?.date)) {
        continue
      }

      const segments = buildResidenceSegments(person, persons)
      const placeName = residencePlaceAtYear(segments, currentYear)
      if (!placeName) {
        withoutMap++
        continue
      }

      const coords = resolvePlaceCoords(placeName, placeIndex)
      if (!coords) {
        withoutMap++
        bumpUnresolved(placeName)
        continue
      }

      const list = byPlace.get(coords.name) ?? []
      list.push({
        id: person.id,
        fullName: person.fullName,
        birthYear: person.birthYear,
        placeLabel: placeName,
        color: lineageColor(person.lineage, colors),
        lat: coords.lat,
        lon: coords.lon,
      })
      byPlace.set(coords.name, list)
    }

    const result: MapMarker[] = []
    for (const group of byPlace.values()) {
      group.forEach((marker, index) => {
        const { dLat, dLon } = jitterOffset(marker.id, index, group.length)
        result.push({
          ...marker,
          lat: marker.lat + dLat,
          lon: marker.lon + dLon,
        })
      })
    }
    return {
      markers: result,
      withoutMapCount: withoutMap,
      unresolvedPeopleByPlace: byUnresolved,
    }
  }, [
    persons,
    isPersonVisible,
    currentYear,
    showAllPeople,
    placeIndex,
    colors,
    unresolved,
  ])

  const cardPerson = cardPersonId ? getPerson(cardPersonId) : null
  const cardColor = cardPerson
    ? lineageColor(cardPerson.lineage, colors)
    : '#94a3b8'

  const clearCard = () => {
    setCardPersonId(null)
    setSelectedId(null)
  }

  return (
    <div className={`relative h-full w-full ${className ?? ''}`}>
      <MapContainer
        center={CZ_CENTER}
        zoom={7}
        minZoom={5}
        maxZoom={14}
        maxBounds={CZ_BOUNDS}
        maxBoundsViscosity={0.75}
        className="h-full w-full [&_.leaflet-container]:bg-[#dce8d4]"
        scrollWheelZoom
      >
        <MapResizeFix />
        <MapDeselect onDeselect={clearCard} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
        />
        {markers.map((m) => (
          <Marker
            key={m.id}
            position={[m.lat, m.lon]}
            icon={personDotIcon(
              m.color,
              m.id === selectedPersonId || m.id === cardPersonId,
            )}
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e.originalEvent)
                setSelectedId(m.id)
              },
              dblclick: (e) => {
                L.DomEvent.stopPropagation(e.originalEvent)
                setSelectedId(m.id)
                setCardPersonId(m.id)
              },
              mouseover: () => setHoveredId(m.id),
              mouseout: () => setHoveredId(null),
            }}
          >
            <Popup>
              <strong>
                {m.fullName}
                {m.birthYear != null ? ` (${m.birthYear})` : ''}
              </strong>
              <br />
              {m.placeLabel}
              <br />
              <span className="text-muted-foreground">{currentYear}</span>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="pointer-events-none absolute left-3 top-3 z-[1000] flex max-w-xs flex-col gap-2">
        <div className="rounded-md border border-border/70 bg-background/90 px-3 py-2 text-xs shadow-sm backdrop-blur-sm">
          <p className="font-medium text-foreground">{t('map.title')}</p>
          <p className="mt-0.5 text-muted-foreground">
            {t('map.subtitle', { year: currentYear, count: markers.length })}
          </p>
          {(unresolved.length > 0 || withoutMapCount > 0) && (
            <div className="pointer-events-auto mt-2 border-t border-border/60 pt-2 text-amber-800 dark:text-amber-200">
              <p className="font-medium">
                {t('map.unresolvedTitle')}
                {withoutMapCount > 0 && (
                  <span className="font-normal text-muted-foreground">
                    {' '}
                    · {t('map.withoutPlaceCount', { count: withoutMapCount })}
                  </span>
                )}
              </p>
              {unresolved.length > 0 && (
                <ul className="mt-1 list-inside list-disc space-y-0.5">
                  {unresolved.map((p) => {
                    const n = unresolvedPeopleByPlace.get(p.name) ?? 0
                    return (
                      <li key={p.name}>
                        {p.name}
                        {n > 0 ? ` (${n})` : ''}
                      </li>
                    )
                  })}
                </ul>
              )}
              <p className="mt-1 text-muted-foreground">{t('map.unresolvedHint')}</p>
            </div>
          )}
        </div>

        {cardPerson && (
          <div className="pointer-events-auto w-full overflow-hidden rounded-xl shadow-md">
            <PersonMedallion
              person={cardPerson}
              color={cardColor}
              variant="card"
            />
          </div>
        )}
      </div>
    </div>
  )
}
