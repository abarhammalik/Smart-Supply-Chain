'use client';
import { useEffect, useRef } from 'react';

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: { x: number; y: number; radius: number; vx: number; vy: number; alpha: number; hue: number }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const particleCount = Math.floor((window.innerWidth * window.innerHeight) / 7000);
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 8 + 2, // Larger, more bubble-like
          vx: (Math.random() - 0.5) * 0.2,
          vy: Math.random() * -0.5 - 0.1, // Float upwards
          alpha: Math.random() * 0.4 + 0.1,
          hue: Math.random() * 40 + 180, // Cyan to blue hue range
        });
      }
    };

    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw
      particles.forEach((p) => {
        // Wobbly motion
        p.x += Math.sin(p.y * 0.01) * 0.5 + p.vx;
        p.y += p.vy;

        if (p.x < -20) p.x = canvas.width + 20;
        if (p.x > canvas.width + 20) p.x = -20;
        if (p.y < -20) {
          p.y = canvas.height + 20;
          p.x = Math.random() * canvas.width;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        
        // Gradient for a 3D bubble/droplet effect
        const gradient = ctx.createRadialGradient(p.x - p.radius*0.3, p.y - p.radius*0.3, 0, p.x, p.y, p.radius);
        gradient.addColorStop(0, `hsla(${p.hue}, 100%, 80%, ${p.alpha + 0.2})`);
        gradient.addColorStop(1, `hsla(${p.hue}, 100%, 60%, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(drawParticles);
    };

    window.addEventListener('resize', resize);
    resize();
    drawParticles();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-b from-[#00050a] via-[#010a14] to-[#021020]" />
      <canvas
        ref={canvasRef}
        className="w-full h-full opacity-80 mix-blend-screen filter blur-[1px]"
      />
    </div>
  );
}
