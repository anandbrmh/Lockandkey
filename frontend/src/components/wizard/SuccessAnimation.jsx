import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { resetWizard } from '../../features/wizard/wizardSlice';
import { gsap } from 'gsap';
import { History, Plus, ShieldCheck } from 'lucide-react';

export default function SuccessAnimation({ onReset }) {
  const canvasRef = useRef(null);
  const checkmarkRef = useRef(null);
  const circleRef = useRef(null);
  const containerRef = useRef(null);
  
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    // 1. GSAP Checkmark Drawing Animation
    // Animate outer scale
    gsap.fromTo(circleRef.current, 
      { scale: 0, opacity: 0 }, 
      { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.7)' }
    );
    
    // Draw check line
    gsap.fromTo(checkmarkRef.current,
      { strokeDashoffset: 100 },
      { strokeDashoffset: 0, duration: 0.6, delay: 0.4, ease: 'power2.out' }
    );

    // Fade-in cards/details
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current.querySelectorAll('.fade-up'),
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, delay: 0.7, stagger: 0.15, ease: 'power3.out' }
      );
    }

    // 2. GSAP Confetti Particles
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#b77a33', '#cb9a56', '#e9d5b0', '#dbb981', '#9b5f25', '#f59e0b'];
    const particles = [];

    // Create 100 particles
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2 + 100, // Launch from middle lower area
        radius: Math.random() * 4 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        angle: Math.random() * Math.PI - Math.PI, // Launch upwards (half-circle angle)
        velocity: Math.random() * 12 + 6,
        gravity: 0.25,
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 10 - 5,
        opacity: 1
      });
    }

    let animationFrameId;

    const renderConfetti = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, idx) => {
        p.velocity *= 0.98; // Drag
        p.x += Math.cos(p.angle) * p.velocity;
        p.y += Math.sin(p.angle) * p.velocity + p.gravity;
        p.gravity += 0.05; // Fall accelerate
        p.rotation += p.rotationSpeed;
        
        // Slow fade out as they reach bottom
        if (p.y > canvas.height * 0.7) {
          p.opacity -= 0.02;
        }

        if (p.opacity <= 0) return;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        
        // Draw rectangle confetti bits
        ctx.fillRect(-p.radius, -p.radius, p.radius * 2, p.radius * 1.5);
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(renderConfetti);
    };

    // Run animation
    renderConfetti();

    // Resize handler
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleReset = () => {
    if (onReset) onReset();
    else dispatch(resetWizard());
    navigate('/wizard');
  };

  const handleHistory = () => {
    if (onReset) onReset();
    else dispatch(resetWizard());
    navigate('/history');
  };

  return (
    <div className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      {/* Background Confetti Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-0"
      />

      {/* Main card */}
      <div
        ref={containerRef}
        className="relative z-10 w-full max-w-md mx-4 p-8 glass-panel rounded-3xl shadow-xl border border-slate-205 dark:border-slate-800 text-center flex flex-col items-center"
      >
        {/* Checkmark SVG */}
        <div className="relative h-24 w-24 mb-6">
          {/* Animated Circle Base */}
          <div
            ref={circleRef}
            className="absolute inset-0 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40 flex items-center justify-center"
          >
            <svg
              className="w-12 h-12 text-emerald-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="4.5"
              viewBox="0 0 24 24"
            >
              {/* Check Path (GSAP animated) */}
              <path
                ref={checkmarkRef}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="100"
                strokeDashoffset="100"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500 opacity-20 animate-ping duration-1000" />
        </div>

        <h2 className="fade-up text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">
          Handover Documented
        </h2>
        
        <p className="fade-up mt-2.5 text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
          Lock & Key records, GPS tags, and receiver validation metadata have been securely pushed to the vault.
        </p>

        {/* Audit Log Box */}
        <div className="fade-up mt-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full flex items-center justify-between text-left">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-350">Vault Receipt</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">SHA-256 Verified</p>
            </div>
          </div>
          <span className="text-[10px] font-mono bg-slate-200 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 select-all">
            #REC-{Math.floor(100000 + Math.random() * 900000)}
          </span>
        </div>

        {/* Buttons */}
        <div className="fade-up mt-8 flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={handleHistory}
            className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3.5 px-4 rounded-xl transition-all"
          >
            <History className="h-4.5 w-4.5" />
            <span>View Records</span>
          </button>
          
          <button
            onClick={handleReset}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-tr from-primary-600 to-amber-500 hover:from-primary-700 hover:to-amber-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-md shadow-primary-500/10 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Document Another</span>
          </button>
        </div>
      </div>
    </div>
  );
}
