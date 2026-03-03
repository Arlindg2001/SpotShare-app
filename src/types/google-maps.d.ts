// Google Maps type declarations
declare namespace google.maps {
  class Map {
    constructor(element: HTMLElement, options: MapOptions);
    setCenter(center: LatLngLiteral): void;
    fitBounds(bounds: LatLngBounds, padding?: number): void;
  }

  class LatLngBounds {
    constructor();
    extend(point: LatLngLiteral): LatLngBounds;
  }

  interface MapOptions {
    center?: LatLngLiteral;
    zoom?: number;
    mapId?: string;
    disableDefaultUI?: boolean;
    zoomControl?: boolean;
    gestureHandling?: string;
    styles?: any[];
  }

  interface LatLngLiteral {
    lat: number;
    lng: number;
  }

  namespace marker {
    class AdvancedMarkerElement {
      constructor(options: AdvancedMarkerElementOptions);
      map: Map | null;
      addListener(event: string, handler: () => void): void;
    }

    interface AdvancedMarkerElementOptions {
      map: Map;
      position: LatLngLiteral;
      content?: HTMLElement;
      title?: string;
    }
  }
}

interface Window {
  google: {
    maps: typeof google.maps;
  };
}
