'use client';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function Preloader({ isLoaded }: { isLoaded: boolean }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (isLoaded) {
      setTimeout(() => setShow(false), 2000); // Wait for the transition out
    }
  }, [isLoaded]);

  if (!show) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-black"
      initial={{ y: 0 }}
      animate={{ y: isLoaded ? '-100%' : 0 }}
      transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1], delay: 0.5 }}
    >

      <div className="mt-12 w-64 h-[1px] bg-white/10 overflow-hidden relative">
        <motion.div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-500 to-blue-500 w-full"
          initial={{ x: '-100%' }}
          animate={{ x: isLoaded ? '100%' : '-50%' }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />
      </div>
      <motion.div 
        className="absolute bottom-16 text-xs text-white/40 tracking-[0.3em] uppercase"
        animate={{ opacity: [0.2, 0.8, 0.2] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        Initializing RouteXpert ML...
      </motion.div>
    </motion.div>
  );
}
