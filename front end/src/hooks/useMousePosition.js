import { useState, useEffect } from 'react';

export default function useMousePosition() {
  const [position, setPosition] = useState({ x: 0, y: 0, clientX: 0, clientY: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      // Normalized coordinates: -0.5 to 0.5
      const clientX = (e.clientX / window.innerWidth) - 0.5;
      const clientY = (e.clientY / window.innerHeight) - 0.5;

      setPosition({
        x: e.clientX,
        y: e.clientY,
        clientX,
        clientY
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return position;
}
