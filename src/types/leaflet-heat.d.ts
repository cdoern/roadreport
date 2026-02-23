/**
 * Minimal type augmentation for leaflet.heat.
 * The package is a Leaflet plugin (no ES module exports).  Importing it
 * as a side-effect (`import 'leaflet.heat'`) adds `L.heatLayer` to the
 * global Leaflet namespace.  The augmented types below extend `@types/leaflet`
 * with the additional heatLayer API.
 *
 * IMPORTANT: The top-level `export {}` makes this a MODULE file so that
 * `declare module 'leaflet' { ... }` is treated as an augmentation of the
 * existing `@types/leaflet` types rather than replacing them entirely.
 */

// This export makes the file a module, enabling proper module augmentation.
export {};

declare module 'leaflet.heat' {
  // Side-effect-only module.
}

declare module 'leaflet' {
  type HeatLatLngTuple = [lat: number, lng: number, intensity?: number];

  interface HeatLayerOptions {
    minOpacity?: number;
    maxZoom?: number;
    max?: number;
    radius?: number;
    blur?: number;
    gradient?: Record<number, string>;
  }

  interface HeatLayer extends Layer {
    addTo(map: Map | LayerGroup): this;
    setLatLngs(latlngs: HeatLatLngTuple[]): this;
    addLatLng(latlng: HeatLatLngTuple): this;
    setOptions(options: HeatLayerOptions): this;
    redraw(): this;
    remove(): this;
  }

  function heatLayer(latlngs: HeatLatLngTuple[], options?: HeatLayerOptions): HeatLayer;
}
