import React, { useEffect, useState, useRef } from 'react';

export default function CustomCursor() {
  const [cursorState, setCursorState] = useState('default'); // 'default' | 'link' | 'image' | 'project' | 'video' | 'drag'
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(true);

  const ringRef = useRef(null);
  const dotRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const ringPosRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(null);

  useEffect(() => {
    // Check if device is mobile or touch-enabled
    const checkTouch = () => {
      const touchDevice = window.matchMedia('(pointer: coarse)').matches || 
                          'ontouchstart' in window || 
                          navigator.maxTouchPoints > 0;
      setIsMobile(touchDevice);
    };

    checkTouch();
    window.addEventListener('resize', checkTouch);

    if (isMobile) return;

    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    const handleMouseEnter = () => {
      setIsVisible(true);
    };

    // Event delegation for hover states
    const handleMouseOver = (e) => {
      const target = e.target.closest('[data-cursor]');
      if (target) {
        const state = target.getAttribute('data-cursor');
        setCursorState(state);
      } else {
        setCursorState('default');
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseover', handleMouseOver);

    // Smooth ring interpolation using requestAnimationFrame
    const animateRing = () => {
      const ease = 0.16; // Interpolation ease speed
      const targetX = mouseRef.current.x;
      const targetY = mouseRef.current.y;

      ringPosRef.current.x += (targetX - ringPosRef.current.x) * ease;
      ringPosRef.current.y += (targetY - ringPosRef.current.y) * ease;

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringPosRef.current.x}px, ${ringPosRef.current.y}px, 0)`;
      }
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
      }

      rafRef.current = requestAnimationFrame(animateRing);
    };

    rafRef.current = requestAnimationFrame(animateRing);

    return () => {
      window.removeEventListener('resize', checkTouch);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseover', handleMouseOver);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isMobile, isVisible]);

  if (isMobile || !isVisible || cursorState === 'hide') return null;

  return (
    <>
      <div 
        ref={dotRef}
        className="custom-cursor-dot"
      />
      <div 
        ref={ringRef}
        className={`custom-cursor-ring cursor-state-${cursorState}`}
      />
    </>
  );
}
