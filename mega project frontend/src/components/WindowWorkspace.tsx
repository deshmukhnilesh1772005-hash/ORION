"use client";

import React, { useRef, useCallback, useEffect, useMemo } from "react";
import { motion, useSpring } from "motion/react";

const WAVE_SPRING = { stiffness: 160, damping: 22, mass: 0.6 };
const SCENE_SPRING = { stiffness: 80, damping: 22, mass: 1 };
const Z_SPREAD = 50;
const SIGMA = 2.8;

interface WindowWorkspaceProps {
  windowOrder: string[]; // Order from back to front
  activeWindow: string;
  renderWindow: (id: string, motionStyle: any) => React.ReactNode;
}

export function WindowWorkspace({
  windowOrder,
  activeWindow,
  renderWindow,
}: WindowWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // We want to smoothly track cursor. When not moving, return to center.
  const rotY = useSpring(0, SCENE_SPRING);
  const rotX = useSpring(0, SCENE_SPRING);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const cx = (e.clientX - rect.left) / rect.width;
      const cy = (e.clientY - rect.top) / rect.height;

      // Slight perspective tilt
      // Tilt max +/- 8 degrees
      rotY.set((cx - 0.5) * 16);
      rotX.set((cy - 0.5) * -16);
    },
    [rotY, rotX]
  );

  const handleMouseLeave = useCallback(() => {
    rotY.set(0);
    rotX.set(0);
  }, [rotY, rotX]);

  const total = windowOrder.length;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none"
      style={{ perspective: "1500px", zIndex: 10 }}
    >
      <motion.div
        style={{
          rotateY: rotY,
          rotateX: rotX,
          transformStyle: "preserve-3d",
          position: "relative",
          width: 0,
          height: 0,
        }}
        className="pointer-events-auto"
      >
        {windowOrder.map((id, index) => {
          const isFront = id === activeWindow;
          // Calculate Z position. The active window comes to front.
          // Other windows go slightly back.
          const zIndex = index;
          
          // We use simple CSS transforms over motion springs for layout since it's discrete
          const depth = total - 1 - index;
          const baseZ = depth * -80;
          
          // Fan out background windows so smaller ones are visible
          const translateX = depth * -40; // shift left
          const translateY = depth * -25; // shift up
          const rotateY = depth * -12; // tilt
          const rotateZ = depth * -2; // slight angle

          const motionStyle = {
            transform: `translate3d(calc(-50% + ${translateX}px), calc(-50% + ${translateY}px), ${baseZ}px) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`,
            opacity: isFront ? 1 : Math.max(0.4, 1 - depth * 0.15),
            filter: isFront ? "none" : `blur(${depth * 0.8}px)`,
            transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
            zIndex,
            position: "absolute" as const,
            top: 0,
            left: 0,
          };

          return (
            <div key={id} style={{ transformStyle: "preserve-3d" }}>
              {renderWindow(id, motionStyle)}
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
