'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, Truck, Bus, Ship, Navigation, Shuffle, CheckCircle, AlertTriangle, Layers } from 'lucide-react';

type RouteSplit = {
  name: string;
  count: number;
  percentage: number;
  eta: string;
  traffic: 'clear' | 'moderate' | 'heavy';
};

export default function FleetOptimizer({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RouteSplit[] | null>(null);

  // Form State
  const [origin, setOrigin] = useState('Mumbai');
  const [destination, setDestination] = useState('Pune');
  const [vehicleType, setVehicleType] = useState('Trucks');
  const [fleetSize, setFleetSize] = useState(10);

  const handleInteraction = (e: React.MouseEvent, route?: RouteSplit) => {
    if (!isLoggedIn) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('require_auth'));
      return;
    }
    
    if (route) {
      const eventData = {
        recommended_route: {
          path: [origin, route.name, destination],
          segments: [
            { from: origin, to: route.name, traffic: 'heavy', positions: [[19.0760, 72.8777], [18.9, 72.9], [18.8, 73.0]] },
            { from: route.name, to: destination, traffic: 'moderate', positions: [[18.8, 73.0], [18.7, 73.4], [18.5204, 73.8567]] }
          ],
          total_km: 150,
          total_days: route.eta,
          isRegional: true,
          transportMode: vehicleType.toLowerCase().includes('truck') ? 'logistics' : 'car'
        }
      };
      window.dispatchEvent(new CustomEvent('route_search', { detail: eventData }));
      window.scrollTo({ top: window.innerHeight * 6, behavior: 'smooth' });
    }
  };

  const handleOptimize = async () => {
    setLoading(true);
    setResult(null);

    // Simulate ML Optimization delay
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Dynamic Route Names based on input
    const isMumbaiPune = origin.toLowerCase().includes('mumbai') && destination.toLowerCase().includes('pune');
    
    let routes = [
      { name: isMumbaiPune ? "Mumbai-Pune Expressway" : `Primary Highway to ${destination}`, traffic: 'heavy' as const, base_eta: 2.5 },
      { name: isMumbaiPune ? "Old Mumbai-Pune Highway (NH48)" : `Secondary Route B`, traffic: 'moderate' as const, base_eta: 3.5 },
      { name: isMumbaiPune ? "Khopoli-Pali Alternate" : `Scenic Bypass C`, traffic: 'clear' as const, base_eta: 4.0 },
    ];

    // Splitting Logic based on traffic and fleet size
    let remaining = fleetSize;
    let splits: RouteSplit[] = [];

    // Assign vehicles inversely proportional to traffic severity
    const allocations = [
      Math.floor(fleetSize * 0.2), // Heavy traffic gets least
      Math.floor(fleetSize * 0.35), // Moderate traffic
      0 // Clear gets the rest
    ];
    
    allocations[2] = fleetSize - allocations[0] - allocations[1];

    routes.forEach((route, idx) => {
      let count = allocations[idx];
      // If fleet size is very small, roundings might result in 0 count. Ensure at least something if possible.
      
      splits.push({
        name: route.name,
        count: count,
        percentage: (count / fleetSize) * 100,
        eta: `${route.base_eta} hrs`,
        traffic: route.traffic
      });
    });

    // Sort so routes with most vehicles appear first
    splits.sort((a, b) => b.count - a.count);

    setResult(splits);
    setLoading(false);
  };

  const getTrafficColor = (traffic: string) => {
    switch (traffic) {
      case 'heavy': return 'from-red-500 to-orange-500';
      case 'moderate': return 'from-yellow-500 to-orange-400';
      case 'clear': return 'from-emerald-400 to-cyan-500';
      default: return 'from-cyan-500 to-blue-500';
    }
  };

  const getTrafficTextColor = (traffic: string) => {
    switch (traffic) {
      case 'heavy': return 'text-red-400';
      case 'moderate': return 'text-yellow-400';
      case 'clear': return 'text-emerald-400';
      default: return 'text-cyan-400';
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-8 rounded-3xl bg-black/40 border border-purple-500/20 backdrop-blur-2xl shadow-[0_0_50px_rgba(168,85,247,0.1)] pointer-events-auto overflow-hidden relative">
      {/* Decorative gradient orb */}
      <div className="absolute -top-32 -left-32 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px]" />
      
      <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-6 relative z-10">
        <div className="p-3 rounded-full bg-purple-500/10 border border-purple-500/30">
          <Network className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h3 className="text-2xl font-light text-white">Logistics Fleet Optimizer</h3>
          <p className="text-sm text-white/50 font-light tracking-wide">Intelligently split your fleet to bypass single-lane congestion</p>
        </div>
      </div>

      <div className="space-y-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-white/50 flex items-center gap-2">
              <Navigation className="w-3 h-3" /> Origin
            </label>
            <input 
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors cursor-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-white/50 flex items-center gap-2">
              <Navigation className="w-3 h-3 rotate-90" /> Destination
            </label>
            <input 
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors cursor-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-white/50 flex items-center gap-2">
              <Layers className="w-3 h-3" /> Vehicle Type
            </label>
            <select 
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors appearance-none cursor-none"
            >
              <option className="bg-neutral-900">Trucks</option>
              <option className="bg-neutral-900">Buses</option>
              <option className="bg-neutral-900">Ships</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-white/50 flex items-center gap-2">
              <Truck className="w-3 h-3" /> Fleet Size: <span className="text-white ml-2">{fleetSize} {vehicleType}</span>
            </label>
            <input 
              type="range" 
              min="2" max="100" 
              value={fleetSize}
              onChange={(e) => setFleetSize(parseInt(e.target.value))}
              className="w-full accent-purple-500 cursor-none mt-2"
            />
          </div>
        </div>

        <div className="pt-4 flex justify-center">
          <button 
            onClick={handleOptimize}
            disabled={loading}
            className="relative px-8 py-4 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium tracking-wider uppercase text-sm hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] transition-all duration-300 disabled:opacity-50 overflow-hidden cursor-none flex items-center gap-2"
          >
            {loading ? (
              <>
                <Shuffle className="w-4 h-4 animate-spin" /> Distributing Fleet...
              </>
            ) : (
              <>
                <Shuffle className="w-4 h-4" /> Run Fleet Distribution
              </>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 32 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="overflow-hidden relative z-10"
          >
            <div className="p-6 rounded-2xl bg-black/60 border border-white/10 relative">
              <h4 className="text-lg font-light text-white mb-6 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" /> 
                Fleet Optimized for {fleetSize} {vehicleType}
              </h4>

              <div className="space-y-5">
                {result.map((route, idx) => (
                  <div key={idx} className="relative">
                    <div className="flex justify-between items-end mb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center justify-center bg-white/5 border border-white/10 w-10 h-10 rounded-lg">
                          <span className="text-lg font-medium text-white leading-none">{route.count}</span>
                          <span className="text-[8px] text-white/40 uppercase mt-0.5">Qty</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{route.name}</p>
                          <p className="text-xs text-white/50 flex items-center gap-2 mt-0.5">
                            <span>ETA: {route.eta}</span>
                            <span className="w-1 h-1 rounded-full bg-white/20"></span>
                            <span className={`${getTrafficTextColor(route.traffic)} uppercase text-[10px] tracking-wider`}>
                              {route.traffic} Traffic
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <span className="text-sm font-mono text-white/70 leading-none">{route.percentage.toFixed(0)}%</span>
                        <button onClick={(e) => handleInteraction(e, route)} className="text-[9px] px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/40 rounded border border-cyan-500/30 uppercase tracking-widest transition-colors text-cyan-300 hover:text-white">Start</button>
                      </div>
                    </div>
                    
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${route.percentage}%` }}
                        transition={{ duration: 1.5, delay: idx * 0.2, ease: "easeOut" }}
                        className={`h-full bg-gradient-to-r ${getTrafficColor(route.traffic)}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
