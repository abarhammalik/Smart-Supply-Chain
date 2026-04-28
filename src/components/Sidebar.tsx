'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Package, ShoppingCart, Users, Truck, 
  Warehouse, BarChart3, CreditCard, ShieldCheck, Sliders,
  Settings, UserCog, HelpCircle, Menu, X, ChevronRight
} from 'lucide-react';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  const mainLinks = [
    { icon: LayoutDashboard, label: "Dashboard", active: true },
    { icon: Package, label: "Shipments" },
    { icon: ShoppingCart, label: "Orders" },
    { icon: Users, label: "Clients" },
    { icon: Truck, label: "Fleet management" },
    { icon: Warehouse, label: "Warehousing" },
    { icon: BarChart3, label: "Reports & analytics" },
    { icon: CreditCard, label: "Billing & payments" },
    { icon: ShieldCheck, label: "Security" },
    { icon: Sliders, label: "Preferences" },
  ];

  const bottomLinks = [
    { icon: Settings, label: "Settings" },
    { icon: UserCog, label: "User management" },
    { icon: HelpCircle, label: "Help & support" },
  ];

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-6 left-6 z-[60] p-3 bg-black/50 border border-white/10 rounded-xl backdrop-blur-md text-white md:hidden hover:bg-white/10 transition-colors"
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

      {/* Two-Pane Sidebar Container */}
      <motion.aside 
        initial={false}
        animate={{ x: isOpen ? 0 : -340 }}
        className="fixed top-0 left-0 h-full w-[340px] md:w-[80px] md:hover:w-[340px] z-[50] flex md:translate-x-0 transition-all duration-300 rounded-tr-3xl rounded-br-3xl overflow-hidden shadow-[10px_0_50px_rgba(0,0,0,0.5)] group"
        style={{ transform: `translateX(0)` }} // Override for desktop via CSS
      >
        <div className="w-[340px] flex h-full shrink-0">
          {/* LEFT PANE: Icons Strip */}
          <div className="w-[80px] bg-[#051515] flex flex-col items-center py-8 z-20 shrink-0">
          {/* Logo Icon */}
          <div className="w-12 h-12 rounded-2xl bg-[#0a2525] flex items-center justify-center mb-10 shadow-lg">
            <div className="w-5 h-5 border-[3px] border-cyan-400 rounded-sm rotate-45" />
          </div>

          {/* Main Icons */}
          <div className="flex flex-col gap-4 w-full px-4 flex-1">
            {mainLinks.map((link, idx) => {
              const Icon = link.icon;
              return (
                <button 
                  key={idx} 
                  className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all ${link.active ? 'bg-white/10 text-white shadow-inner' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                >
                  <Icon className="w-5 h-5" />
                </button>
              );
            })}
          </div>

          {/* Bottom Profile Icon (Dummy) */}
          <div className="mt-auto w-full px-4 pt-4 border-t border-white/5 flex justify-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 border-2 border-[#051515] shadow-lg flex items-center justify-center text-white font-medium">
              S
            </div>
          </div>
        </div>

        {/* RIGHT PANE: Text Labels */}
        <div className="flex-1 bg-[#091a1a] flex flex-col py-8 overflow-y-auto custom-scrollbar relative z-10 border-r border-white/5">
          {/* Header */}
          <div className="px-6 mb-10 h-12 flex items-center">
            <span className="text-xl font-medium tracking-wide text-white">RouteXpert</span>
          </div>

          {/* Main Labels */}
          <nav className="flex-1 px-4 space-y-2">
            {mainLinks.map((link, idx) => (
              <button 
                key={idx}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${link.active ? 'bg-white/5 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
              >
                <span className="font-light tracking-wide text-[15px]">{link.label}</span>
              </button>
            ))}
          </nav>

          {/* Bottom Settings */}
          <div className="px-4 mt-8 space-y-1">
            {bottomLinks.map((link, idx) => {
              const Icon = link.icon;
              return (
                <button 
                  key={idx}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-white/50 hover:bg-white/5 hover:text-white transition-all duration-300"
                >
                  <Icon className="w-[18px] h-[18px]" />
                  <span className="font-light tracking-wide text-[15px]">{link.label}</span>
                </button>
              );
            })}
            
            {/* User Profile Card */}
            <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between px-2 cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-medium shadow-lg">
                  S
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[15px] font-medium text-white group-hover:text-cyan-400 transition-colors">Siddhesh</span>
                  <span className="text-[13px] text-white/40 font-light">Admin</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-cyan-400 transition-colors" />
            </div>
          </div>
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
