import React, { useEffect, useState, useRef } from 'react';

export default function MagneticButton({ children, className = '', style = {}, ...props }) {
  const containerRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const checkTouch = () => {
      const touchDevice = window.matchMedia('(pointer: coarse)').matches || 
                          'ontouchstart' in window || 
                          navigator.maxTouchPoints > 0;
      setIsMobile(touchDevice);
    };
    checkTouch();
  }, []);

  const handleMouseMove = (e) => {
    if (isMobile || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const distanceX = e.clientX - centerX;
    const distanceY = e.clientY - centerY;
    const distance = Math.hypot(distanceX, distanceY);

    const magneticArea = 90; // Proximity threshold in pixels

    if (distance < magneticArea) {
      // Pull element towards cursor (elastic strength)
      setTransform({
        x: distanceX * 0.38,
        y: distanceY * 0.38
      });
    } else {
      setTransform({ x: 0, y: 0 });
    }
  };

  const handleMouseLeave = () => {
    setTransform({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        ...style,
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        transition: transform.x === 0 && transform.y === 0 
          ? 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)' 
          : 'transform 0.1s cubic-bezier(0.25, 1, 0.5, 1)',
        display: 'inline-block'
      }}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
}
