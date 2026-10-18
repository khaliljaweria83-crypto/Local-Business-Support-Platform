// ============================================
// Geocoding Service
// Converts a business address into latitude/longitude coordinates so it can
// be shown as a pin on the map.
//
// We use OpenStreetMap's Nominatim service instead of the Google Maps
// Geocoding API because Nominatim is free and does not require an API key
// or billing account — Google's Geocoding/Maps JavaScript APIs need a
// billing-enabled API key, which isn't available for this student project.
// Functionally it does the same job: address text -> {lat, lng}.
//
// Nominatim's usage policy asks for a descriptive User-Agent and a max of
// 1 request/second, which is more than enough for this app (geocoding only
// happens when an owner adds/edits a business, not on every page load).
// ============================================

const geocodeAddress = async (address, city = '') => {
  if (!address) return null

  try {
    const query = encodeURIComponent(`${address}, ${city}, Pakistan`)
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`

    const response = await fetch(url, {
      headers: {
        // Nominatim requires a descriptive User-Agent identifying the app.
        'User-Agent': 'LocalBizDiscoveryPlatform/1.0 (BSIT22-G3 FYP, GIOC Gujranwala)',
      },
    })

    if (!response.ok) return null

    const results = await response.json()
    if (!results || results.length === 0) return null

    return {
      latitude: parseFloat(results[0].lat),
      longitude: parseFloat(results[0].lon),
    }
  } catch (err) {
    console.error('Geocoding error:', err.message)
    return null // Business is still saved even if geocoding fails — it just won't have a map pin yet.
  }
}

module.exports = { geocodeAddress }
