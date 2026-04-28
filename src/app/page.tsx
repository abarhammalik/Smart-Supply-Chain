'use client';

import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useMotionValue } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { Mouse } from 'lucide-react';
import ImageSequenceCanvas from "@/components/ImageSequenceCanvas";
import ParticleBackground from "@/components/ParticleBackground";
import Preloader from "@/components/Preloader";
import LeftSidebar from "@/components/LeftSidebar";
import RightSidebar from "@/components/RightSidebar";
import CustomCursor from "@/components/CustomCursor";
import MagneticButton from "@/components/MagneticButton";
import TextReveal from "@/components/TextReveal";
import InteractiveRiskDemo from "@/components/InteractiveRiskDemo";
import FleetOptimizer from "@/components/FleetOptimizer";
import WorldMap from "@/components/WorldMap";
import RouteSearchPanel from "@/components/RouteSearchPanel";
import Sidebar from "@/components/Sidebar";
import ContactForm from "@/components/ContactForm";
import LoginModal from "@/components/LoginModal";

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { scrollYProgress } = useScroll();
  
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkAuth();

    const handleRequireAuth = () => {
      setShowLoginModal(true);
    };
    window.addEventListener('require_auth', handleRequireAuth);
    
    return () => {
      window.removeEventListener('require_auth', handleRequireAuth);
    };
  }, []);

  // Parallax values for the background elements
  const y1 = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  
  // Fade out AI text based on logo animation frames (not scroll)
  const aiTextOpacity = useMotionValue(1);

  const handleAutoPlayProgress = (frame: number) => {
    // Fade out between frame 30 and 50
    if (frame >= 30 && frame <= 50) {
      aiTextOpacity.set(1 - (frame - 30) / 20);
    } else if (frame > 50) {
      aiTextOpacity.set(0);
    }
  };

  return (
    <>
      <LeftSidebar />
      <RightSidebar />
      <Preloader isLoaded={isLoaded} />
      <CustomCursor />
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
        onSuccess={() => {
          setShowLoginModal(false);
          setIsLoggedIn(true);
        }} 
      />
      
      <main className="relative w-full bg-black cursor-auto md:cursor-none text-white selection:bg-cyan-500/30 md:pl-[94px]">
        <ParticleBackground />
        
        {/* We keep the height extremely large so the user has plenty of scroll real-estate to scrub the canvas */}
        <div className="relative w-full h-[1400vh]">
          
          {/* The canvas sits sticky at the top, scrubbing behind all content */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            <ImageSequenceCanvas 
              onLoaded={() => setIsLoaded(true)} 
              onAutoPlayProgress={handleAutoPlayProgress}
            />
          </div>

          {/* ----- UI Overlays ----- */}
          
          {/* Hero Section */}
          <motion.div 
            className="sticky top-0 h-screen w-full flex flex-col items-center justify-center pointer-events-none z-10"
            style={{ opacity }}
          >
            <div className="absolute bottom-32 left-1/2 -translate-x-1/2 whitespace-nowrap z-10 pointer-events-none w-full text-center">
              <motion.p 
                style={{ opacity: aiTextOpacity }}
                className="text-xl md:text-2xl font-light tracking-widest text-white/70 uppercase mix-blend-difference drop-shadow-2xl"
                initial={{ y: 20 }}
                animate={isLoaded ? { y: 0 } : {}}
                transition={{ duration: 1, delay: 1.2, ease: "easeOut" }}
              >
                AI-Powered Supply Chain Intelligence
              </motion.p>
            </div>
            
            <motion.div 
              className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 mix-blend-difference"
              initial={{ opacity: 0 }}
              animate={isLoaded ? { opacity: 1 } : {}}
              transition={{ delay: 2, duration: 1 }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs tracking-[0.2em] uppercase text-white/50">Scroll to Extract</span>
                <Mouse className="w-3 h-3 text-white/50" />
              </div>
              <motion.div 
                className="w-[1px] h-12 bg-gradient-to-b from-white/50 to-transparent"
                animate={{ scaleY: [0, 1, 0], originY: [0, 0, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          </motion.div>

          {/* Feature Section 1 */}
          <div className="absolute top-[150vh] w-full flex justify-end px-8 md:px-32 pointer-events-none z-10">
            <div className="max-w-xl p-6 md:p-10 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-2xl shadow-2xl pointer-events-auto">
              <TextReveal text="Predictive Anomaly Detection" className="text-4xl md:text-6xl font-light mb-6 text-white" />
              <p className="text-lg font-light text-white/60 leading-relaxed">
                Our isolation forest models constantly monitor vessel speed and dwell times. We detect deviations before they cascade into major disruptions, ensuring perfect visibility across your logistics network.
              </p>
            </div>
          </div>

          {/* Feature Section 2 */}
          <div className="absolute top-[300vh] w-full flex justify-start px-8 md:px-32 pointer-events-none z-10">
            <div className="max-w-xl p-6 md:p-10 rounded-3xl bg-black/40 border border-cyan-500/20 backdrop-blur-2xl shadow-[0_0_50px_rgba(6,182,212,0.1)] pointer-events-auto">
              <TextReveal text="Dynamic Route Optimization" className="text-4xl md:text-6xl font-light mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400" />
              <p className="text-lg font-light text-white/70 leading-relaxed mb-8">
                Leverage graph-based intelligence to bypass blocked segments in real-time. Whether it's port congestion or severe weather, RouteXpert dynamically recalibrates your cargo paths.
              </p>
              <MagneticButton className="px-8 py-4 rounded-full bg-white text-black font-medium tracking-wide hover:bg-cyan-50 hover:text-cyan-600 transition-colors duration-500">
                Explore Routing Engine
              </MagneticButton>
            </div>
          </div>

          {/* Route Search Panel (Google Maps Style) */}
          <div className="absolute top-[450vh] w-full flex justify-center px-8 md:px-32 pointer-events-none z-20">
            <div className="relative w-full max-w-6xl h-screen pointer-events-none">
              <RouteSearchPanel isLoggedIn={isLoggedIn} />
            </div>
          </div>

          {/* Global Tracking Section (Moved Above Risk Predictor) */}
          <div className="absolute top-[600vh] w-full flex flex-col items-center justify-center pointer-events-none z-10 px-4 md:px-8">
            <div className="text-center mb-12">
              <TextReveal text="Global Route Visualization" className="text-4xl md:text-6xl font-light mb-4 text-white" />
              <p className="text-lg font-light text-white/60 max-w-2xl mx-auto">
                Watch as RouteXpert orchestrates global logistics in real-time. Our graph algorithms instantly chart the most efficient paths across the oceans.
              </p>
            </div>
            <div className="w-full pointer-events-auto">
              <WorldMap />
            </div>
          </div>

          {/* Interactive ML Section (Moved Below Global Mapping) */}
          <div className="absolute top-[800vh] w-full flex justify-center px-8 md:px-32 pointer-events-none z-10">
            <InteractiveRiskDemo />
          </div>

          {/* Fleet Optimizer Section */}
          <div className="absolute top-[950vh] w-full flex justify-center px-8 md:px-32 pointer-events-none z-10">
            <FleetOptimizer isLoggedIn={isLoggedIn} />
          </div>

          {/* Final Section */}
          <div className="absolute top-[1100vh] w-full h-[100vh] flex flex-col items-center justify-center pointer-events-none z-10 px-4">
            <div className="text-center p-6 md:p-12 max-w-5xl pointer-events-auto bg-black/40 border border-cyan-500/20 backdrop-blur-2xl rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.1)]">
              <TextReveal text="Hyper-Dynamic Route Prediction." className="justify-center text-4xl md:text-7xl font-medium tracking-tighter mb-8 leading-tight drop-shadow-2xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400" />
              <p className="text-lg md:text-xl font-light text-white/70 leading-relaxed mb-10 max-w-3xl mx-auto">
                Predict routes from city-to-city, state-to-state, and country-to-country. RouteXpert anticipates traffic, weather, and bottlenecks, instantly assigning alternate routes. It’s an enterprise-grade navigation engine that outperforms traditional platforms like Google Maps.
              </p>
            </div>
          </div>

          <div id="contact-section" className="absolute top-[1250vh] w-full pb-32 pointer-events-auto z-20">
            <ContactForm />
          </div>

        </div>
      </main>
    </>
  );
}
