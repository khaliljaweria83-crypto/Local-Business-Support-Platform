import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { useEffect } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Leaflet's default marker icons reference image files that don't resolve
// correctly under Vite's bundler — rebuild them from the installed package
// so pins actually render instead of showing broken image icons.
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const GUJRANWALA_CENTER = [32.1877, 74.1945]

// Recenters the map whenever the marker set changes (e.g. new search results).
function FitBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15)
    } else {
      map.fitBounds(points.map(p => [p.lat, p.lng]), { padding: [30, 30] })
    }
  }, [points, map])
  return null
}

/**
 * businesses: [{ id, name, category, latitude, longitude }]
 * onSelect: optional callback(business) when a marker popup's "View" is clicked
 * height: CSS height of the map box
 */
export default function BusinessMap({ businesses = [], onSelect, height = 320 }) {
  // OpenStreetMap + Leaflet is used instead of the Google Maps JavaScript API
  // because it's free and needs no API key or billing account — Google's Maps
  // JS/Geocoding APIs require a billing-enabled key which isn't available for
  // this student project. Functionally it provides the same pin-on-map
  // experience the requirements ask for.
  const points = businesses
    .filter(b => b.latitude && b.longitude)
    .map(b => ({ ...b, lat: Number(b.latitude), lng: Number(b.longitude) }))

  if (points.length === 0) {
    return (
      <div style={{
        height, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', background: 'var(--gray-100, #f3f3f0)', borderRadius: 'var(--radius-md, 12px)',
        color: 'var(--gray-400, #999)', fontSize: '0.85rem', gap: 6,
      }}>
        <span>No map location available yet for these results.</span>
      </div>
    )
  }

  return (
    <div style={{ height, borderRadius: 'var(--radius-md, 12px)', overflow: 'hidden' }}>
      <MapContainer center={GUJRANWALA_CENTER} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        {points.map(p => (
          <Marker key={p.id} position={[p.lat, p.lng]}>
            <Popup>
              <strong>{p.name}</strong><br />
              <span style={{ fontSize: '0.8em', color: '#666' }}>{p.category}</span>
              {onSelect && (
                <div style={{ marginTop: 6 }}>
                  <button
                    onClick={() => onSelect(p)}
                    style={{ background: '#1e5c3a', color: 'white', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: '0.78em', cursor: 'pointer' }}
                  >
                    View Details
                  </button>
                </div>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
