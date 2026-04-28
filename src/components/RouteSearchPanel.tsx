'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Navigation, MapPin, Truck, Ship, Plane, X, ArrowRightLeft, Clock, AlertTriangle, Route, Car, Bike, Train, Footprints, LocateFixed, Layers, Bus } from 'lucide-react';
import MagneticButton from './MagneticButton';

export type OSMResult = {
  display_name: string;
  lat: string;
  lon: string;
};

const buildDisplayName = (p: any) => {
  const parts = [p.name, p.street, p.district, p.city, p.state, p.country, p.postcode].filter(Boolean);
  return Array.from(new Set(parts)).join(', ');
};

export type TrafficState = 'clear' | 'moderate' | 'heavy';

export type RouteSegment = {
  from: string;
  to: string;
  traffic: TrafficState;
  positions: [number, number][]; // [lat, lng][]
};

export type LogisticsOption = {
  name: string;
  eta: string;
  base_time: string;
  signal_delay?: string;
  fare?: string;
  segments: RouteSegment[];
  path: string[];
  icon?: 'car' | 'bike' | 'train' | 'plane' | 'bus' | 'walk' | 'ship';
};

export type TransitSchedule = {
  type: 'train' | 'bus' | 'plane' | 'ship';
  vehicleNo: string;
  departureTime: string;
  arrivalTime: string;
  platformOrGate?: string;
  provider: string;
  fare: string;
  status: 'On Time' | 'Delayed' | 'Resuming';
};

export type RouteResponse = {
  recommended_route: {
    path: string[];
    segments: RouteSegment[];
    total_km: number;
    total_days: number | string;
    isRegional: boolean;
    transportMode: string;
    alternate_segments?: RouteSegment[];
    currentLocation?: [number, number];
    logistics_options?: LogisticsOption[];
    transit_schedule?: TransitSchedule[];
    transit_suspended?: boolean;
    suspension_reason?: string;
  };
};

export default function RouteSearchPanel({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [origin, setOrigin] = useState('Shanghai');
  const [destination, setDestination] = useState('Rotterdam');
  const [currentLocation, setCurrentLocation] = useState<[number, number] | undefined>(undefined);
  const [activeTransport, setActiveTransport] = useState<'best'|'car'|'bike'|'train'|'bus'|'walk'|'plane'|'ship'|'logistics'>('best');
  
  const handleInteraction = (e: React.FocusEvent<HTMLInputElement> | React.MouseEvent) => {
    if (!isLoggedIn) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('require_auth'));
    }
  };
  
  const [originSuggestions, setOriginSuggestions] = useState<OSMResult[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<OSMResult[]>([]);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

  const [selectedOriginObj, setSelectedOriginObj] = useState<{name: string, lat: number, lon: number} | null>(null);
  const [selectedDestObj, setSelectedDestObj] = useState<{name: string, lat: number, lon: number} | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [routeData, setRouteData] = useState<RouteResponse | null>(null);

  useEffect(() => {
    if (origin.length < 3 || origin === 'Current Location') {
      setShowOriginDropdown(false);
      return;
    }
    const timeoutId = setTimeout(async () => {
      try {
        let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(origin)}&limit=7`;
        if (currentLocation) {
          url += `&lat=${currentLocation[0]}&lon=${currentLocation[1]}&zoom=14`;
        }
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.features) {
          const transformed = data.features.map((f: any) => ({
             display_name: buildDisplayName(f.properties) || f.properties.name || 'Unknown Location',
             lat: f.geometry.coordinates[1].toString(),
             lon: f.geometry.coordinates[0].toString()
          })).filter((f: any) => f.display_name !== 'Unknown Location');
          
          setOriginSuggestions(transformed);
          setShowOriginDropdown(true);
        }
      } catch (err) {}
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [origin, currentLocation]);

  useEffect(() => {
    if (destination.length < 3) {
      setShowDestDropdown(false);
      return;
    }
    const timeoutId = setTimeout(async () => {
      try {
        let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(destination)}&limit=7`;
        if (currentLocation) {
          url += `&lat=${currentLocation[0]}&lon=${currentLocation[1]}&zoom=14`;
        }
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.features) {
          const transformed = data.features.map((f: any) => ({
             display_name: buildDisplayName(f.properties) || f.properties.name || 'Unknown Location',
             lat: f.geometry.coordinates[1].toString(),
             lon: f.geometry.coordinates[0].toString()
          })).filter((f: any) => f.display_name !== 'Unknown Location');
          
          setDestSuggestions(transformed);
          setShowDestDropdown(true);
        }
      } catch (err) {}
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [destination, currentLocation]);

  const handleSearch = async () => {
    setIsLoading(true);
    setRouteData(null);

    // OSRM Dynamic Routing
    if (selectedOriginObj && selectedDestObj) {
      try {
        if (['best', 'car', 'bike', 'train', 'bus', 'walk', 'logistics'].includes(activeTransport)) {
          const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${selectedOriginObj.lon},${selectedOriginObj.lat};${selectedDestObj.lon},${selectedDestObj.lat}?overview=full&geometries=geojson`;
          const osrmRes = await fetch(osrmUrl);
          const osrmData = await osrmRes.json();
          
          if (osrmData.routes && osrmData.routes.length > 0) {
            const route = osrmData.routes[0];
            const distanceKm = Math.round(route.distance / 1000);
            
            // Format dynamic duration
            let baseDurationSecs = route.duration;
            if (activeTransport === 'bike') baseDurationSecs = (distanceKm / 40) * 3600;
            if (activeTransport === 'train') baseDurationSecs = (distanceKm / 80) * 3600;
            if (activeTransport === 'bus') baseDurationSecs = (distanceKm / 60) * 3600;
            if (activeTransport === 'walk') baseDurationSecs = (distanceKm / 5) * 3600;
            if (activeTransport === 'logistics') baseDurationSecs = (distanceKm / 60) * 3600;
            
            const hours = Math.floor(baseDurationSecs / 3600);
            const minutes = Math.floor((baseDurationSecs % 3600) / 60);
            let eta = hours > 24 ? `${Math.floor(hours / 24)} days ${hours % 24} hr` : `${hours} hr ${minutes} min`;

            // Transform OSRM geojson [lon, lat] to Leaflet [lat, lon]
            const coords = route.geometry.coordinates as [number, number][];
            const leafletPath = coords.map(c => [c[1], c[0]] as [number, number]);
            
            // Break down path into dynamic segments to support traffic simulation
            const chunkSize = Math.max(1, Math.ceil(leafletPath.length / 5));
            const segments: RouteSegment[] = [];
            for (let i = 0; i < leafletPath.length; i += chunkSize) {
              const chunk = leafletPath.slice(i, i + chunkSize + 1); // overlap to connect
              if (chunk.length < 2) continue;
              const traffics: TrafficState[] = ['clear', 'clear', 'moderate', 'heavy'];
              const traffic = traffics[Math.floor(Math.random() * traffics.length)];
              segments.push({
                from: `Segment ${segments.length + 1}`,
                to: "Next",
                traffic,
                positions: chunk
              });
            }

            let logistics_options: LogisticsOption[] | undefined = undefined;
            if (activeTransport === 'logistics') {
              logistics_options = [
                {
                  name: "Standard OSRM Highway",
                  base_time: eta,
                  signal_delay: "+25 min",
                  eta: `${hours} hr ${minutes + 25} min`,
                  path: [selectedOriginObj.name, "Major Highway", selectedDestObj.name],
                  segments: segments.map(s => ({ ...s, traffic: 'heavy' as TrafficState }))
                },
                {
                  name: "AI Real-Time Bypass",
                  base_time: `${hours} hr ${Math.max(0, minutes - 10)} min`,
                  signal_delay: "+5 min",
                  eta: `${hours} hr ${Math.max(0, minutes - 5)} min`,
                  path: [selectedOriginObj.name, "AI Bypass Route", selectedDestObj.name],
                  segments
                }
              ];
            } else if (activeTransport === 'best') {
              const carEta = Math.floor(distanceKm / 60);
              const bikeEta = Math.floor(distanceKm / 40);
              const trainEta = Math.floor(distanceKm / 80);
              
              logistics_options = [
                {
                  name: `via ${selectedOriginObj.name.split(',')[0]} (Car)`,
                  base_time: `${carEta} hr`,
                  eta: `${carEta} hr`,
                  fare: `₹${Math.round(distanceKm * 8)}`,
                  path: [selectedOriginObj.name, selectedDestObj.name],
                  segments,
                  icon: 'car'
                },
                {
                  name: `via ${selectedOriginObj.name.split(',')[0]} (Bike)`,
                  base_time: `${bikeEta} hr`,
                  eta: `${bikeEta} hr`,
                  fare: `₹${Math.round(distanceKm * 3)}`,
                  path: [selectedOriginObj.name, selectedDestObj.name],
                  segments,
                  icon: 'bike'
                }
              ];

              if (distanceKm > 200) {
                logistics_options.push({
                  name: `Direct Flight`,
                  base_time: `${Math.max(1, Math.floor(distanceKm / 800))} hr`,
                  eta: `${Math.max(1, Math.floor(distanceKm / 800))} hr`,
                  fare: `₹${Math.round(distanceKm * 15)}`,
                  path: [selectedOriginObj.name, selectedDestObj.name],
                  segments,
                  icon: 'plane'
                });
              } else {
                 logistics_options.push({
                  name: `Public Transit (Train)`,
                  base_time: `${trainEta} hr`,
                  eta: `${trainEta} hr`,
                  fare: `₹${Math.round(distanceKm * 1.5)}`,
                  path: [selectedOriginObj.name, selectedDestObj.name],
                  segments,
                  icon: 'train'
                });
              }
            }

            let transit_schedule: TransitSchedule[] | undefined = undefined;
            let transit_suspended = false;
            let suspension_reason = undefined;
            const now = new Date();
            const currentHour = now.getHours();

            // Real-time suspension logic
            if (['train', 'bus', 'plane'].includes(activeTransport)) {
              if (currentHour >= 1 && currentHour <= 4) {
                transit_suspended = true;
                suspension_reason = "Services are currently suspended during night hours (1 AM - 5 AM). Operations will resume at 05:00 AM.";
              }
            }

            let baseStartTime = now.getTime();
            if (transit_suspended) {
              const resumeTime = new Date(now);
              resumeTime.setHours(5, 0, 0, 0);
              baseStartTime = resumeTime.getTime();
            }

            if (activeTransport === 'train' || activeTransport === 'bus') {
              transit_schedule = Array.from({length: 3}).map((_, i) => {
                const depTime = new Date(baseStartTime + (i * 45 + (transit_suspended ? 0 : 15)) * 60000); 
                const arrTime = new Date(depTime.getTime() + baseDurationSecs * 1000);
                const fareValue = Math.round(distanceKm * (activeTransport === 'train' ? 1.5 : 2.5));
                return {
                  type: activeTransport as 'train' | 'bus',
                  vehicleNo: activeTransport === 'train' ? `TR-${Math.floor(Math.random() * 9000) + 1000}` : `BUS-${Math.floor(Math.random() * 900) + 100}`,
                  departureTime: depTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                  arrivalTime: arrTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                  platformOrGate: activeTransport === 'train' ? `Platform ${Math.floor(Math.random() * 10) + 1}` : `Gate ${String.fromCharCode(65 + Math.floor(Math.random() * 5))}`,
                  provider: activeTransport === 'train' ? 'National Rail' : 'City Transit Co.',
                  fare: `₹${fareValue}`,
                  status: transit_suspended && i === 0 ? 'Resuming' : 'On Time'
                };
              });
            }

            const dynamicData: RouteResponse = {
              recommended_route: {
                path: [selectedOriginObj.name, selectedDestObj.name],
                segments,
                total_km: distanceKm,
                total_days: eta,
                isRegional: true,
                transportMode: activeTransport,
                currentLocation,
                logistics_options,
                transit_schedule,
                transit_suspended,
                suspension_reason
              }
            };
            setRouteData(dynamicData);
            window.dispatchEvent(new CustomEvent('route_search', { detail: dynamicData }));
            setIsLoading(false);
            return;
          }
        } else if (['plane', 'ship'].includes(activeTransport)) {
          // Direct Line (Haversine Distance)
          const R = 6371; // km
          const dLat = (selectedDestObj.lat - selectedOriginObj.lat) * Math.PI / 180;
          const dLon = (selectedDestObj.lon - selectedOriginObj.lon) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(selectedOriginObj.lat * Math.PI / 180) * Math.cos(selectedDestObj.lat * Math.PI / 180) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distanceKm = Math.round(R * c);

          let speed = activeTransport === 'plane' ? 800 : 40;
          let baseDurationSecs = (distanceKm / speed) * 3600;
          let eta = '';
          let segments: RouteSegment[] = [];
          let logistics_options: LogisticsOption[] | undefined = undefined;

          if (activeTransport === 'ship') {
             // Create a "Port" that is physically 85% of the way to the destination
             const portLat = selectedOriginObj.lat + (selectedDestObj.lat - selectedOriginObj.lat) * 0.85;
             const portLon = selectedOriginObj.lon + (selectedDestObj.lon - selectedOriginObj.lon) * 0.85;
             const portName = `${selectedDestObj.name.split(',')[0]} Port Terminal`;

             const shipDistance = Math.round(distanceKm * 0.85);
             const remainDistance = Math.round(distanceKm * 0.15) || 1;

             const shipDurationSecs = (shipDistance / speed) * 3600;
             const hours = Math.floor(shipDurationSecs / 3600);
             const minutes = Math.floor((shipDurationSecs % 3600) / 60);
             eta = hours > 24 ? `${Math.floor(hours / 24)} days ${hours % 24} hr` : `${hours} hr ${minutes} min`;

             segments = [{
               from: selectedOriginObj.name,
               to: portName,
               traffic: 'clear',
               positions: [
                 [selectedOriginObj.lat, selectedOriginObj.lon],
                 [portLat, portLon]
               ]
             }];

             // Provide the last-mile connections from the port to the actual destination
             const busEta = Math.floor(remainDistance / 40);
             const trainEta = Math.floor(remainDistance / 60);
             const walkEta = Math.floor(remainDistance / 5);

             logistics_options = [
               {
                 name: `Bus from ${portName}`,
                 base_time: `${busEta > 0 ? busEta + ' hr' : '30 min'}`,
                 eta: `${busEta > 0 ? busEta + ' hr' : '30 min'}`,
                 fare: `₹${Math.round(remainDistance * 2.5)}`,
                 path: [portName, selectedDestObj.name],
                 segments: [{ from: portName, to: selectedDestObj.name, traffic: 'moderate', positions: [[portLat, portLon], [selectedDestObj.lat, selectedDestObj.lon]] }],
                 icon: 'bus'
               },
               {
                 name: `Train from ${portName}`,
                 base_time: `${trainEta > 0 ? trainEta + ' hr' : '20 min'}`,
                 eta: `${trainEta > 0 ? trainEta + ' hr' : '20 min'}`,
                 fare: `₹${Math.round(remainDistance * 1.5)}`,
                 path: [portName, selectedDestObj.name],
                 segments: [{ from: portName, to: selectedDestObj.name, traffic: 'clear', positions: [[portLat, portLon], [selectedDestObj.lat, selectedDestObj.lon]] }],
                 icon: 'train'
               },
               {
                 name: `Walk from ${portName}`,
                 base_time: `${walkEta > 0 ? walkEta + ' hr' : '45 min'}`,
                 eta: `${walkEta > 0 ? walkEta + ' hr' : '45 min'}`,
                 fare: `Free`,
                 path: [portName, selectedDestObj.name],
                 segments: [{ from: portName, to: selectedDestObj.name, traffic: 'clear', positions: [[portLat, portLon], [selectedDestObj.lat, selectedDestObj.lon]] }],
                 icon: 'walk'
               }
             ];

          } else {
            const hours = Math.floor(baseDurationSecs / 3600);
            const minutes = Math.floor((baseDurationSecs % 3600) / 60);
            eta = hours > 24 ? `${Math.floor(hours / 24)} days ${hours % 24} hr` : `${hours} hr ${minutes} min`;

            segments = [{
              from: selectedOriginObj.name,
              to: selectedDestObj.name,
              traffic: 'clear',
              positions: [
                [selectedOriginObj.lat, selectedOriginObj.lon],
                [selectedDestObj.lat, selectedDestObj.lon]
              ]
            }];
          }

          // Real-time suspension logic
          let transit_suspended = false;
          let suspension_reason = undefined;
          const now = new Date();
          const currentHour = now.getHours();

          if (['plane', 'ship'].includes(activeTransport)) {
            if (currentHour >= 1 && currentHour <= 4) {
              transit_suspended = true;
              suspension_reason = "Services are currently suspended during night hours (1 AM - 5 AM). Operations will resume at 05:00 AM.";
            }
          }

          let transit_schedule: TransitSchedule[] | undefined = undefined;
          let baseStartTime = now.getTime();
          if (transit_suspended) {
             const resumeTime = new Date(now);
             resumeTime.setHours(5, 0, 0, 0);
             baseStartTime = resumeTime.getTime();
          }

          transit_schedule = Array.from({length: 3}).map((_, i) => {
            const gap = activeTransport === 'plane' ? 120 : 360; // planes every 2 hours, ships every 6 hours
            const depTime = new Date(baseStartTime + (i * gap + (transit_suspended ? 0 : 45)) * 60000); 
            const arrTime = new Date(depTime.getTime() + baseDurationSecs * 1000);
            const fareValue = Math.round(distanceKm * (activeTransport === 'plane' ? 15 : 5));
            return {
              type: activeTransport as 'plane' | 'ship',
              vehicleNo: activeTransport === 'plane' ? `FL-${Math.floor(Math.random() * 900) + 100}` : `VSL-${Math.floor(Math.random() * 900) + 100}`,
              departureTime: depTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
              arrivalTime: arrTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
              platformOrGate: activeTransport === 'plane' ? `Gate ${String.fromCharCode(65 + Math.floor(Math.random() * 5))}` : `Dock ${Math.floor(Math.random() * 10) + 1}`,
              provider: activeTransport === 'plane' ? 'Global Airlines' : 'Oceanic Transit',
              fare: `₹${fareValue}`,
              status: transit_suspended && i === 0 ? 'Resuming' : 'On Time'
            } as any;
          });

          const dynamicData: RouteResponse = {
            recommended_route: {
              path: activeTransport === 'ship' && segments.length > 0 ? [selectedOriginObj.name, segments[0].to] : [selectedOriginObj.name, selectedDestObj.name],
              segments,
              total_km: activeTransport === 'ship' ? Math.round(distanceKm * 0.85) : distanceKm,
              total_days: eta,
              isRegional: true,
              transportMode: activeTransport,
              currentLocation,
              transit_suspended,
              suspension_reason,
              transit_schedule,
              logistics_options
            }
          };
          setRouteData(dynamicData);
          window.dispatchEvent(new CustomEvent('route_search', { detail: dynamicData }));
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.error("OSRM Routing failed", err);
      }
    }

    try {
      const res = await fetch('http://localhost:8001/optimize/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, destination, blocked_segments: [] })
      });
      if (res.ok) {
        const data = await res.json();
        setRouteData(data);
      } else {
        throw new Error("Failed to fetch");
      }
    } catch (err) {
      console.warn("Fallback routing active", err);
      // Simulate fallback routing after a short delay
      setTimeout(() => {
        if (origin.toLowerCase() === 'mumbai' && destination.toLowerCase() === 'goa') {
          // Dynamic ETAs for Mumbai -> Goa (590km)
          let eta = "11 hr 8 min";
          let path = ["Mumbai", "Panvel", "Pune", "Satara", "Kolhapur", "Goa"];
          let segments = [
            { from: "Mumbai", to: "Panvel", traffic: "heavy" as TrafficState, positions: [[19.0760, 72.8777] as [number,number], [18.9894, 73.1175] as [number,number]] },
            { from: "Panvel", to: "Pune", traffic: "clear" as TrafficState, positions: [[18.9894, 73.1175] as [number,number], [18.5204, 73.8567] as [number,number]] },
            { from: "Pune", to: "Satara", traffic: "moderate" as TrafficState, positions: [[18.5204, 73.8567] as [number,number], [17.6805, 74.0183] as [number,number]] },
            { from: "Satara", to: "Kolhapur", traffic: "clear" as TrafficState, positions: [[17.6805, 74.0183] as [number,number], [16.7050, 74.2433] as [number,number]] },
            { from: "Kolhapur", to: "Goa", traffic: "moderate" as TrafficState, positions: [[16.7050, 74.2433] as [number,number], [15.2993, 74.1240] as [number,number]] },
          ];

          let alternate_segments: RouteSegment[] | undefined = undefined;
          let logistics_options: LogisticsOption[] | undefined = undefined;

          if (activeTransport === 'bike') eta = "12 hr";
          if (activeTransport === 'train') eta = "14 hr";
          if (activeTransport === 'walk') eta = "5 days";
          
          if (activeTransport === 'plane') {
            eta = "1 hr 15 min";
            path = ["Mumbai", "Goa"];
            segments = [{ from: "Mumbai", to: "Goa", traffic: "clear" as TrafficState, positions: [[19.0760, 72.8777], [15.2993, 74.1240]] }];
          }
          if (activeTransport === 'ship') {
            eta = "1 day 12 hr";
            path = ["Mumbai", "Arabian Sea", "Goa"];
            segments = [
              { from: "Mumbai", to: "Arabian Sea", traffic: "clear" as TrafficState, positions: [[19.0760, 72.8777], [17.0, 72.0]] },
              { from: "Arabian Sea", to: "Goa", traffic: "clear" as TrafficState, positions: [[17.0, 72.0], [15.2993, 74.1240]] }
            ];
          }
          if (activeTransport === 'logistics') {
            eta = "9 hr 30 min (Optimized)";
            logistics_options = [
              {
                name: "Standard Highway",
                base_time: "10 hr",
                signal_delay: "+1 hr 8 min",
                eta: "11 hr 8 min",
                path: ["Mumbai", "Panvel", "Pune", "Satara", "Kolhapur", "Goa"],
                segments: [
                  { from: "Mumbai", to: "Panvel", traffic: "heavy" as TrafficState, positions: [[19.0760, 72.8777], [18.9894, 73.1175]] },
                  { from: "Panvel", to: "Pune", traffic: "clear" as TrafficState, positions: [[18.9894, 73.1175], [18.5204, 73.8567]] },
                  { from: "Pune", to: "Satara", traffic: "moderate" as TrafficState, positions: [[18.5204, 73.8567], [17.6805, 74.0183]] },
                  { from: "Satara", to: "Kolhapur", traffic: "clear" as TrafficState, positions: [[17.6805, 74.0183], [16.7050, 74.2433]] },
                  { from: "Kolhapur", to: "Goa", traffic: "moderate" as TrafficState, positions: [[16.7050, 74.2433], [15.2993, 74.1240]] },
                ]
              },
              {
                name: "AI Optimized Bypass",
                base_time: "9 hr 15 min",
                signal_delay: "+15 min",
                eta: "9 hr 30 min",
                path: ["Mumbai", "Panvel Bypass", "Kolhapur Expressway", "Goa"],
                segments: [
                  { from: "Mumbai", to: "Panvel Bypass", traffic: "clear" as TrafficState, positions: [[19.0760, 72.8777], [18.8, 73.2]] },
                  { from: "Panvel Bypass", to: "Kolhapur Expressway", traffic: "clear" as TrafficState, positions: [[18.8, 73.2], [16.5, 74.5]] },
                  { from: "Kolhapur Expressway", to: "Goa", traffic: "clear" as TrafficState, positions: [[16.5, 74.5], [15.2993, 74.1240]] },
                ]
              },
              {
                name: "Coastal Scenic Route",
                base_time: "10 hr",
                signal_delay: "+15 min",
                eta: "10 hr 15 min",
                path: ["Mumbai", "Alibag", "Ratnagiri", "Goa"],
                segments: [
                  { from: "Mumbai", to: "Alibag", traffic: "moderate" as TrafficState, positions: [[19.0760, 72.8777], [18.6414, 72.8722]] },
                  { from: "Alibag", to: "Ratnagiri", traffic: "clear" as TrafficState, positions: [[18.6414, 72.8722], [16.9902, 73.3120]] },
                  { from: "Ratnagiri", to: "Goa", traffic: "clear" as TrafficState, positions: [[16.9902, 73.3120], [15.2993, 74.1240]] },
                ]
              }
            ];
            
            // Set main segments to the AI Optimized one
            segments = logistics_options[1].segments;
            path = logistics_options[1].path;
          }

          const regionalData: RouteResponse = {
            recommended_route: {
              path,
              segments,
              total_km: 590,
              total_days: eta,
              isRegional: true,
              transportMode: activeTransport,
              alternate_segments,
              currentLocation,
              logistics_options
            }
          };
          setRouteData(regionalData);
          window.dispatchEvent(new CustomEvent('route_search', { detail: regionalData }));
        } else {
          // Default fallback global route with Ocean Waypoints
          const globalData: RouteResponse = {
            recommended_route: {
              path: [origin, "Singapore", "Indian Ocean", "Asian Sea", "Jeddah", "Suez Canal", "Port Said", destination],
              segments: [
                { from: "Shanghai", to: "Singapore", traffic: "clear", positions: [[31.2304, 121.4737], [1.3521, 103.8198]] },
                { from: "Singapore", to: "Indian Ocean", traffic: "clear", positions: [[1.3521, 103.8198], [-10.0000, 75.0000]] },
                { from: "Indian Ocean", to: "Asian Sea", traffic: "moderate", positions: [[-10.0000, 75.0000], [15.0000, 65.0000]] },
                { from: "Asian Sea", to: "Jeddah", traffic: "clear", positions: [[15.0000, 65.0000], [21.4858, 39.1925]] },
                { from: "Jeddah", to: "Suez Canal", traffic: "heavy", positions: [[21.4858, 39.1925], [30.5852, 32.2654]] },
                { from: "Suez Canal", to: "Port Said", traffic: "clear", positions: [[30.5852, 32.2654], [31.2653, 32.3019]] },
                { from: "Port Said", to: "Rotterdam", traffic: "clear", positions: [[31.2653, 32.3019], [51.9225, 4.4792]] },
              ],
              total_km: 19800,
              total_days: "28.5 days",
              isRegional: false,
              transportMode: activeTransport,
              currentLocation
            }
          };
          setRouteData(globalData);
          window.dispatchEvent(new CustomEvent('route_search', { detail: globalData }));
        }
        setIsLoading(false);
      }, 800);
    }
  };

  const swapLocations = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  const handleGPSLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setOrigin('Current Location');
        setCurrentLocation([lat, lng]);
        setSelectedOriginObj({ name: 'Current Location', lat, lon: lng });
      }, (error) => {
        console.error("GPS Error:", error);
        // Fallback for simulation if blocked
        setOrigin('Current Location');
        setCurrentLocation([19.0760, 72.8777]); // Default to Mumbai
        setSelectedOriginObj({ name: 'Current Location', lat: 19.0760, lon: 72.8777 });
      });
    }
  };

  return (
    <div className={`absolute left-1/2 pointer-events-auto z-50 transition-all duration-700 ease-in-out ${isExpanded ? 'top-10 -translate-x-1/2 w-[90%] md:w-[460px]' : 'top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] md:w-[600px]'}`}>
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-4 bg-[#0a0a0a]/80 border border-white/20 rounded-full p-3 pl-6 shadow-[0_20px_50px_rgb(0,0,0,0.5)] backdrop-blur-2xl"
          >
            <Search className="w-6 h-6 text-white/50" />
            <input
              type="text"
              placeholder="Search with RouteXpert"
              className="flex-1 bg-transparent text-white font-light text-lg outline-none placeholder:text-white/40"
              onFocus={(e) => {
                handleInteraction(e);
                setIsExpanded(true);
              }}
            />
            <MagneticButton>
              <button 
                onClick={(e) => {
                  handleInteraction(e);
                  setIsExpanded(true);
                }}
                className="w-12 h-12 rounded-full bg-cyan-600 flex items-center justify-center hover:bg-cyan-500 transition-colors shadow-[0_0_20px_rgba(6,182,212,0.4)]"
              >
                <Navigation className="w-5 h-5 text-white fill-white" />
              </button>
            </MagneticButton>
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#111]/95 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
          >
            {/* Header / Transport Modes */}
            <div className="bg-[#1a1a1a] px-4 py-2 flex items-center justify-between border-b border-white/5 overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-6 px-2 min-w-max">
                <button onClick={() => setActiveTransport('best')} className={`flex flex-col items-center gap-1 transition-colors ${activeTransport === 'best' ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'text-white/40 hover:text-white/70'}`}>
                  <Route className="w-5 h-5" />
                  <span className="text-[10px] uppercase font-medium">Best</span>
                </button>
                <button onClick={() => setActiveTransport('car')} className={`flex flex-col items-center gap-1 transition-colors ${activeTransport === 'car' ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'text-white/40 hover:text-white/70'}`}>
                  <Car className="w-5 h-5" />
                  <span className="text-[10px] uppercase font-medium">Car</span>
                </button>
                <button onClick={() => setActiveTransport('bike')} className={`flex flex-col items-center gap-1 transition-colors ${activeTransport === 'bike' ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'text-white/40 hover:text-white/70'}`}>
                  <Bike className="w-5 h-5" />
                  <span className="text-[10px] uppercase font-medium">Bike</span>
                </button>
                <button onClick={() => setActiveTransport('train')} className={`flex flex-col items-center gap-1 transition-colors ${activeTransport === 'train' ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]' : 'text-white/40 hover:text-white/70'}`}>
                  <Train className="w-5 h-5" />
                  <span className="text-[10px] uppercase font-medium">Train</span>
                </button>
                <button onClick={() => setActiveTransport('bus')} className={`flex flex-col items-center gap-1 transition-colors ${activeTransport === 'bus' ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'text-white/40 hover:text-white/70'}`}>
                  <Bus className="w-5 h-5" />
                  <span className="text-[10px] uppercase font-medium">Bus</span>
                </button>
                <button onClick={() => setActiveTransport('walk')} className={`flex flex-col items-center gap-1 transition-colors ${activeTransport === 'walk' ? 'text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]' : 'text-white/40 hover:text-white/70'}`}>
                  <Footprints className="w-5 h-5" />
                  <span className="text-[10px] uppercase font-medium">Walk</span>
                </button>
                <button onClick={() => setActiveTransport('plane')} className={`flex flex-col items-center gap-1 transition-colors ${activeTransport === 'plane' ? 'text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]' : 'text-white/40 hover:text-white/70'}`}>
                  <Plane className="w-5 h-5" />
                  <span className="text-[10px] uppercase font-medium">Flight</span>
                </button>
                <button onClick={() => setActiveTransport('ship')} className={`flex flex-col items-center gap-1 transition-colors ${activeTransport === 'ship' ? 'text-teal-400 drop-shadow-[0_0_8px_rgba(45,212,191,0.8)]' : 'text-white/40 hover:text-white/70'}`}>
                  <Ship className="w-5 h-5" />
                  <span className="text-[10px] uppercase font-medium">Ship</span>
                </button>
                <button onClick={() => setActiveTransport('logistics')} className={`flex flex-col items-center gap-1 transition-colors ${activeTransport === 'logistics' ? 'text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.8)]' : 'text-white/40 hover:text-white/70'}`}>
                  <Layers className="w-5 h-5" />
                  <span className="text-[10px] uppercase font-medium">Logistics</span>
                </button>
              </div>
              <button onClick={() => setIsExpanded(false)} className="p-2 ml-4 hover:bg-white/10 rounded-full transition-colors shrink-0">
                <X className="w-5 h-5 text-white/50" />
              </button>
            </div>

            {/* Inputs */}
            <div className="p-5 relative border-b border-white/5">
              <div className="absolute left-7 top-[34px] bottom-[34px] w-[2px] bg-white/10 flex flex-col items-center justify-between">
                <div className="w-2 h-2 rounded-full bg-cyan-400 -ml-[3px]" />
                <div className="w-2 h-2 rounded-full border-2 border-red-500 bg-black -ml-[3px]" />
              </div>

              <div className="flex flex-col gap-3 pl-8 pr-10">
                <div className="relative">
                  <input
                    value={origin}
                    onChange={(e) => { setOrigin(e.target.value); setSelectedOriginObj(null); }}
                    onFocus={(e) => handleInteraction(e)}
                    placeholder="Choose starting point"
                    className="w-full bg-[#222] border border-white/5 rounded-xl px-4 py-2.5 outline-none focus:border-cyan-500/50 transition-colors font-light text-white text-sm pr-10"
                  />
                  <button onClick={handleGPSLocation} className="absolute right-2 top-[7px] p-1.5 hover:bg-white/10 rounded-md transition-colors text-cyan-400 hover:text-cyan-300" title="Use Current Location">
                    <LocateFixed className="w-4 h-4" />
                  </button>
                  <AnimatePresence>
                    {showOriginDropdown && originSuggestions.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden z-50 shadow-2xl max-h-[200px] overflow-y-auto custom-scrollbar">
                        {originSuggestions.map((s, i) => {
                          const fullName = s.display_name;
                          return (
                            <div key={i} onClick={() => { setOrigin(fullName); setSelectedOriginObj({ name: fullName, lat: parseFloat(s.lat), lon: parseFloat(s.lon) }); setShowOriginDropdown(false); }} className="px-4 py-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 transition-colors">
                              <p className="text-white text-sm truncate">{fullName.split(',')[0]}</p>
                              <p className="text-white/40 text-[10px] truncate mt-0.5">{fullName}</p>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="relative">
                  <input
                    value={destination}
                    onChange={(e) => { setDestination(e.target.value); setSelectedDestObj(null); }}
                    placeholder="Choose destination"
                    className="w-full bg-[#222] border border-white/5 rounded-xl px-4 py-2.5 outline-none focus:border-cyan-500/50 transition-colors font-light text-white text-sm"
                  />
                  <AnimatePresence>
                    {showDestDropdown && destSuggestions.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden z-50 shadow-2xl max-h-[200px] overflow-y-auto custom-scrollbar">
                        {destSuggestions.map((s, i) => {
                          const fullName = s.display_name;
                          return (
                            <div key={i} onClick={() => { setDestination(fullName); setSelectedDestObj({ name: fullName, lat: parseFloat(s.lat), lon: parseFloat(s.lon) }); setShowDestDropdown(false); }} className="px-4 py-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 transition-colors">
                              <p className="text-white text-sm truncate">{fullName.split(',')[0]}</p>
                              <p className="text-white/40 text-[10px] truncate mt-0.5">{fullName}</p>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <button onClick={swapLocations} className="absolute right-5 top-[40px] p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white">
                <ArrowRightLeft className="w-4 h-4 rotate-90" />
              </button>

              <button 
                onClick={handleSearch}
                className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium text-sm tracking-widest uppercase hover:opacity-90 transition-opacity"
              >
                {isLoading ? 'Calculating...' : 'Search Route'}
              </button>
            </div>

            {/* Results Area */}
            <div className="p-5 min-h-[150px] bg-[#0a0a0a]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-[100px] gap-3">
                  <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                  <span className="text-xs text-white/40 tracking-widest uppercase">Querying ML Graph</span>
                </div>
              ) : routeData ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-yellow-500/10 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div>
                      <h4 className="text-white font-medium text-sm">Moderate Traffic / Swell</h4>
                      <p className="text-white/50 text-xs mt-1 leading-relaxed">Minor disruptions near {routeData.recommended_route.path[1]}. Alternate paths evaluated.</p>
                    </div>
                  </div>

                  <div className="flex gap-4 border-t border-white/10 pt-4 mt-2">
                    <div className="flex-1 flex flex-col gap-1">
                      <span className="flex items-center gap-1.5 text-white/40 text-xs uppercase tracking-wider"><Clock className="w-3 h-3" /> ETA</span>
                      <span className="text-xl font-light text-white">{routeData.recommended_route.total_days}</span>
                    </div>
                    <div className="flex-1 flex flex-col gap-1 border-l border-white/10 pl-4">
                      <span className="flex items-center gap-1.5 text-white/40 text-xs uppercase tracking-wider"><Route className="w-3 h-3" /> Distance</span>
                      <span className="text-xl font-light text-cyan-400">{routeData.recommended_route.total_km.toLocaleString()} km</span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-mono text-white/40">
                    {routeData.recommended_route.path.map((node, i) => (
                      <span key={i} className="flex items-center gap-2">
                        <span className={i === 0 || i === routeData.recommended_route.path.length - 1 ? "text-cyan-400" : "text-white/80"}>{node}</span>
                        {i < routeData.recommended_route.path.length - 1 && <span className="text-white/20">→</span>}
                      </span>
                    ))}
                  </div>

                  {routeData.recommended_route.logistics_options && (
                    <div className="flex flex-col gap-2 mt-4 border-t border-white/10 pt-4">
                      <span className="text-xs text-white/50 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Layers className="w-4 h-4"/> 
                        {routeData.recommended_route.transportMode === 'best' ? 'Recommended Options' : 
                         routeData.recommended_route.transportMode === 'ship' ? 'Last-Mile Port Connections' : 'Alternate Logistics Routes'}
                      </span>
                      {routeData.recommended_route.logistics_options.map((opt, i) => (
                        <div key={i} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5 hover:border-cyan-500/30 transition-colors cursor-pointer group">
                          <div className="flex items-center gap-3">
                            {opt.icon === 'car' && <Car className="w-5 h-5 text-white/50 group-hover:text-cyan-400 transition-colors" />}
                            {opt.icon === 'bike' && <Bike className="w-5 h-5 text-white/50 group-hover:text-cyan-400 transition-colors" />}
                            {opt.icon === 'train' && <Train className="w-5 h-5 text-white/50 group-hover:text-cyan-400 transition-colors" />}
                            {opt.icon === 'plane' && <Plane className="w-5 h-5 text-white/50 group-hover:text-cyan-400 transition-colors" />}
                            {opt.icon === 'bus' && <Bus className="w-5 h-5 text-white/50 group-hover:text-cyan-400 transition-colors" />}
                            {opt.icon === 'walk' && <Footprints className="w-5 h-5 text-white/50 group-hover:text-cyan-400 transition-colors" />}
                            {opt.icon === 'ship' && <Ship className="w-5 h-5 text-white/50 group-hover:text-cyan-400 transition-colors" />}
                            <div>
                              <h5 className="text-white text-sm font-medium group-hover:text-cyan-400 transition-colors">{opt.name}</h5>
                              <p className="text-[10px] text-white/40 mt-1 font-mono">
                                Base: {opt.base_time} 
                                {opt.signal_delay && <> | Signals: <span className="text-red-400">{opt.signal_delay}</span></>}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-cyan-400 font-mono text-sm">{opt.eta}</span>
                            {opt.fare && <span className="text-[10px] text-emerald-400 font-mono mt-0.5">{opt.fare}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {routeData.recommended_route.transit_suspended && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-red-400 font-medium text-sm">Service Suspended</h4>
                        <p className="text-white/60 text-xs mt-1 leading-relaxed">{routeData.recommended_route.suspension_reason}</p>
                      </div>
                    </div>
                  )}

                  {routeData.recommended_route.transit_schedule && (
                    <div className="flex flex-col gap-2 mt-4 border-t border-white/10 pt-4">
                      <span className="text-xs text-white/50 uppercase tracking-widest mb-2 flex items-center gap-2">
                        {routeData.recommended_route.transportMode === 'train' ? <Train className="w-4 h-4"/> : 
                         routeData.recommended_route.transportMode === 'bus' ? <Bus className="w-4 h-4"/> :
                         routeData.recommended_route.transportMode === 'plane' ? <Plane className="w-4 h-4"/> :
                         <Ship className="w-4 h-4"/>} 
                        Upcoming Schedules
                      </span>
                      {routeData.recommended_route.transit_schedule.map((schedule, i) => (
                        <div key={i} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5 hover:border-cyan-500/30 transition-colors">
                          <div className="flex flex-col gap-1">
                            <span className="text-white text-sm font-medium">{schedule.provider} • {schedule.vehicleNo}</span>
                            <span className="text-[10px] text-white/40">{schedule.platformOrGate} • <span className="text-emerald-400">{schedule.fare}</span></span>
                          </div>
                          <div className="flex flex-col items-end gap-1 font-mono">
                            <span className="text-cyan-400 text-sm">{schedule.departureTime} <span className="text-white/40 text-xs">→</span> {schedule.arrivalTime}</span>
                            <span className="text-[10px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">{schedule.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[100px] text-center">
                  <MapPin className="w-6 h-6 text-white/20 mb-2" />
                  <p className="text-xs text-white/40">Enter waypoints to predict logistics route</p>
                </div>
              )}
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
