import { MAPBOX_ACCESS_TOKEN } from '../config/mapbox-config';

export const PREVIEW_PICKUP = {
  latitude: 12.8220309,
  longitude: 77.6780941,
  address: 'Customer pickup point',
};

export const PREVIEW_DROPOFF = {
  latitude: 12.8288812,
  longitude: 77.6814131,
  address: 'Customer drop location',
};

export const DRIVER_START = {
  latitude: PREVIEW_PICKUP.latitude - 0.008,
  longitude: PREVIEW_PICKUP.longitude - 0.006,
};

export type PreviewPhase = 'offer' | 'accepted' | 'otp' | 'started' | 'completed';

export const PREVIEW_PHASES: Array<{ id: PreviewPhase; label: string }> = [
  { id: 'offer', label: 'Offer' },
  { id: 'accepted', label: 'To pickup' },
  { id: 'otp', label: 'OTP' },
  { id: 'started', label: 'On trip' },
  { id: 'completed', label: 'Complete' },
];

export type LngLat = [number, number];

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function haversineMeters(a: LngLat, b: LngLat) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function pointAlongRoute(route: LngLat[] | null, t: number) {
  const clamped = Math.max(0, Math.min(1, t));
  if (!route || route.length < 2) {
    return {
      latitude: DRIVER_START.latitude,
      longitude: DRIVER_START.longitude,
      heading: 0,
    };
  }
  const segs: number[] = [];
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    const d = haversineMeters(route[i - 1], route[i]);
    segs.push(d);
    total += d;
  }
  let target = total * clamped;
  for (let i = 0; i < segs.length; i++) {
    if (target <= segs[i] || i === segs.length - 1) {
      const localT = segs[i] > 0 ? target / segs[i] : 0;
      const a = route[i];
      const b = route[i + 1];
      const lng = lerp(a[0], b[0], localT);
      const lat = lerp(a[1], b[1], localT);
      const heading = (Math.atan2(b[0] - a[0], b[1] - a[1]) * 180) / Math.PI;
      return { latitude: lat, longitude: lng, heading };
    }
    target -= segs[i];
  }
  const last = route[route.length - 1];
  return { latitude: last[1], longitude: last[0], heading: 0 };
}

export async function fetchDrivingRoute(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }): Promise<LngLat[] | null> {
  if (!MAPBOX_ACCESS_TOKEN) {
    return [
      [from.longitude, from.latitude],
      [to.longitude, to.latitude],
    ];
  }
  try {
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/driving/` +
      `${from.longitude},${from.latitude};${to.longitude},${to.latitude}` +
      `?geometries=geojson&overview=full&access_token=${MAPBOX_ACCESS_TOKEN}`;
    const res = await fetch(url);
    const json = await res.json();
    const coords = json?.routes?.[0]?.geometry?.coordinates;
    if (Array.isArray(coords) && coords.length >= 2) return coords as LngLat[];
  } catch {
    /* fall through */
  }
  return [
    [from.longitude, from.latitude],
    [to.longitude, to.latitude],
  ];
}

export function phaseCopy(phase: PreviewPhase) {
  switch (phase) {
    case 'offer':
      return {
        title: 'New ride offer',
        subtitle: 'Accept to head to the customer',
        fare: '₹148',
        cta: 'Accept',
      };
    case 'accepted':
      return {
        title: 'Heading to pickup',
        subtitle: PREVIEW_PICKUP.address,
        fare: '₹148',
        cta: 'Navigate',
      };
    case 'otp':
      return {
        title: 'Arrived — verify OTP',
        subtitle: 'Ask customer for their 4-digit OTP',
        fare: '₹148',
        cta: 'Verify OTP',
      };
    case 'started':
      return {
        title: 'Trip in progress',
        subtitle: PREVIEW_DROPOFF.address,
        fare: '₹148',
        cta: 'End ride',
      };
    case 'completed':
      return {
        title: 'Collect payment',
        subtitle: 'Trip complete — confirm cash / UPI',
        fare: '₹148',
        cta: 'Done',
      };
  }
}
