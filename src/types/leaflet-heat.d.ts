/**
 * Minimal type declaration for leaflet.heat.
 * The package is a Leaflet plugin (no ES module exports).  Importing it
 * as a side-effect (`import 'leaflet.heat'`) adds `L.heatLayer` to the
 * global Leaflet namespace.  The augmented types below make it accessible
 * via `import L from 'leaflet'`.
 */
declare module 'leaflet.heat' {
  // Side-effect-only module.
  export {};
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
    setLatLngs(latlngs: HeatLatLngTuple[]): this;
    addLatLng(latlng: HeatLatLngTuple): this;
    setOptions(options: HeatLayerOptions): this;
    redraw(): this;
  }

  function heatLayer(latlngs: HeatLatLngTuple[], options?: HeatLayerOptions): HeatLayer;
}
