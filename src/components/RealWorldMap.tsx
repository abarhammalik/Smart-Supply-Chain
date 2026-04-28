'use client';

import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { RouteResponse } from './RouteSearchPanel';
import { AlertTriangle, Construction, ArrowUp, Car, Bike, Train, Footprints, Plane, Ship, Navigation, MapPin, LocateFixed, Plus, Minus } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

interface RealWorldMapProps {
  routeData: RouteResponse | null;
}

// Component to handle auto-zooming and bounds calculation
function RouteFitter({ routeData }: { routeData: RouteResponse | null }) {
  const map = useMap();

  useEffect(() => {
    if (!routeData || routeData.recommended_route.segments.length === 0) return;
    
    const allPositions: [number, number][] = [];
    routeData.recommended_route.segments.forEach(seg => {
      allPositions.push(...seg.positions);
    });

    if (allPositions.length > 0) {
      const bounds = L.latLngBounds(allPositions);
      map.flyToBounds(bounds, { padding: [50, 50], duration: 2 });
    }
  }, [routeData, map]);

  return null;
}

function ZoomListener({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMap();
  useEffect(() => {
    const handleZoom = () => onZoom(map.getZoom());
    map.on('zoomend', handleZoom);
    handleZoom();
    return () => { map.off('zoomend', handleZoom); };
  }, [map, onZoom]);
  return null;
}

function MapControls() {
  const map = useMap();

  const handleZoomIn = () => map.zoomIn();
  const handleZoomOut = () => map.zoomOut();
  
  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          map.flyTo([lat, lng], 14, { duration: 1.5 });
        },
        (error) => console.error("Geolocation error:", error)
      );
    }
  };

  return (
    <div className="absolute right-6 bottom-8 z-[1000] flex flex-col gap-2">
      <button 
        onClick={handleCurrentLocation}
        className="w-10 h-10 bg-[#1a1a1a] border border-white/10 rounded-full flex items-center justify-center text-white/70 hover:text-cyan-400 hover:border-cyan-500/50 shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-colors group mb-2"
        title="Current Location"
      >
        <LocateFixed className="w-5 h-5 group-hover:scale-110 transition-transform" />
      </button>
      
      <div className="flex flex-col bg-[#1a1a1a] border border-white/10 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] overflow-hidden">
        <button 
          onClick={handleZoomIn}
          className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-cyan-400 hover:bg-white/5 transition-colors border-b border-white/5"
          title="Zoom In"
        >
          <Plus className="w-5 h-5" />
        </button>
        <button 
          onClick={handleZoomOut}
          className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-cyan-400 hover:bg-white/5 transition-colors"
          title="Zoom Out"
        >
          <Minus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// Custom DivIcons for Traffic Signs
const createTrafficIcon = (isHeavy: boolean) => {
  const iconMarkup = renderToStaticMarkup(
    <div className="flex items-center justify-center w-6 h-6 drop-shadow-xl bg-black/80 rounded-full border border-white/20 p-1">
      {isHeavy ? (
        <Construction className="w-full h-full text-red-500" />
      ) : (
        <AlertTriangle className="w-full h-full text-yellow-500" />
      )}
    </div>
  );
  
  return L.divIcon({
    html: iconMarkup,
    className: 'custom-traffic-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

const createTransportIcon = (mode: string) => {
  let IconComponent = Navigation;
  if (mode === 'car') IconComponent = Car;
  else if (mode === 'bike') IconComponent = Bike;
  else if (mode === 'train') IconComponent = Train;
  else if (mode === 'walk') IconComponent = Footprints;
  else if (mode === 'plane') IconComponent = Plane;
  else if (mode === 'ship') IconComponent = Ship;

  const iconMarkup = renderToStaticMarkup(
    <div className="flex items-center justify-center w-8 h-8 drop-shadow-[0_0_15px_rgba(6,182,212,1)] bg-black/80 rounded-full p-1.5 border border-cyan-500/50">
      <IconComponent className="w-full h-full text-cyan-400" />
    </div>
  );
  
  return L.divIcon({
    html: iconMarkup,
    className: 'custom-arrow-icon transition-all duration-75',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const createCurrentLocationIcon = () => {
  const iconMarkup = renderToStaticMarkup(
    <div className="flex items-center justify-center w-8 h-8 drop-shadow-[0_0_15px_rgba(6,182,212,1)] bg-cyan-500/20 rounded-full border-2 border-cyan-400 p-1 animate-pulse">
      <MapPin className="w-full h-full text-cyan-400" />
    </div>
  );
  return L.divIcon({ html: iconMarkup, className: 'current-location-icon', iconSize: [32, 32], iconAnchor: [16, 16] });
};

const createTrafficLightIcon = (id: string) => {
  const iconMarkup = renderToStaticMarkup(
    <div className="flex flex-col items-center justify-center bg-black/90 p-1.5 rounded-xl border border-white/20 shadow-2xl gap-1">
      <div id={`light-red-${id}`} className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)] transition-colors"></div>
      <div id={`light-green-${id}`} className="w-3 h-3 rounded-full bg-green-500/20 transition-colors"></div>
      <div id={`timer-${id}`} className="text-[10px] font-mono text-white mt-0.5">45s</div>
    </div>
  );
  return L.divIcon({ html: iconMarkup, className: 'traffic-light-icon', iconSize: [24, 48], iconAnchor: [12, 24] });
};

const createStartIcon = () => {
  const iconMarkup = renderToStaticMarkup(
    <div className="relative flex items-center justify-center w-6 h-6">
      <div className="absolute w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-[0_0_10px_rgba(34,197,94,0.8)] z-10" />
      <div className="absolute w-6 h-6 bg-green-500/30 rounded-full animate-ping" />
    </div>
  );
  return L.divIcon({ html: iconMarkup, className: 'custom-start-marker', iconSize: [24, 24], iconAnchor: [12, 12] });
};

const createEndIcon = () => {
  const iconMarkup = renderToStaticMarkup(
    <div className="relative flex flex-col items-center drop-shadow-2xl">
      <div className="w-8 h-8 bg-red-500 rounded-[50%_50%_50%_0] rotate-[-45deg] flex items-center justify-center shadow-inner border-2 border-white/90 z-10">
        <div className="w-3 h-3 bg-white rounded-full rotate-[45deg]" />
      </div>
    </div>
  );
  return L.divIcon({ html: iconMarkup, className: 'custom-end-marker', iconSize: [32, 32], iconAnchor: [16, 32] });
};

// Helper to interpolate between two coordinates
function interpolateCoordinate(p1: [number, number], p2: [number, number], fraction: number): [number, number] {
  return [
    p1[0] + (p2[0] - p1[0]) * fraction,
    p1[1] + (p2[1] - p1[1]) * fraction
  ];
}

export default function RealWorldMap({ routeData }: RealWorldMapProps) {
  const [arrowPosition, setArrowPosition] = useState<[number, number] | null>(null);
  const [currentZoom, setCurrentZoom] = useState(2);

  const transportMode = routeData?.recommended_route.transportMode || 'best';
  const transportIcon = useMemo(() => createTransportIcon(transportMode), [transportMode]);

  const getTrafficColor = (state: string) => {
    if (state === 'heavy') return '#ef4444'; // Red
    if (state === 'moderate') return '#eab308'; // Yellow
    return '#3b82f6'; // Blue
  };

  // Compile full continuous path for animation
  const fullPath = useMemo(() => {
    if (!routeData) return [];
    const path: [number, number][] = [];
    routeData.recommended_route.segments.forEach(seg => {
      seg.positions.forEach(p => path.push(p));
    });
    return path;
  }, [routeData]);

  // Generate dense traffic signals via interpolation
  const generatedSignals = useMemo(() => {
    if (!routeData) return [];
    const mode = routeData.recommended_route.transportMode;
    // Ground transport only
    if (mode === 'plane' || mode === 'ship') return [];
    
    const signals: { id: string; position: [number, number]; offset: number }[] = [];
    let signalCount = 0;
    
    routeData.recommended_route.segments.forEach(seg => {
      // Create 3 traffic signals per segment for dense realistic city simulation
      for (let i = 1; i <= 3; i++) {
        signals.push({
          id: `tl-${signalCount++}`,
          position: interpolateCoordinate(seg.positions[0], seg.positions[1], i / 4),
          offset: Math.random() * 60 // staggered asynchronous offsets
        });
      }
    });
    return signals;
  }, [routeData]);

  // Animation Loop for the Arrow & Traffic Lights
  useEffect(() => {
    if (fullPath.length < 2) return;
    
    let animationFrameId: number;
    let startTime: number | null = null;
    const DURATION = 15000; // 15 seconds to complete route

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      
      // Update ALL DOM Traffic Lights independently using their unique staggered offsets
      for (const signal of generatedSignals) {
        const cycleTime = ((elapsed / 1000) + signal.offset) % 60;
        const isRed = cycleTime < 45;
        const timeLeft = isRed ? Math.ceil(45 - cycleTime) : Math.ceil(60 - cycleTime);
        
        const timerEl = document.getElementById(`timer-${signal.id}`);
        const redEl = document.getElementById(`light-red-${signal.id}`);
        const greenEl = document.getElementById(`light-green-${signal.id}`);
        
        if (timerEl) timerEl.innerText = `${timeLeft}s`;
        if (redEl && greenEl) {
          if (isRed) {
            redEl.className = "w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)] transition-colors";
            greenEl.className = "w-3 h-3 rounded-full bg-green-500/20 transition-colors";
          } else {
            redEl.className = "w-3 h-3 rounded-full bg-red-500/20 transition-colors";
            greenEl.className = "w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,1)] transition-colors";
          }
        }
      }

      let progress = (elapsed % DURATION) / DURATION; // loops 0 to 1
      
      // Map progress to segments
      const totalPoints = fullPath.length;
      const exactIndex = progress * (totalPoints - 1);
      const index = Math.floor(exactIndex);
      const fraction = exactIndex - index;

      if (index < totalPoints - 1) {
        const p1 = fullPath[index];
        const p2 = fullPath[index + 1];
        setArrowPosition(interpolateCoordinate(p1, p2, fraction));
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [fullPath]);

  return (
    <MapContainer 
      center={[20, 0]} 
      zoom={2} 
      className="w-full h-full bg-transparent"
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <ZoomListener onZoom={setCurrentZoom} />
      <RouteFitter routeData={routeData} />
      <MapControls />

      {/* Logistics Multiple Route Options */}
      {routeData?.recommended_route.logistics_options && routeData.recommended_route.logistics_options.map((opt, optIdx) => {
         let color = '#555555';
         if (optIdx === 0) color = '#ef4444'; // Red for standard (highway traffic)
         if (optIdx === 1) color = '#22c55e'; // Green for AI optimized bypass
         if (optIdx === 2) color = '#3b82f6'; // Blue for scenic coastal
         
         return opt.segments.map((seg, idx) => (
           <Polyline 
             key={`log-${optIdx}-${idx}`}
             positions={seg.positions} 
             pathOptions={{ 
               color, 
               weight: optIdx === 1 ? 6 : 4,
               opacity: optIdx === 1 ? 0.9 : 0.6,
               dashArray: optIdx !== 1 ? '5, 10' : undefined,
               lineCap: 'round',
               lineJoin: 'round'
             }} 
           />
         ));
      })}

      {/* Main Segments (Skip if we already drew logistics options) */}
      {!routeData?.recommended_route.logistics_options && routeData?.recommended_route.segments.map((seg, idx) => {
        const isHeavy = seg.traffic === 'heavy';
        const isMod = seg.traffic === 'moderate';
        const midPoint = interpolateCoordinate(seg.positions[0], seg.positions[1], 0.5);
        const strokeColor = getTrafficColor(seg.traffic);

        return (
          <div key={`main-${idx}`}>
            <Polyline 
              positions={seg.positions} 
              pathOptions={{ 
                color: strokeColor, 
                weight: 5,
                opacity: 0.8,
                lineCap: 'round',
                lineJoin: 'round'
              }} 
            />
            
            {(isHeavy || isMod) && (
              <Marker position={midPoint} icon={createTrafficIcon(isHeavy)} />
            )}
          </div>
        );
      })}

      {/* Render High-Density Traffic Signals (Hide if zoomed too far out to prevent clutter) */}
      {currentZoom > 6 && generatedSignals.map(sig => (
        <Marker key={sig.id} position={sig.position} icon={createTrafficLightIcon(sig.id)} />
      ))}

      {routeData?.recommended_route.currentLocation && (
        <Marker position={routeData.recommended_route.currentLocation} icon={createCurrentLocationIcon()} />
      )}

      {fullPath.length > 0 && (
        <>
          <Marker position={fullPath[0]} icon={createStartIcon()} />
          <Marker position={fullPath[fullPath.length - 1]} icon={createEndIcon()} />
        </>
      )}

      {arrowPosition && (
        <Marker position={arrowPosition} icon={transportIcon} />
      )}
    </MapContainer>
  );
}
