'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Map, Package, Navigation, Truck, 
  Warehouse, Activity, FileText, ShieldCheck, Settings,
  Menu, X, Globe
} from 'lucide-react';

export default function LeftSidebar() {
  const [isOpen, setIsOpen] = useState(false);

  const mainLinks = [
    { icon: LayoutDashboard, label: "Overview", active: true },
    { icon: Map, label: "Global Routes" },
    { icon: Package, label: "Cargo Status" },
    { icon: Navigation, label: "Fleet Optimizer" },
    { icon: Truck, label: "Vehicles" },
    { icon: Warehouse, label: "Depots" },
    { icon: Activity, label: "Live Traffic" },
    { icon: FileText, label: "Invoices" },
    { icon: ShieldCheck, label: "Security Logs" },
  ];

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-6 left-6 z-[60] p-3 bg-[#020813] rounded-xl border border-cyan-500/30 text-cyan-400 md:hidden shadow-[0_0_20px_rgba(6,182,212,0.2)]"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Backdrop for mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[40] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Main Sidebar Wrapper */}
      <motion.aside 
        initial={false}
        animate={{ x: isOpen ? 0 : -340 }}
        className="fixed top-0 left-0 h-full w-[340px] md:w-[94px] md:hover:w-[340px] z-[50] flex md:translate-x-0 transition-all duration-500 ease-in-out rounded-r-[32px] overflow-hidden group shadow-[10px_0_50px_rgba(6,182,212,0.15)] bg-gradient-to-b from-[#0a1128] to-[#040d1a] border-r border-cyan-500/20 py-2 pr-2"
        style={{ transform: `translateX(0)` }}
      >
        <div className="w-[332px] flex h-full shrink-0 gap-2">
          
          {/* LEFT PANE: Icons Strip */}
          <div className="w-[84px] bg-[#02060d] flex flex-col items-center py-6 z-20 shrink-0 rounded-r-[24px] shadow-2xl">
            {/* Global Logo Icon */}
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-8 shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Globe className="w-6 h-6 text-cyan-400" />
            </div>

            {/* Main Icons */}
            <div className="flex flex-col gap-2 w-full px-3 flex-1 overflow-y-auto custom-scrollbar">
              {mainLinks.map((link, idx) => {
                const Icon = link.icon;
                return (
                  <button 
                    key={idx} 
                    className={`w-full aspect-square rounded-2xl flex items-center justify-center transition-all duration-300 ${link.active ? 'bg-cyan-500/15 text-cyan-400 shadow-[inset_0_0_10px_rgba(6,182,212,0.2)]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                  >
                    <Icon className="w-[22px] h-[22px]" strokeWidth={2} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT PANE: Text Labels */}
          <div className="w-[240px] bg-[#02060d] flex flex-col py-6 overflow-y-auto custom-scrollbar relative z-10 rounded-[24px]">
            {/* Header */}
            <div className="px-6 mb-8 h-12 flex items-center gap-4 shrink-0 opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 delay-100">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5 text-cyan-400" />
              </div>
              <span className="text-[20px] font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase">RouteXpert</span>
            </div>

            {/* Main Labels */}
            <nav className="flex-1 px-4 space-y-2">
              {mainLinks.map((link, idx) => (
                <button 
                  key={idx}
                  className={`w-full flex items-center px-5 py-[14px] rounded-[18px] transition-all duration-300 ${link.active ? 'bg-cyan-500/10 text-cyan-400' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
                >
                  <span className="font-medium tracking-wide text-[15px] opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap" style={{ transitionDelay: `${idx * 30}ms` }}>{link.label}</span>
                </button>
              ))}
            </nav>
          </div>

        </div>
      </motion.aside>

      <style jsx>{`
        @media (min-width: 768px) {
          aside {
            transform: translateX(0) !important;
          }
        }
        @media (max-width: 767px) {
          aside {
            transform: translateX(${isOpen ? '0' : '-100%'}) !important;
          }
        }
      `}</style>
    </>
  );
}
