'use client';

import { useEffect, useState } from 'react';
import { RouteResponse } from './RouteSearchPanel';
import dynamic from 'next/dynamic';

const DynamicRealWorldMap = dynamic(() => import('./RealWorldMap'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-black/40 backdrop-blur-md">
      <div className="w-8 h-8 border-2 border-white/10 border-t-cyan-500 rounded-full animate-spin"></div>
    </div>
  )
});

export default function WorldMap() {
  const [routeData, setRouteData] = useState<RouteResponse | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Listen for custom routing events from the RouteSearchPanel
    const handleRouteSearch = (e: Event) => {
      const customEvent = e as CustomEvent<RouteResponse>;
      setRouteData(customEvent.detail);
      setIsLoaded(true);
    };

    window.addEventListener('route_search', handleRouteSearch);

    // Initial default state
    setTimeout(() => {
      if (!routeData) {
        setRouteData({
          recommended_route: {
            path: ["Shanghai", "Singapore", "Indian Ocean", "Asian Sea", "Jeddah", "Suez Canal", "Port Said", "Rotterdam"],
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
            transportMode: 'ship'
          }
        });
        setIsLoaded(true);
      }
    }, 1000);

    return () => window.removeEventListener('route_search', handleRouteSearch);
  }, []);

  const isRegional = routeData?.recommended_route.isRegional ?? false;
  const pathNodes = routeData?.recommended_route.path ?? [];

  return (
    <div className="relative w-full max-w-6xl mx-auto aspect-[2/1] bg-black/40 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
      
      {/* Real World Geographic Map */}
      <div className="absolute inset-0 z-0">
        <DynamicRealWorldMap routeData={routeData} />
      </div>
      
      {/* Overlay Status UI */}
      <div className="absolute top-6 left-6 p-4 bg-black/80 border border-white/10 rounded-2xl backdrop-blur-md z-10 shadow-2xl">
        <p className="text-xs text-white/50 uppercase tracking-widest mb-1">{isRegional ? 'Regional Tracking' : 'Active Fleet Track'}</p>
        <p className="text-xl font-light text-white capitalize">
          {pathNodes[0] || 'Origin'} <span className="text-cyan-500">→</span> {pathNodes[pathNodes.length - 1] || 'Destination'}
        </p>
        <div className="flex gap-4 mt-4 text-xs font-mono text-cyan-400">
          <span>{pathNodes.length > 0 ? 'OPTIMIZED' : 'ANALYZING...'}</span>
          <span className="text-white/30">|</span>
          <span>LIVE ML</span>
        </div>
      </div>
    </div>
  );
}
