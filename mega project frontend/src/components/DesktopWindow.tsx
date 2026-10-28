/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Minimize2, Maximize2, ShieldAlert } from 'lucide-react';

interface DesktopWindowProps {
  id: string;
  title: string;
  onClose?: () => void;
  onMinimize?: () => void;
  isMinimized?: boolean;
  isActive?: boolean;
  onFocus?: () => void;
  defaultPosition?: { x: number; y: number };
  defaultSize?: { width: number; height: number };
  children: React.ReactNode;
  motionStyle?: React.CSSProperties;
}

export default function DesktopWindow({
  id,
  title,
  onClose,
  onMinimize,
  isMinimized = false,
  isActive = false,
  onFocus,
  defaultPosition = { x: 50, y: 50 },
  defaultSize = { width: 500, height: 400 },
  children,
  motionStyle,
}: DesktopWindowProps) {
  const [position, setPosition] = useState(defaultPosition);
  const [size, setSize] = useState(defaultSize);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  if (isMinimized) return null;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMaximized) return;
    onFocus?.();
    
    // Check if the click happened on the header title or handle, not a button
    const target = e.target as HTMLElement;
    if (target.closest('.window-control-btn') || motionStyle) return;

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
    
    // Set pointer capture to receive events even if the pointer moves outside the window
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || motionStyle) return;
    
    // Clamp coordinates to prevent dragging completely out of screen bounds
    const newX = Math.max(0, Math.min(window.innerWidth - 150, e.clientX - dragOffset.x));
    const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.y));
    
    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const windowContent = (
    <div
      id={`desktop-window-${id}`}
      onPointerDown={() => onFocus?.()}
      className={`absolute flex flex-col rounded-xl border backdrop-blur-xl -webkit-backdrop-blur-xl shadow-2xl transition-colors duration-150 ${
        isActive 
          ? 'bg-slate-950/30 border-orange-500/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),_0_8px_32px_rgba(0,0,0,0.5)] z-30' 
          : 'bg-slate-950/20 border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),_0_8px_32px_rgba(0,0,0,0.5)] z-20 hover:bg-slate-950/30 hover:border-white/20'
      } ${motionStyle ? '' : 'transition-all'} pointer-events-auto`}
      style={{
        width: isMaximized ? '100%' : `${size.width}px`,
        height: isMaximized ? '100%' : `${size.height}px`,
        ...(isMaximized ? {
          left: 0,
          top: 0,
          transform: 'none',
          position: 'absolute',
          zIndex: 9999,
          filter: 'none',
          opacity: 1
        } : {
          left: motionStyle ? undefined : `${position.x}px`,
          top: motionStyle ? undefined : `${position.y}px`,
          ...motionStyle,
        })
      }}
    >
      {/* Window Header */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`flex h-11 select-none items-center justify-between rounded-t-xl px-4 font-display text-[12px] font-bold uppercase tracking-[0.15em] cursor-move border-b transition-colors duration-150 ${
          isActive 
            ? 'bg-slate-900/80 text-slate-100 border-white/10' 
            : 'bg-slate-950/40 text-slate-500 border-white/5'
        }`}
      >
        <div className="flex items-center gap-2 select-none">
          <span className={`w-1.5 h-1.5 rounded-full shadow-sm ${isActive ? 'bg-orange-500 shadow-orange-500/50 animate-pulse' : 'bg-slate-700'}`} />
          <span>{title}</span>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center gap-1.5">
          {onMinimize && (
            <button
              onClick={(e) => { e.stopPropagation(); onMinimize(); }}
              className="window-control-btn rounded-sm p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
              title="Minimize to Dock"
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setIsMaximized(!isMaximized); }}
            className="window-control-btn rounded-sm p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
            title={isMaximized ? "Restore Window" : "Maximize Window"}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          {onClose && (
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="window-control-btn rounded-sm p-1.5 hover:bg-red-950/40 text-red-400 hover:text-red-200 transition-colors"
              title="Close Panel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Window Body */}
      <div className="flex-1 overflow-auto p-4 custom-scrollbar select-text text-slate-300">
        {children}
      </div>
    </div>
  );

  if (isMaximized) {
    const portalElement = document.getElementById('maximized-window-portal');
    if (portalElement) {
      return createPortal(windowContent, portalElement);
    }
  }

  return windowContent;
}
