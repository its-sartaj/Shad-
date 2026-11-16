import React, { useEffect, useRef, useState } from 'react';
import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { MapPin, Navigation } from 'lucide-react';
import { useApp } from '../context/AppContext';

// Initial viewport centered on Phenhara, East Champaran, Bihar while Places API resolves
const PHENHARA_INITIAL_VIEW = { lat: 26.4718, lng: 85.1582 };

interface ResolvedPlaceInfo {
  location: { lat: number; lng: number };
  name: string;
  formattedAddress: string;
}

interface GooglePolylineLike {
  setMap: (map: unknown) => void;
  setOptions: (opts: { strokeColor?: string; strokeWeight?: number }) => void;
}

const CampusMapInner: React.FC<{
  originQuery: string;
  triggerRouteCount: number;
  onRouteSummary: (
    summary: { distanceKm: string; durationMins: number } | null,
    errorMsg: string | null
  ) => void;
}> = ({ originQuery, triggerRouteCount, onRouteSummary }) => {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [infoOpen, setInfoOpen] = useState(true);
  const [campusPlace, setCampusPlace] = useState<ResolvedPlaceInfo | null>(null);
  const polylinesRef = useRef<GooglePolylineLike[]>([]);

  // Resolve real place metadata from Google Maps Platform Places API (New)
  useEffect(() => {
    if (!placesLib) return;
    let active = true;
    (async () => {
      try {
        const { places } = await placesLib.Place.searchByText({
          textQuery: 'H.F.H.S School Phenhara, East Champaran, Bihar',
          fields: ['location', 'displayName', 'formattedAddress'],
          maxResultCount: 1,
        });
        if (active && places && places.length > 0 && places[0].location) {
          const loc = places[0].location;
          const resolved: ResolvedPlaceInfo = {
            location: { lat: loc.lat(), lng: loc.lng() },
            name: places[0].displayName || 'Shad Concept Classes (Near H.F.H.S School)',
            formattedAddress:
              places[0].formattedAddress || 'Near H.F.H.S School Phenhara, East Champaran, Bihar',
          };
          setCampusPlace(resolved);
          map?.panTo(resolved.location);
        }
      } catch (err) {
        console.warn('Places lookup fallback to viewport center:', err);
      }
    })();
    return () => {
      active = false;
    };
  }, [placesLib, map]);

  // Compute live driving route via modern Route.computeRoutes()
  useEffect(() => {
    if (triggerRouteCount === 0 || !routesLib || !map || !originQuery.trim()) return;

    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    onRouteSummary(null, null);

    const destination = campusPlace?.location || 'Phenhara, East Champaran, Bihar, India';

    (routesLib.Route as unknown as {
      computeRoutes: (req: Record<string, unknown>) => Promise<{ routes: unknown[] }>;
    })
      .computeRoutes({
        origin: originQuery.trim(),
        destination,
        travelMode: 'DRIVING',
        fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
      })
      .then(({ routes }) => {
        if (!routes || routes.length === 0) {
          onRouteSummary(null, 'No route found from that starting point.');
          return;
        }
        const primaryRoute = routes[0] as {
          createPolylines: () => GooglePolylineLike[];
          viewport?: Parameters<typeof map.fitBounds>[0];
          distanceMeters?: number;
          durationMillis?: number;
        };
        const newPolylines = primaryRoute.createPolylines();
        newPolylines.forEach((poly) => {
          poly.setOptions({ strokeColor: '#0F2942', strokeWeight: 5 });
          poly.setMap(map);
        });
        polylinesRef.current = newPolylines;
        if (primaryRoute.viewport) {
          map.fitBounds(primaryRoute.viewport);
        }
        const distanceKm = ((primaryRoute.distanceMeters || 0) / 1000).toFixed(1);
        const durationMins = Math.max(1, Math.round((primaryRoute.durationMillis || 0) / 60000));
        onRouteSummary({ distanceKm, durationMins }, null);
      })
      .catch((err) => {
        console.error('Route computation error:', err);
        onRouteSummary(null, 'Unable to calculate route. Please try another nearby town name.');
      });

    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [triggerRouteCount, routesLib, map]);

  const pinPos = campusPlace?.location || PHENHARA_INITIAL_VIEW;

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={pinPos}
        onClick={() => setInfoOpen((o) => !o)}
        title="Shad Concept Classes — Phenhara"
      >
        <Pin background="#0F2942" borderColor="#F59E0B" glyphColor="#FFFFFF" scale={1.25} />
      </AdvancedMarker>
      {infoOpen && (
        <InfoWindow anchor={marker} onCloseClick={() => setInfoOpen(false)} maxWidth={260}>
          <div className="p-1 text-slate-900 space-y-1">
            <p className="text-xs font-bold">Shad Concept Classes</p>
            <p className="text-xs text-slate-600">
              {campusPlace?.formattedAddress ||
                'Near H.F.H.S School Phenhara, East Champaran, Bihar'}
            </p>
            <p className="text-[11px] font-mono text-amber-700">
              Er. M.N. Alam: 9525206317
            </p>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

interface CampusLocationMapProps {
  heightClassName?: string;
}

export const CampusLocationMap: React.FC<CampusLocationMapProps> = ({
  heightClassName = 'h-[420px]',
}) => {
  const { showToast } = useApp();
  const [mapsApiKey, setMapsApiKey] = useState<string>(
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  );
  const [originInput, setOriginInput] = useState('Motihari, East Champaran, Bihar');
  const [routeTrigger, setRouteTrigger] = useState(0);
  const [routeSummary, setRouteSummary] = useState<{
    distanceKm: string;
    durationMins: number;
  } | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapsApiKey) {
      fetch('/api/maps-config')
        .then((r) => r.json())
        .then((d: { apiKey?: string }) => {
          if (d.apiKey) setMapsApiKey(d.apiKey);
        })
        .catch(() => {});
    }
  }, [mapsApiKey]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOriginInput(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
        setRouteTrigger((c) => c + 1);
      },
      () => {
        showToast('Location permission denied. Enter your town/village name instead.', 'info');
      }
    );
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={originInput}
          onChange={(e) => setOriginInput(e.target.value)}
          placeholder="Enter your village or town (e.g., Motihari, Madhuban)..."
          className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (mapsApiKey) {
                setRouteTrigger((c) => c + 1);
              } else {
                window.open(
                  `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
                    originInput
                  )}&destination=H.F.H.S+School+Phenhara,+East+Champaran,+Bihar`,
                  '_blank',
                  'noopener,noreferrer'
                );
              }
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0F2942] dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-bold whitespace-nowrap cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Get Route</span>
          </button>
          <button
            type="button"
            onClick={handleUseMyLocation}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
          >
            Use GPS
          </button>
        </div>
      </div>

      {routeSummary && (
        <div className="text-xs font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 px-3 py-2 rounded-lg tabular-nums">
          Estimated Route to Campus: {routeSummary.distanceKm} km · ~{routeSummary.durationMins} mins drive
        </div>
      )}
      {routeError && (
        <div className="text-xs text-amber-700 dark:text-amber-300">{routeError}</div>
      )}

      <div
        className={`w-full ${heightClassName} rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950`}
      >
        {mapsApiKey ? (
          <APIProvider apiKey={mapsApiKey} language="en" region="IN">
            <GoogleMap
              defaultCenter={PHENHARA_INITIAL_VIEW}
              defaultZoom={14}
              mapId="DEMO_MAP_ID"
              gestureHandling="greedy"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%' }}
            >
              <CampusMapInner
                originQuery={originInput}
                triggerRouteCount={routeTrigger}
                onRouteSummary={(summary, err) => {
                  setRouteSummary(summary);
                  setRouteError(err);
                }}
              />
            </GoogleMap>
          </APIProvider>
        ) : (
          <div className="w-full h-full relative min-h-[300px]">
            <iframe
              title="Shad Concept Classes Campus Location"
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: '300px' }}
              loading="lazy"
              allowFullScreen
              src="https://maps.google.com/maps?q=H.F.H.S+School+Phenhara,+East+Champaran,+Bihar&t=&z=15&ie=UTF8&iwloc=&output=embed"
            />
            <div className="absolute bottom-3 right-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 shadow-md">
              <a
                href="https://www.google.com/maps/search/?api=1&query=H.F.H.S+School+Phenhara+East+Champaran+Bihar"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-[#0F2942] dark:text-amber-400 hover:underline flex items-center gap-1.5"
              >
                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                <span>Open in Google Maps</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
