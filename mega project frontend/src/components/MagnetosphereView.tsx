/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import { calculateMagnetopauseRe, calculateDynamicPressure } from '../physics/magnetosphere';
import { Play, Pause, Zap, Compass, RotateCcw } from 'lucide-react';
import { GlobeSatellites } from './GlobeSatellites';

interface MagnetosphereViewProps {
  Bz: number;
  Nsw: number;
  Vsw: number;
  selectedSatelliteLong: number;
}

export default function MagnetosphereView({
  Bz,
  Nsw,
  Vsw,
  selectedSatelliteLong,
}: MagnetosphereViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 580, height: 320 });
  const [isPlaying, setIsPlaying] = useState(true);
  const satelliteAngleRef = useRef(0);

  // Compute physical state parameters
  const P_dyn = calculateDynamicPressure(Nsw, Vsw);
  const r0 = calculateMagnetopauseRe(Bz, P_dyn);
  const boundaryCompressedPastGEO = r0 < 6.6;

  useEffect(() => {
    let animationId: number;
    let particleOffset = 0;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      
      const currentRePx = Math.max(12, height / 25);
      const cx = width / 2 + 50;
      const cy = height / 2;
      // Clean canvas
      ctx.clearRect(0, 0, width, height);

      // Radar rings & polar coordinate grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      const center = { x: cx, y: cy }; 
      
      for (let r = Math.floor(currentRePx * 2); r < Math.max(width, height); r += Math.floor(currentRePx * 2)) {
        ctx.beginPath();
        ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // X/Y Axis
      ctx.beginPath();
      ctx.moveTo(0, center.y);
      ctx.lineTo(width, center.y);
      ctx.moveTo(center.x, 0);
      ctx.lineTo(center.x, height);
      ctx.strokeStyle = 'rgba(64, 64, 64, 0.15)';
      ctx.stroke();

      // Draw Earth (radius mapping: 1 Re = currentRePx pixels)
      const rePx = currentRePx;

      // Draw Outer and Inner Van Allen Belts (torus cross sections)
      // Inner Zone (approx 1.5 - 2 Re)
      const innerBeltGrad = ctx.createRadialGradient(
        center.x, center.y, 1.2 * rePx,
        center.x, center.y, 2.8 * rePx
      );
      innerBeltGrad.addColorStop(0, 'rgba(56, 189, 248, 0.05)');
      innerBeltGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.2)');
      innerBeltGrad.addColorStop(1, 'rgba(56, 189, 248, 0.05)');
      ctx.fillStyle = innerBeltGrad;
      ctx.beginPath();
      ctx.arc(center.x, center.y, 2.8 * rePx, 0, Math.PI * 2);
      ctx.arc(center.x, center.y, 1.2 * rePx, 0, Math.PI * 2, true);
      ctx.fill();

      // Outer Belt (approx 3.5 - 7 Re, dynamic with solar wind)
      // Expanding/shrinking depending on solar wind speed and magnetotail injections
      const outerBeltGrad = ctx.createRadialGradient(
        center.x, center.y, 3.5 * rePx,
        center.x, center.y, 7.5 * rePx
      );
      const beltHue = activeBeltColor(Vsw, Bz);
      outerBeltGrad.addColorStop(0, `rgba(${beltHue}, 0.02)`);
      outerBeltGrad.addColorStop(0.5, `rgba(${beltHue}, ${0.1 + Math.abs(Bz)*0.01 + Vsw*0.0002})`);
      outerBeltGrad.addColorStop(1, `rgba(${beltHue}, 0.02)`);
      ctx.fillStyle = outerBeltGrad;
      ctx.beginPath();
      ctx.arc(center.x, center.y, 7.5 * rePx, 0, Math.PI * 2);
      ctx.arc(center.x, center.y, 3.5 * rePx, 0, Math.PI * 2, true);
      ctx.fill();

      // Draw Solar Wind stream particles (from left to right)
      if (isPlaying) {
        particleOffset = (particleOffset + Vsw / 100) % 150;
      }
      ctx.fillStyle = 'rgba(249, 115, 22, 0.2)';
      for (let py = 10; py < height; py += 30) {
        // Particles deflect around the magnetopause standoff boundary
        for (let px = particleOffset - 150; px < width; px += 150) {
          const dx = px - center.x;
          const dy = py - center.y;
          const dist = Math.sqrt(dx * dx + dy * dy) / rePx;
          
          let drawX = px;
          let drawY = py;

          // If solar wind particle approaches the magnetopause boundary r0, deflect it
          if (dx < 0 && dist < r0 + 1) {
            const angle = Math.atan2(dy, dx);
            const rDeflection = (r0 + 1.5) * rePx;
            drawX = center.x + Math.cos(angle) * rDeflection;
            drawY = center.y + Math.sin(angle) * rDeflection;
          }
          
          ctx.beginPath();
          ctx.arc(drawX, drawY, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw Magnetopause Standoff Boundary r0 (using physics-derived equation)
      // Sub-solar standoff points on left (positive x in space coordinates, left side of canvas due to sun offset)
      ctx.beginPath();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = boundaryCompressedPastGEO 
        ? 'rgba(239, 68, 68, 0.85)' // CRITICAL RED COMPRESSION
        : 'rgba(249, 115, 22, 0.7)'; // COHERENT ORANGE BOUNDARY

      // Draw theoretical magnetopause boundary curve
      const steps = 180;
      for (let i = -steps / 2; i <= steps / 2; i++) {
        const theta = (i * Math.PI) / steps;
        // Radial distance r = r0 * (2 / (1 + cos(theta)))^alpha (simple paraboloid magnetopause)
        // Shue formula parameterization: alpha = 0.5 + 0.1 * Bz
        const alpha = 0.5 + 0.05 * Bz;
        const r_curve = r0 * Math.pow(2 / (1 + Math.cos(theta)), alpha);
        
        // Convert to canvas space (drawing from left sunwards side, so X component is negative-ward relative to offset)
        const canvasRadius = Math.min(60, r_curve) * rePx;
        const x_curve = center.x - canvasRadius * Math.cos(theta);
        const y_curve = center.y + canvasRadius * Math.sin(theta);

        if (i === -steps / 2) {
          ctx.moveTo(x_curve, y_curve);
        } else {
          ctx.lineTo(x_curve, y_curve);
        }
      }
      ctx.stroke();

      // Earth body is now rendered via GlobeSatellites overlay HTML

      // Draw Geostationary Orbit Track (GEO = 6.6 Re = 79.2 px)
      ctx.strokeStyle = 'rgba(115, 115, 115, 0.25)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(center.x, center.y, 6.6 * rePx, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash

      // Satellite Positions: Rotation Animation
      if (isPlaying) {
        satelliteAngleRef.current = (satelliteAngleRef.current + 0.015) % (Math.PI * 2);
      }

      // 1. ISRO GSAT Spacecraft at selected Indian Longitude
      // Translate longitude degrees to radian orbit offset
      const graspRadOffset = (selectedSatelliteLong * Math.PI) / 180;
      const graspAngle = graspRadOffset + satelliteAngleRef.current;
      const graspX = center.x + 6.6 * rePx * Math.cos(graspAngle);
      const graspY = center.y + 6.6 * rePx * Math.sin(graspAngle);

      // 2. NOAA GOES Spacecraft at US Longitude (approx -75° West / ~285°)
      const goesAngle = (285 * Math.PI) / 180 + satelliteAngleRef.current;
      const goesX = center.x + 6.6 * rePx * Math.cos(goesAngle);
      const goesY = center.y + 6.6 * rePx * Math.sin(goesAngle);

      // Draw GSAT Satellite Icon
      ctx.fillStyle = '#f97316'; // Orange ISRO theme
      ctx.beginPath();
      ctx.arc(graspX, graspY, 4, 0, Math.PI * 2);
      ctx.fill();
      // Solar wings indicators
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(graspX - 8, graspY);
      ctx.lineTo(graspX + 8, graspY);
      ctx.stroke();
      
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`ISRO GSAT-31 (~${selectedSatelliteLong}°E)`, graspX + 10, graspY + 3);

      // Draw GOES Satellite Icon
      ctx.fillStyle = '#06b6d4'; // Cyan NOAA/GOES icon
      ctx.beginPath();
      ctx.arc(goesX, goesY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#06b6d4';
      ctx.beginPath();
      ctx.moveTo(goesX - 8, goesY);
      ctx.lineTo(goesX + 8, goesY);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px monospace';
      ctx.fillText('NOAA GOES-16', goesX + 10, goesY + 3);

      // Display Real-Time Physics Overlay Legend
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`MAGNETOSPHERE TELEMETRY`, 15, 25);
      
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText(`Mgn-Pause (r0): ${r0.toFixed(2)} Re`, 15, 45);
      ctx.fillText(`GEO Orbit Limit: 6.60 Re`, 15, 60);
      ctx.fillText(`Dynamic Pdyn   : ${P_dyn.toFixed(2)} nPa`, 15, 75);
      ctx.fillText(`Solar Wind Vel : ${Math.abs(Vsw)} km/s`, 15, 90);
      ctx.fillText(`Plasma Density : ${Nsw.toFixed(1)} p/cm³`, 15, 105);
      ctx.fillText(`IMF Bz         : ${Bz > 0 ? '+' : ''}${Bz.toFixed(1)} nT`, 15, 120);
      
      if (boundaryCompressedPastGEO) {
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('⚠️ CRITICAL: SHOCK COMPRESSED PAST GEO', 15, 140);
        ctx.fillStyle = '#f87171';
        ctx.font = '10px monospace';
        ctx.fillText('Geo-Satellites exposed to stellar wind!', 15, 155);
      } else {
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('🛡️ NOMINAL: SHIELD INTACT', 15, 140);
      }

      // Compass Rose
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.beginPath();
      ctx.arc(width - 50, height - 50, 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Bz', width - 56, height - 76);
      ctx.fillText('S', width - 53, height - 20);
      
      // Draw magnetic vector arrow for IMF Bz field
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = Bz < 0 ? '#ef4444' : '#22c55e';
      ctx.beginPath();
      ctx.moveTo(width - 50, height - 50);
      ctx.lineTo(width - 50, height - 50 + (Bz > 0 ? -16 : (Bz < 0 ? 16 : 0)));
      ctx.stroke();

      if (isPlaying) {
        animationId = requestAnimationFrame(render);
      }
    };

    const handleResize = () => {
      if (containerRef.current && canvas) {
        const { clientWidth, clientHeight } = containerRef.current;
        if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
          canvas.width = clientWidth;
          canvas.height = clientHeight;
          setDimensions({ width: clientWidth, height: clientHeight });
          if (!isPlaying) {
            requestAnimationFrame(render);
          }
        }
      }
    };
    
    // Initial size
    handleResize();
    
    const ro = new ResizeObserver(handleResize);
    if (containerRef.current) ro.observe(containerRef.current);

    render();

    return () => {
      ro.disconnect();
      cancelAnimationFrame(animationId);
    };
  }, [Bz, Nsw, Vsw, isPlaying, selectedSatelliteLong, boundaryCompressedPastGEO, r0]);

  // Color generator for radiation belt depending on physical activity
  const activeBeltColor = (Vsw: number, Bz: number): string => {
    // High wind (orange/red/purple excitation) vs Calm status (cool blue)
    if (Vsw > 650 || Bz < -8) {
      return '239, 68, 68'; // Intense anomalous Orange-Red (239, 68, 68)
    }
    if (Vsw > 480 || Bz < -2) {
      return '245, 158, 11'; // Moderate Orange (245, 158, 11)
    }
    return '56, 189, 248'; // Calm electromagnetic Blue-Cyan (56, 189, 248)
  };

  const currentRePx = Math.max(24, dimensions.height / 12);
  const globeSize = currentRePx * 3.5;
  const globeLeft = dimensions.width / 2 + 50;
  
  const markers = useMemo(() => [
    { id: "sat-1", location: [10, selectedSatelliteLong] as [number, number] },
    { id: "sat-2", location: [0, 285] as [number, number] }
  ], [selectedSatelliteLong]);

  return (
    <div className="flex flex-col gap-2 h-full">
      <div ref={containerRef} className="relative flex-1 rounded-sm border border-white/10 bg-[#04060d] overflow-hidden">
        
        {/* The interactive 3D Globe at the center replacing earth */}
        <div 
          className="absolute z-10 pointer-events-auto transform -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${globeLeft}px`,
            top: '50%',
            width: `${globeSize}px`,
            height: `${globeSize}px`
          }}
        >
          <GlobeSatellites 
            speed={isPlaying ? 0.005 : 0} 
            className="w-full h-full"
            markers={markers}
          />
        </div>

        <canvas
          ref={canvasRef}
          className="w-full h-full block absolute inset-0 z-20 pointer-events-none"
        />
        
        {/* Playback Controls and Status overlays */}
        <div className="absolute bottom-3 left-3 flex gap-1.5 bg-slate-950/80 p-1.5 rounded-sm border border-white/12 backdrop-blur-sm">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1 rounded-sm hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            title={isPlaying ? "Pause Simulation" : "Run Simulation"}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            onClick={() => { satelliteAngleRef.current = 0; }}
            className="p-1 rounded-sm hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Reset Coordinates"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        <div className="absolute top-3 right-3 flex flex-col gap-1 text-right text-[10px] font-mono text-slate-400/80">
          <div>Solar dynamic pressure: {P_dyn.toFixed(3)} nPa</div>
          <div>Sun direction: Left &mdash;&gt; Right</div>
          <div className="flex items-center justify-end gap-1 text-slate-400">
            <Zap className="h-3 w-3 text-orange-500 animate-pulse" />
            <span>MHD Wave Expansion Rate: {(Vsw/50).toFixed(1)} km/s_eff</span>
          </div>
        </div>
      </div>
    </div>
  );
}
