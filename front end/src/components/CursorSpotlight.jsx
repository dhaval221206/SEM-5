import React, { useEffect, useState, useRef } from 'react';

export default function CursorSpotlight() {
  const [isMobile, setIsMobile] = useState(true);
  const spotlightRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const currentPosRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(null);

  useEffect(() => {
    const checkTouch = () => {
      const touchDevice = window.matchMedia('(pointer: coarse)').matches || 
                          'ontouchstart' in window || 
                          navigator.maxTouchPoints > 0;
      setIsMobile(touchDevice);
    };

    checkTouch();
    window.addEventListener('resize', checkTouch);

    if (isMobile) return;

    // Track cursor relative to the viewport
    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Buttery smooth slide follow using requestAnimationFrame
    const animateSpotlight = () => {
      const ease = 0.07; 
      const targetX = mouseRef.current.x;
      const targetY = mouseRef.current.y;

      currentPosRef.current.x += (targetX - currentPosRef.current.x) * ease;
      currentPosRef.current.y += (targetY - currentPosRef.current.y) * ease;

      if (spotlightRef.current) {
        spotlightRef.current.style.background = `radial-gradient(circle 400px at ${currentPosRef.current.x}px ${currentPosRef.current.y}px, rgba(244, 114, 182, 0.065) 0%, transparent 100%)`;
      }

      rafRef.current = requestAnimationFrame(animateSpotlight);
    };

    rafRef.current = requestAnimationFrame(animateSpotlight);

    return () => {
      window.removeEventListener('resize', checkTouch);
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isMobile]);

  if (isMobile) return null;

  return (
    <div 
      ref={spotlightRef}
      className="cursor-spotlight-overlay"
    />
  );
}
