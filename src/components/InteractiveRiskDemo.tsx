'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, AlertTriangle, CheckCircle, Clock, Navigation, Shield, Wind } from 'lucide-react';
import MagneticButton from './MagneticButton';

type RiskResponse = {
  shipment_id: string;
  risk_score: number;
  risk_level: string;
  delay_probability: number;
};

export default function InteractiveRiskDemo() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RiskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [originSegment, setOriginSegment] = useState('Indian Ocean');
  const [destSegment, setDestSegment] = useState('Red Sea');
  const [cargoType, setCargoType] = useState('Electronics');
  const [delayHours, setDelayHours] = useState(12);

  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    // Give a slight synthetic delay for UX (smooth loading animation)
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      const response = await fetch('http://localhost:8001/predict/risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipment_id: `SHP-${Math.floor(Math.random() * 10000)}`,
          delay_hours: delayHours,
          weather_score: 0.8,
          port_congestion: 0.6,
          speed_knots: 10,
          route_segment: `${originSegment} to ${destSegment}`,
          cargo_type: cargoType,
          dwell_hours: 4,
        }),
      });

      if (!response.ok) {
        throw new Error('Backend not reachable or returned an error.');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      // Fallback data if backend isn't running
      setError("Backend unreachable. Using simulation mode.");
      setResult({
        shipment_id: `SHP-SIMULATED`,
        risk_score: Math.random() * 0.5 + 0.3,
        risk_level: delayHours > 20 ? 'CRITICAL' : 'MEDIUM',
        delay_probability: Math.random() * 0.4 + 0.4,
      });
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'text-red-500';
      case 'HIGH': return 'text-orange-500';
      case 'MEDIUM': return 'text-yellow-500';
      default: return 'text-emerald-400';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-8 rounded-3xl bg-black/40 border border-cyan-500/20 backdrop-blur-2xl shadow-[0_0_50px_rgba(6,182,212,0.1)] pointer-events-auto overflow-hidden relative">
      {/* Decorative gradient orb */}
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-cyan-500/20 rounded-full blur-[80px]" />
      
      <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-6 relative z-10">
        <div className="p-3 rounded-full bg-cyan-500/10 border border-cyan-500/30">
          <Activity className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-2xl font-light text-white">Live Risk Prediction</h3>
          <p className="text-sm text-white/50 font-light tracking-wide">Test the ML models with live parameters</p>
        </div>
      </div>

      <div className="space-y-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-white/50 flex items-center gap-2">
              <Navigation className="w-3 h-3" /> Origin
            </label>
            <select 
              value={originSegment}
              onChange={(e) => setOriginSegment(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors appearance-none cursor-none"
            >
              <option className="bg-neutral-900">Shanghai</option>
              <option className="bg-neutral-900">Singapore</option>
              <option className="bg-neutral-900">Indian Ocean</option>
              <option className="bg-neutral-900">Asian Sea</option>
              <option className="bg-neutral-900">Jeddah</option>
              <option className="bg-neutral-900">Suez Canal</option>
              <option className="bg-neutral-900">Port Said</option>
              <option className="bg-neutral-900">Rotterdam</option>
              <option className="bg-neutral-900">Red Sea</option>
              <option className="bg-neutral-900">Pacific Ocean</option>
              <option className="bg-neutral-900">English Channel</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-white/50 flex items-center gap-2">
              <Navigation className="w-3 h-3 rotate-90" /> Destination
            </label>
            <select 
              value={destSegment}
              onChange={(e) => setDestSegment(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors appearance-none cursor-none"
            >
              <option className="bg-neutral-900">Shanghai</option>
              <option className="bg-neutral-900">Singapore</option>
              <option className="bg-neutral-900">Indian Ocean</option>
              <option className="bg-neutral-900">Asian Sea</option>
              <option className="bg-neutral-900">Jeddah</option>
              <option className="bg-neutral-900">Suez Canal</option>
              <option className="bg-neutral-900">Port Said</option>
              <option className="bg-neutral-900">Rotterdam</option>
              <option className="bg-neutral-900">Red Sea</option>
              <option className="bg-neutral-900">Pacific Ocean</option>
              <option className="bg-neutral-900">English Channel</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-white/50 flex items-center gap-2">
              <Shield className="w-3 h-3" /> Cargo Type
            </label>
            <select 
              value={cargoType}
              onChange={(e) => setCargoType(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors appearance-none cursor-none"
            >
              <option className="bg-neutral-900">Electronics</option>
              <option className="bg-neutral-900">Perishables</option>
              <option className="bg-neutral-900">Chemicals</option>
              <option className="bg-neutral-900">General</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest text-white/50 flex items-center gap-2">
            <Clock className="w-3 h-3" /> Base Delay Hours: <span className="text-white ml-2">{delayHours}h</span>
          </label>
          <input 
            type="range" 
            min="0" max="72" 
            value={delayHours}
            onChange={(e) => setDelayHours(parseInt(e.target.value))}
            className="w-full accent-cyan-500 cursor-none"
          />
        </div>

        <div className="pt-4 flex justify-center">
          <button 
            onClick={handlePredict}
            disabled={loading}
            className="relative px-8 py-4 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium tracking-wider uppercase text-sm hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all duration-300 disabled:opacity-50 overflow-hidden cursor-none"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Wind className="w-4 h-4 animate-spin" /> Analyzing...
              </span>
            ) : (
              'Run ML Prediction'
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
              {error && (
                <div className="absolute -top-3 right-4 bg-yellow-500/20 text-yellow-400 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border border-yellow-500/30 flex items-center gap-1 backdrop-blur-md">
                  <AlertTriangle className="w-3 h-3" /> Simulation Mode
                </div>
              )}
              
              <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Shipment ID</p>
                  <p className="text-lg font-medium text-white font-mono">{result.shipment_id}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Risk Level</p>
                  <p className={`text-2xl font-semibold tracking-wide ${getRiskColor(result.risk_level)}`}>
                    {result.risk_level}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-white/60 mb-2">
                    <span>Overall Risk Score</span>
                    <span>{(result.risk_score * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${result.risk_score * 100}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`h-full bg-gradient-to-r from-cyan-500 to-blue-500`}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-white/60 mb-2">
                    <span>Probability of Major Delay</span>
                    <span>{(result.delay_probability * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${result.delay_probability * 100}%` }}
                      transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                      className={`h-full bg-gradient-to-r from-orange-500 to-red-500`}
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-emerald-400">
                <CheckCircle className="w-4 h-4" /> Random Forest Model Execution Complete
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
