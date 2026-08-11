/** Keep list/detail screens stable during background polls. */

export function sameIdOrder(
  a: Array<{ id?: string | number } | null | undefined>,
  b: Array<{ id?: string | number } | null | undefined>
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (String(a[i]?.id ?? '') !== String(b[i]?.id ?? '')) return false;
  }
  return true;
}

/** Snapshot of fields that affect ride list / active-ride UI. */
export function rideUiKey(ride: any): string {
  if (!ride) return '';
  return [
    ride.id,
    ride.status,
    ride.otp_verified ? 1 : 0,
    Math.round(Number(ride.fare) || 0),
    Number(ride.distance_km)?.toFixed?.(1) ?? ride.distance_km,
    Math.round(Number(ride.eta_minutes) || 0),
    // Round offer TTL to minutes so 10s polls don't thrash the list
    Math.ceil((Number(ride.offer_remaining_seconds) || 0) / 60),
    ride.pickup_location,
    ride.dropoff_location,
    ride.driver_name,
    ride.customer_name,
    ride.passenger_name,
    ride.driver_total_rides,
    ride.driver_average_rating,
    ride.updated_at,
  ].join('|');
}

export function sameRideUi(a: any, b: any): boolean {
  return rideUiKey(a) === rideUiKey(b);
}

export function sameRideListUi(a: any[] = [], b: any[] = []): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!sameRideUi(a[i], b[i])) return false;
  }
  return true;
}
