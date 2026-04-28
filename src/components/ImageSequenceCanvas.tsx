'use client';
import { useEffect, useRef, useState } from 'react';
import { useScroll, useSpring, useMotionValueEvent } from 'framer-motion';

const FRAME_COUNT = 373;

export default function ImageSequenceCanvas({ 
  onLoaded,
  onAutoPlayProgress
}: { 
  onLoaded: () => void;
  onAutoPlayProgress?: (frame: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const autoIndexRef = useRef(0);

  const { scrollYProgress } = useScroll();
  
  // Create that buttery smooth "Apple-like" glide when you stop scrolling
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100, // Increased for faster response
    damping: 30,    // Increased to prevent too much bouncing and settling delay
    restDelta: 0.001
  });

  useEffect(() => {
    const loadedImages: HTMLImageElement[] = [];
    let loadedCount = 0;

    for (let i = 1; i <= FRAME_COUNT; i++) {
      const img = new Image();
      const frameNumber = i.toString().padStart(5, '0');
      img.src = `/frames/${frameNumber}.png`;
      img.onload = () => {
        loadedCount++;
        // Unlock the site instantly after the first 5 frames are loaded
        if (loadedCount === Math.min(5, FRAME_COUNT)) {
          setImages(loadedImages);
          setLoaded(true);
          setIsAutoPlaying(true);
          document.body.style.overflow = 'hidden'; // Lock scroll during logo animation
          onLoaded(); // Tell the preloader we're ready
        }
      };
      loadedImages.push(img);
    }
    
    return () => { document.body.style.overflow = 'auto'; };
  }, [onLoaded]);

  // Handle drawing function
  const drawFrame = (index: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = images[index];
    if (img && img.complete && img.naturalWidth > 0) {
      // Do not set canvas dimensions here to prevent costly layout recalculations
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
  };

  // Auto-play loop for the first 181 frames (logo animation)
  useEffect(() => {
    if (!isAutoPlaying) return;
    
    let animationFrameId: number;
    let lastTime = performance.now();
    const fps = 30; // Control playback speed
    const frameInterval = 1000 / fps;

    const play = (time: number) => {
      const deltaTime = time - lastTime;
      
      if (deltaTime >= frameInterval) {
        if (autoIndexRef.current >= 180) {
          setIsAutoPlaying(false);
          document.body.style.overflow = 'auto'; // Unlock scrolling!
          return; // Done auto-playing
        }
        
        autoIndexRef.current++;
        drawFrame(autoIndexRef.current);
        if (onAutoPlayProgress) {
          onAutoPlayProgress(autoIndexRef.current);
        }
        lastTime = time - (deltaTime % frameInterval);
      }
      animationFrameId = requestAnimationFrame(play);
    };

    animationFrameId = requestAnimationFrame(play);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isAutoPlaying, images]);

  // Handle scroll-based animation for the remaining frames
  useMotionValueEvent(smoothProgress, "change", (latest) => {
    if (!loaded || isAutoPlaying) return;

    // Map scroll progress (0 to 1) to frames 181 -> 372
    const frameIndex = Math.min(
      FRAME_COUNT - 1,
      181 + Math.floor(latest * (FRAME_COUNT - 181))
    );

    drawFrame(frameIndex);
  });

  useEffect(() => {
    if (!loaded) return;
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas && images[0]) {
        canvas.width = window.innerWidth;
        const aspectRatio = images[0].height / images[0].width;
        canvas.height = canvas.width * Math.max(aspectRatio, 0.5);
        
        // Redraw current frame
        let frameIndex = 0;
        if (isAutoPlaying) {
          frameIndex = autoIndexRef.current;
        } else {
          const currentProgress = smoothProgress.get();
          frameIndex = Math.min(
            FRAME_COUNT - 1,
            181 + Math.floor(currentProgress * (FRAME_COUNT - 181))
          );
        }
        drawFrame(frameIndex);
      }
    };
    
    handleResize(); // Initial setup
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [loaded, smoothProgress, images, isAutoPlaying]);

  return (
    <div className="w-full flex justify-center items-center pointer-events-none sticky top-0 h-screen overflow-hidden z-0">
      <canvas 
        ref={canvasRef} 
        className="max-w-full scale-[1.15] md:scale-100 object-cover origin-center opacity-90 drop-shadow-2xl" 
      />
    </div>
  );
}
