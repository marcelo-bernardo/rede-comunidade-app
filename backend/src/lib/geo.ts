import type { LatLng } from '../db/schema.js'

/** Distância aproximada em metros entre dois pontos (Haversine). */
export function distanciaMetros(a: LatLng, b: LatLng): number {
  const R = 6371000
  const rad = (g: number) => (g * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

export function comprimentoMetros(pontos: LatLng[]): number {
  let total = 0
  for (let i = 1; i < pontos.length; i++) total += distanciaMetros(pontos[i - 1], pontos[i])
  return total
}
