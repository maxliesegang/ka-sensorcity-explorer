// The minimum a map field needs from a point: where it is.
//
// The field machinery — Voronoi cells, markers, value labels, bounds — is purely
// geometric: it places and colours whatever it is handed. Which quantity a point
// carries is the view's business (`temperature` for the temperature fields, see
// temperatureScale.ts; `value` for the soil field's selected depth band). Keeping
// the shared constraint down to lat/lon is what lets those views share one
// controller without a soil moisture cell having to pose as a temperature.

export interface FieldPoint {
  lat: number;
  lon: number;
}
