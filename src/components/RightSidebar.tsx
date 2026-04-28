'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Settings, UserCog, HelpCircle, ChevronRight, Bell, Moon, MapPin } from 'lucide-react';

export default function RightSidebar() {
  const [isHovered, setIsHovered] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  // Settings states
  const [realtimeTracking, setRealtimeTracking] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(false);
  
  // Real-time Toast System
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "Admin User";
        setUser({ name, email: session.user.email || "" });
      }
    };
    fetchUser();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const scrollToContact = () => {
    const contactSection = document.getElementById('contact-section');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
      setIsHovered(false);
      showToast('Redirecting to Support Desk...');
    }
  };

  const profileName = user ? user.name : "Denzel Washington";
  const profileEmail = user ? user.email : "Admin";

  return (
    <>
      {/* Mobile Toggle Button (Visible only on small screens) */}
      <button 
        onClick={() => setIsHovered(!isHovered)}
        className="fixed top-6 right-6 z-[60] p-3 bg-[#020813] rounded-xl border border-cyan-500/30 text-cyan-400 md:hidden shadow-[0_0_20px_rgba(6,182,212,0.2)]"
      >
        <Settings className="w-6 h-6" />
      </button>

      {/* Invisible Hover Trigger Area (Desktop only) */}
      <div 
        className="fixed top-0 right-0 h-full w-6 z-[60] hidden md:block"
        onMouseEnter={() => setIsHovered(true)}
      />

      {/* Real-time Toast Notification */}
      <div className={`fixed bottom-8 right-8 z-[100] bg-[#02060d]/95 border border-cyan-500/50 text-cyan-50 px-6 py-4 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.4)] backdrop-blur-md transition-all duration-500 ease-out transform ${toastMessage ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-95 pointer-events-none'}`}>
        <div className="flex items-center gap-4">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
          <span className="font-medium tracking-wide text-[14px] text-white/90">{toastMessage}</span>
        </div>
      </div>

      <aside 
        className={`fixed top-0 right-0 h-full w-[340px] z-[50] transition-transform duration-500 ease-in-out rounded-l-[32px] shadow-[-10px_0_50px_rgba(6,182,212,0.15)] bg-gradient-to-b from-[#0a1128] to-[#040d1a] border-l border-cyan-500/20 py-4 pl-4 flex flex-col justify-between overflow-hidden group ${isHovered ? 'translate-x-0' : 'translate-x-full'}`}
        onMouseEnter={() => window.innerWidth >= 768 && setIsHovered(true)}
        onMouseLeave={() => window.innerWidth >= 768 && setIsHovered(false)}
      >
        
        {/* Inner dark container */}
        <div className="w-[324px] h-full bg-[#02060d] rounded-[24px] flex flex-col justify-between pb-8 pt-6 relative overflow-hidden">
          
          {/* Top Settings Section */}
          <div className="px-5 space-y-6">
            <h3 className={`text-white/80 font-medium tracking-wide text-sm uppercase transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>System Settings</h3>
            
            <div className="space-y-4">
              {/* Toggle 1 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-white/40" />
                  <span className={`text-[14px] text-white/60 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>Real-time Tracking</span>
                </div>
                <button 
                  onClick={() => {
                    setRealtimeTracking(!realtimeTracking);
                    showToast(`Real-time global tracking ${!realtimeTracking ? 'enabled' : 'disabled'}.`);
                  }}
                  className={`w-10 h-5 rounded-full transition-colors duration-300 relative ${realtimeTracking ? 'bg-cyan-500' : 'bg-white/10'} ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                >
                  <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-transform duration-300 ${realtimeTracking ? 'translate-x-[22px]' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Toggle 2 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-white/40" />
                  <span className={`text-[14px] text-white/60 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>Push Notifications</span>
                </div>
                <button 
                  onClick={() => {
                    setNotifications(!notifications);
                    showToast(`System notifications ${!notifications ? 'enabled' : 'muted'}.`);
                  }}
                  className={`w-10 h-5 rounded-full transition-colors duration-300 relative ${notifications ? 'bg-cyan-500' : 'bg-white/10'} ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                >
                  <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-transform duration-300 ${notifications ? 'translate-x-[22px]' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Toggle 3 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Moon className="w-5 h-5 text-white/40" />
                  <span className={`text-[14px] text-white/60 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>Dark Mode</span>
                </div>
                <button 
                  onClick={() => {
                    setDarkMode(!darkMode);
                    showToast(`Interface switched to ${!darkMode ? 'dark' : 'light'} mode.`);
                  }}
                  className={`w-10 h-5 rounded-full transition-colors duration-300 relative ${darkMode ? 'bg-cyan-500' : 'bg-white/10'} ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                >
                  <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-transform duration-300 ${darkMode ? 'translate-x-[22px]' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            <div className="h-px w-full bg-white/5 my-6" />

            <div className="space-y-1">
              <button 
                onClick={() => showToast('Opening Advanced Configuration...')}
                className="w-full flex items-center gap-4 px-3 py-3 rounded-xl text-white/40 hover:bg-cyan-500/10 hover:text-cyan-400 transition-all duration-300"
              >
                <Settings className="w-5 h-5 shrink-0" strokeWidth={2} />
                <span className={`text-[14px] whitespace-nowrap transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>Advanced Config</span>
              </button>
              <button 
                onClick={() => showToast('Syncing User Roles...')}
                className="w-full flex items-center gap-4 px-3 py-3 rounded-xl text-white/40 hover:bg-cyan-500/10 hover:text-cyan-400 transition-all duration-300"
              >
                <UserCog className="w-5 h-5 shrink-0" strokeWidth={2} />
                <span className={`text-[14px] whitespace-nowrap transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>User Management</span>
              </button>
              <button 
                onClick={scrollToContact}
                className="w-full flex items-center gap-4 px-3 py-3 rounded-xl text-white/40 hover:bg-cyan-500/10 hover:text-cyan-400 transition-all duration-300"
              >
                <HelpCircle className="w-5 h-5 shrink-0" strokeWidth={2} />
                <span className={`text-[14px] whitespace-nowrap transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>Help & Support</span>
              </button>
            </div>
          </div>
          
          {/* User Profile Card */}
          <div 
            onClick={() => showToast(`Logged in as ${profileName}`)}
            className="mx-4 mt-4 pt-6 border-t border-cyan-500/10 flex items-center justify-between px-4 cursor-pointer hover:bg-cyan-500/5 rounded-[18px] transition-colors duration-300 py-3 group/profile"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-medium shadow-[0_0_15px_rgba(6,182,212,0.3)] shrink-0 overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profileName.replace(/\s+/g, '')}`} alt="Profile" className="w-full h-full object-cover" />
              </div>
              <div className={`flex flex-col text-left whitespace-nowrap overflow-hidden transition-opacity duration-300 delay-150 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                <span className="text-[14px] font-medium text-white group-hover/profile:text-cyan-400 transition-colors truncate max-w-[150px]">{profileName}</span>
                <span className="text-[12px] text-white/40 font-light truncate max-w-[150px]">{profileEmail}</span>
              </div>
            </div>
            <ChevronRight className={`w-4 h-4 text-white/30 group-hover/profile:text-cyan-400 transition-colors shrink-0 ml-2 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />
          </div>
        </div>

      </aside>
    </>
  );
}
