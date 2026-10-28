/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { SolarWindData, ElectronFluxData } from '../types';
import { Zap, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ForecastChartsProps {
  solarWindHistory: SolarWindData[];
  electronFluxHistory: ElectronFluxData[];
  predictedFluxes: {
    times: string[];
    predictions: number[];
  };
  warningTime: number; // 30, 45, 360 (6h), 720 (12h)
}

export default function ForecastCharts({
  solarWindHistory,
  electronFluxHistory,
  predictedFluxes,
  warningTime,
}: ForecastChartsProps) {
  const [activeTab, setActiveTab] = useState<'flux' | 'solar_wind'>('flux');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const fluxLimit = 100000; // 1e5 is typical threshold for spacecraft anomalies

  // Combine historical electron flux and predictions for unified visualization
  const historicalCount = electronFluxHistory.length;
  const predictionCount = predictedFluxes.predictions.length;
  
  // Normalized drawing dimensions
  const padding = { top: 20, right: 120, bottom: 40, left: 60 };
  const graphWidth = 500;
  const graphHeight = 180;
  const viewBoxWidth = graphWidth + padding.left + padding.right;
  const viewBoxHeight = graphHeight + padding.top + padding.bottom;

  // Find max values for scale calculations
  const maxFluxHistoricalGoes = Math.max(...electronFluxHistory.map(d => d.fluxGoes), 10);
  const maxFluxHistoricalGrasp = Math.max(...electronFluxHistory.map(d => d.fluxGrasp), 10);
  const maxFluxPredicted = Math.max(...predictedFluxes.predictions, 10);
  const maxFluxVal = Math.max(maxFluxHistoricalGoes, maxFluxHistoricalGrasp, maxFluxPredicted, fluxLimit * 1.5);

  const maxVsw = Math.max(...solarWindHistory.map(d => d.Vsw), 400);
  const maxDensity = Math.max(...solarWindHistory.map(d => d.Nsw), 10);
  const minBz = Math.min(...solarWindHistory.map(d => d.Bz), -5);
  const maxBz = Math.max(...solarWindHistory.map(d => d.Bz), 5);
  const absMaxBz = Math.max(Math.abs(minBz), Math.abs(maxBz));

  // 1. ELECTRON FLUX CHART RENDERING HELPERS
  const getFluxX = (index: number, total: number) => {
    return padding.left + (index / (total - 1)) * graphWidth;
  };

  const getFluxY = (fluxVal: number) => {
    // Map log10 space for better visual scientific representation of dynamic particle fluxes (10 to 2,000,000)
    const minLog = 1; // Math.log10(10)
    const maxLog = Math.log10(maxFluxVal);
    const currLog = Math.log10(Math.max(10, fluxVal));
    
    const scale = (currLog - minLog) / (maxLog - minLog);
    return padding.top + (1 - scale) * graphHeight;
  };

  // Convert points to SVG Path strings (GOES uses Cyan, GRASP uses purple/magenta, Predicted uses Orange-500)
  const goesPoints = electronFluxHistory.map((d, idx) => ({
    x: getFluxX(idx, historicalCount + predictionCount),
    y: getFluxY(d.fluxGoes),
  }));

  const graspPoints = electronFluxHistory.map((d, idx) => ({
    x: getFluxX(idx, historicalCount + predictionCount),
    y: getFluxY(d.fluxGrasp),
  }));

  const predictedPoints = predictedFluxes.predictions.map((val, idx) => ({
    x: getFluxX(historicalCount + idx, historicalCount + predictionCount),
    y: getFluxY(val),
  }));

  const createSvgPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return '';
    return `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
  };

  // 2. SOLAR WIND CHART RENDERING HELPERS
  const getSwX = (index: number, total: number) => {
    return padding.left + (index / (total - 1)) * graphWidth;
  };

  const getSwY = (val: number, maxVal: number, minVal = 0) => {
    const scale = (val - minVal) / (maxVal - minVal || 1);
    return padding.top + (1 - scale) * graphHeight;
  };

  const vswPoints = solarWindHistory.map((d, idx) => ({
    x: getSwX(idx, solarWindHistory.length),
    y: getSwY(d.Vsw, maxVsw, 300),
  }));

  const bzPoints = solarWindHistory.map((d, idx) => ({
    x: getSwX(idx, solarWindHistory.length),
    y: getSwY(d.Bz, absMaxBz, -absMaxBz),
  }));

  const thresholdY = getFluxY(fluxLimit);

  // Quick risk calculations of forecasts
  const latestForecastFlux = predictedFluxes.predictions[predictedFluxes.predictions.length - 1] || 100;
  const isAnomalous = latestForecastFlux > fluxLimit;

  return (
    <div className="flex flex-col gap-3 h-full select-none text-slate-300">
      {/* Charts Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex rounded-sm border border-white/10 bg-slate-950/65 p-0.5">
          <button
            onClick={() => setActiveTab('flux')}
            className={`px-3 py-1 text-xs font-mono rounded-sm transition-all cursor-pointer ${
              activeTab === 'flux' 
                ? 'bg-orange-600 text-white font-bold shadow-[0_0_8px_rgba(234,88,12,0.3)]' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Electron Flux (GOES & GSAT)
          </button>
          <button
            onClick={() => setActiveTab('solar_wind')}
            className={`px-3 py-1 text-xs font-mono rounded-sm transition-all cursor-pointer ${
              activeTab === 'solar_wind' 
                ? 'bg-cyan-600 text-white font-bold shadow-[0_0_8px_rgba(8,145,178,0.3)]' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Solar Wind Multi-Drivers
          </button>
        </div>

        {/* Dynamic Warning Card */}
        <div className={`flex items-center gap-2 rounded-sm px-3 py-1 border font-mono text-[10px] ${
          isAnomalous 
            ? 'bg-red-950/40 text-red-400 border-red-500/30 animate-pulse' 
            : 'bg-green-950/15 text-green-400 border-green-500/20'
        }`}>
          {isAnomalous ? (
            <>
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>SEVERE FLUX ALERT: &gt;10^5 pF_thresh breached!</span>
            </>
          ) : (
            <>
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>FLUX SECURITY SYSTEM NOMINAL</span>
            </>
          )}
        </div>
      </div>

      {/* Main Chart Card */}
      <div className="relative rounded-sm border border-white/10 bg-slate-950/25 p-3 overflow-hidden select-none">
        
        {activeTab === 'flux' ? (
          /* Render Flux Visualization */
          <svg viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} className="w-full h-auto block select-none">
            {/* Grid Lines */}
            <line x1={padding.left} y1={padding.top} x2={padding.left + graphWidth} y2={padding.top} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" strokeDasharray="3 3" />
            <line x1={padding.left} y1={padding.top + graphHeight / 2} x2={padding.left + graphWidth} y2={padding.top + graphHeight / 2} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" strokeDasharray="3 3" />
            <line x1={padding.left} y1={padding.top + graphHeight} x2={padding.left + graphWidth} y2={padding.top + graphHeight} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
            
            {/* Anomaly Limit Shaded Zone */}
            <rect 
              x={padding.left} 
              y={padding.top} 
              width={graphWidth} 
              height={Math.max(0, thresholdY - padding.top)} 
              fill="rgba(239, 68, 68, 0.05)" 
            />
            {/* Anomaly Threshold Line */}
            <line 
              x1={padding.left} 
              y1={thresholdY} 
              x2={padding.left + graphWidth} 
              y2={thresholdY} 
              stroke="rgba(239, 68, 68, 0.6)" 
              strokeWidth="1.5" 
              strokeDasharray="4 2" 
            />
            <text 
              x={padding.left + graphWidth - 10} 
              y={thresholdY - 5} 
              fill="#f87171" 
              fontSize="8" 
              textAnchor="end" 
              fontFamily="monospace"
            >
              SPACECRAFT CHARGING RISK BOUNDARY (&gt;10⁵ cm⁻² s⁻¹ sr⁻¹)
            </text>

            {/* Split historical & forecast section */}
            <line 
              x1={getFluxX(historicalCount, historicalCount + predictionCount)} 
              y1={padding.top} 
              x2={getFluxX(historicalCount, historicalCount + predictionCount)} 
              y2={padding.top + graphHeight} 
              stroke="rgba(255, 255, 255, 0.15)" 
              strokeWidth="1" 
              strokeDasharray="2 2" 
            />
            <text 
              x={getFluxX(historicalCount, historicalCount + predictionCount) - 5} 
              y={padding.top + 15} 
              fill="#71717a" 
              fontSize="8" 
              textAnchor="end" 
              fontFamily="monospace"
            >
              HISTORICAL DATA
            </text>
            <text 
              x={getFluxX(historicalCount, historicalCount + predictionCount) + 5} 
              y={padding.top + 15} 
              fill="#f97316" 
              fontSize="8" 
              textAnchor="start" 
              fontFamily="monospace"
              fontWeight="bold"
            >
              {warningTime}-MIN FUT_GRID FORECAST
            </text>

            {/* Plots (Color alignments: cyan for GOES-16, purple for GRASP, orange for PINN prediction) */}
            {/* 1. GOES Historical */}
            <path d={createSvgPath(goesPoints)} fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" />
            
            {/* 2. ISRO GRASP Payload */}
            <path d={createSvgPath(graspPoints)} fill="none" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" />
            
            {/* 3. AI Predictive Forecast Tracker */}
            <path d={createSvgPath(predictedPoints)} fill="none" stroke="#f97316" strokeWidth="2" strokeDasharray="3 1" strokeLinecap="round" />

            {/* Render Axis labels */}
            {/* Y values */}
            <text x={padding.left - 8} y={getFluxY(10)} fill="#64748b" fontSize="8" textAnchor="end" fontFamily="monospace">10¹ (Calm)</text>
            <text x={padding.left - 8} y={getFluxY(1000)} fill="#64748b" fontSize="8" textAnchor="end" fontFamily="monospace">10³</text>
            <text x={padding.left - 8} y={getFluxY(100000)} fill="#cbd5e1" fontSize="8" textAnchor="end" fontFamily="monospace">10⁵ (Alert)</text>
            <text x={padding.left - 8} y={getFluxY(maxFluxVal)} fill="#ef4444" fontSize="8" textAnchor="end" fontFamily="monospace font-bold">10⁶ (Critical)</text>

            {/* Curve Legends (right margin side) */}
            <g transform={`translate(${padding.left + graphWidth + 10}, ${padding.top + 30})`}>
              <circle cx="5" cy="5" r="3" fill="#06b6d4" />
              <text x="15" y="8" fill="#94a3b8" fontSize="9" fontFamily="monospace">GOES-16 (&gt;2 MeV)</text>

              <circle cx="5" cy="20" r="3" fill="#a855f7" />
              <text x="15" y="23" fill="#94a3b8" fontSize="9" fontFamily="monospace">ISRO GSAT GRASP</text>

              <circle cx="5" cy="35" r="3" fill="#f97316" />
              <text x="15" y="38" fill="#f97316" fontSize="9" fontFamily="semibold monospace">PINN AI Forecast</text>
            </g>

            {/* Dynamic interaction line on hover */}
            {hoverIndex !== null && hoverIndex < historicalCount + predictionCount && (
              <>
                <line 
                  x1={getFluxX(hoverIndex, historicalCount + predictionCount)} 
                  y1={padding.top} 
                  x2={getFluxX(hoverIndex, historicalCount + predictionCount)} 
                  y2={padding.top + graphHeight} 
                  stroke="rgba(255, 255, 255, 0.25)" 
                  strokeWidth="1" 
                />
                
                {/* Tooltip Overlay */}
                <foreignObject 
                  x={getFluxX(hoverIndex, historicalCount + predictionCount) > graphWidth / 2 ? padding.left + 20 : padding.left + graphWidth - 160}
                  y={padding.top + 40}
                  width="140"
                  height="75"
                >
                  <div className="bg-slate-950/90 border border-white/15 rounded-sm p-2 font-mono text-[8px] text-white backdrop-blur-md shadow-lg">
                    <div className="text-slate-500 mb-1">T_horizon: {hoverIndex - historicalCount >= 0 ? `+${(hoverIndex - historicalCount)*10}m` : `${(historicalCount - hoverIndex)*10}m ago`}</div>
                    <div className="flex justify-between">
                      <span>GOES Flux:</span>
                      <span className="text-[#06b6d4] font-bold">
                        {hoverIndex < historicalCount 
                          ? electronFluxHistory[hoverIndex]?.fluxGoes.toExponential(2) 
                          : predictedFluxes.predictions[hoverIndex - historicalCount]?.toExponential(2)
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>ISRO GRASP:</span>
                      <span className="text-[#a855f7] font-bold">
                        {hoverIndex < historicalCount 
                          ? electronFluxHistory[hoverIndex]?.fluxGrasp.toExponential(2)
                          : 'N/A'
                        }
                      </span>
                    </div>
                  </div>
                </foreignObject>
              </>
            )}

            {/* Mouse tracking overlay rect */}
            <rect
              x={padding.left}
              y={padding.top}
              width={graphWidth}
              height={graphHeight}
              fill="transparent"
              className="cursor-crosshair"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const index = Math.round((mouseX / rect.width) * (historicalCount + predictionCount - 1));
                setHoverIndex(index);
              }}
              onMouseLeave={() => setHoverIndex(null)}
            />
          </svg>
        ) : (
          /* Render Solar Wind Drivers (Vsw and IMF Bz) (Orange Vsw, Cyan IMF Bz) */
          <svg viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} className="w-full h-auto block">
            {/* Center Equilibrium Bz boundary */}
            <line 
              x1={padding.left} 
              y1={getSwY(0, absMaxBz, -absMaxBz)} 
              x2={padding.left + graphWidth} 
              y2={getSwY(0, absMaxBz, -absMaxBz)} 
              stroke="rgba(255, 255, 255, 0.15)" 
              strokeWidth="0.75" 
            />

            {/* Solar wind curves */}
            <path d={createSvgPath(vswPoints)} fill="none" stroke="#f97316" strokeWidth="1.5" />
            <path d={createSvgPath(bzPoints)} fill="none" stroke="#06b6d4" strokeWidth="1.5" />

            {/* Labels */}
            <text x={padding.left - 8} y={getSwY(maxVsw, maxVsw, 300)} fill="#f97316" fontSize="8" textAnchor="end" fontFamily="monospace">{maxVsw.toFixed(0)} km/s</text>
            <text x={padding.left - 8} y={getSwY(300, maxVsw, 300)} fill="#f97316" fontSize="8" textAnchor="end" fontFamily="monospace">300 km/s</text>
            
            {/* Axis titles */}
            <text x={padding.left + graphWidth + 10} y={padding.top + 30} fill="#f97316" fontSize="9" fontFamily="monospace">Vsw (Solar speed)</text>
            <text x={padding.left + graphWidth + 10} y={padding.top + 45} fill="#06b6d4" fontSize="9" fontFamily="monospace">IMF Bz (nT)</text>
          </svg>
        )}
      </div>
    </div>
  );
}
