import React, { useEffect, useState, useRef } from 'react';
import useReducedMotion from '../hooks/useReducedMotion';

export default function ScrollReveal({ children, className = '', delay = 0, duration = 0.8, threshold = 0.05 }) {
  const [isRevealed, setIsRevealed] = useState(false);
  const elementRef = useRef(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      setIsRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRevealed(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold
      }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      if (elementRef.current) {
        observer.disconnect();
      }
    };
  }, [reducedMotion, threshold]);

  return (
    <div
      ref={elementRef}
      className={className}
      style={{
        opacity: isRevealed ? 1 : 0,
        transform: isRevealed ? 'translate3d(0, 0, 0)' : 'translate3d(0, 30px, 0)',
        transition: reducedMotion 
          ? 'none' 
          : `opacity ${duration}s cubic-bezier(0.215, 0.61, 0.355, 1) ${delay}s, transform ${duration}s cubic-bezier(0.215, 0.61, 0.355, 1) ${delay}s`
      }}
    >
      {children}
    </div>
  );
}
