import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { useMemo } from 'react'
import { useGraphStore } from '@/stores/graph-store'
import { useTimeStore } from '@/stores/time-store'
import type { ViewProps } from '../types'

// Fix default marker icons in bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// @ts-expect-error leaflet types
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

export function MapView({ className }: ViewProps) {
  const persons = useGraphStore((s) => s.persons)
  const setSelectedId = useGraphStore((s) => s.setSelectedId)
  const isPersonVisible = useTimeStore((s) => s.isPersonVisible)

  const markers = useMemo(
    () =>
      [...persons.values()].filter(
        (p) =>
          p.birth?.lat != null &&
          p.birth?.lon != null &&
          isPersonVisible(p.birthYear, p.deathYear),
      ),
    [persons, isPersonVisible],
  )

  const center: [number, number] =
    markers.length > 0
      ? [markers[0].birth!.lat!, markers[0].birth!.lon!]
      : [50.0755, 14.4378]

  return (
    <div className={`h-full w-full ${className ?? ''}`}>
      <MapContainer center={center} zoom={6} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((p) => (
          <Marker
            key={p.id}
            position={[p.birth!.lat!, p.birth!.lon!]}
            eventHandlers={{ click: () => setSelectedId(p.id) }}
          >
            <Popup>
              <strong>{p.fullName}</strong>
              <br />
              {p.birth?.place}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
