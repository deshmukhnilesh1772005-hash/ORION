/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { SatelliteState } from '../types';
import { ShieldCheck, ShieldAlert, Cpu, Radio, RotateCcw, AlertTriangle } from 'lucide-react';

interface AnomalyMonitorProps {
  currentFlux: number;
  r0: number; // Magnetopause standoff
  selectedSatelliteId: string;
  onSatelliteChanged: (id: string) => void;
}

export default function AnomalyMonitor({
  currentFlux,
  r0,
  selectedSatelliteId,
  onSatelliteChanged,
}: AnomalyMonitorProps) {
  const [satellites, setSatellites] = useState<SatelliteState[]>([
    {
      id: 'gsat-31',
      name: 'GSAT-31 (ISRO Broadcast)',
      longitude: 83.0,
      role: 'ISRO_GSAT',
      surfaceChargingVolt: 0,
      deepDielectricCurrent: 0,
      status: 'SAFE',
      instrumentStatus: {
        payload: 'GRASP (Charged Particles)',
        status: 'ONLINE',
      },
    },
    {
      id: 'gsat-30',
      name: 'GSAT-30 (ISRO Communication)',
      longitude: 55.0,
      role: 'ISRO_GSAT',
      surfaceChargingVolt: 0,
      deepDielectricCurrent: 0,
      status: 'SAFE',
      instrumentStatus: {
        payload: 'EPM (Environmental Particles)',
        status: 'ONLINE',
      },
    },
    {
      id: 'goes-16',
      name: 'GOES-16 (NOAA Meteorological)',
      longitude: 285.0, // US West Longitude
      role: 'NOAA_GOES',
      surfaceChargingVolt: 0,
      deepDielectricCurrent: 0,
      status: 'SAFE',
      instrumentStatus: {
        payload: 'SEISS (Flux instrument)',
        status: 'ONLINE',
      },
    },
  ]);

  // Compute dynamical engineering charging models depending on actual particle flux
  useEffect(() => {
    setSatellites((prevList) =>
      prevList.map((sat) => {
        // Core deep-flux calculations
        // Deep Dielectric charging current increases as log flux exceeds 10^3
        let deepCurrent = Math.max(0.1, (Math.log10(currentFlux) - 2.5) * 4.2);
        if (currentFlux < 300) deepCurrent = 0.05;

        // Surface charging voltage drops to high dangerous potential negative volts (-V) if magnetosphere boundary compresses below GEO (6.6 Re)
        let surfaceVolts = 0;
        if (r0 < 6.6) {
          const compressionRatio = (6.6 - r0) / 6.6;
          surfaceVolts = 250 + compressionRatio * 2150; // up to -2400V
        } else {
          // Ambient satellite charging from background flux
          surfaceVolts = Math.max(10, Math.log10(currentFlux) * 45);
        }

        // Apply high frequency noise
        deepCurrent += (Math.random() - 0.5) * 0.25;
        surfaceVolts += (Math.random() - 0.5) * 20;

        deepCurrent = Math.max(0.01, deepCurrent);
        surfaceVolts = Math.max(0, surfaceVolts);

        // Determine critical anomalies
        let status: 'SAFE' | 'WARNING' | 'ANOMALOUS' = 'SAFE';
        let payloadStatus: 'ONLINE' | 'DEGRADED' | 'STANDBY' = 'ONLINE';

        if (deepCurrent > 15 || surfaceVolts > 1500) {
          status = 'ANOMALOUS';
          payloadStatus = 'DEGRADED';
        } else if (deepCurrent > 8 || surfaceVolts > 500) {
          status = 'WARNING';
          payloadStatus = 'STANDBY';
        }

        return {
          ...sat,
          deepDielectricCurrent: parseFloat(deepCurrent.toFixed(2)),
          surfaceChargingVolt: parseFloat(surfaceVolts.toFixed(0)),
          status,
          instrumentStatus: {
            ...sat.instrumentStatus,
            status: payloadStatus,
          },
        };
      })
    );
  }, [currentFlux, r0]);

  const activeSatObj = satellites.find((s) => s.id === selectedSatelliteId) || satellites[0];

  return (
    <div className="flex flex-col gap-4 h-full font-mono text-xs">
      
      {/* Target Spacecraft selector */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Target Geostationary Spacecraft Node</span>
        <div className="grid grid-cols-3 gap-1.5">
          {satellites.map((s) => (
            <button
              key={s.id}
              onClick={() => onSatelliteChanged(s.id)}
              className={`p-2 rounded-md border text-left transition-all cursor-pointer ${
                s.id === selectedSatelliteId
                  ? 'bg-orange-500/15 border-orange-500 font-bold flex flex-col gap-0.5 text-white shadow-[0_0_10px_rgba(249,115,22,0.2)]'
                  : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/8 flex flex-col gap-0.5 text-slate-400'
              }`}
            >
              <span className={s.id === selectedSatelliteId ? 'text-orange-500 font-bold' : 'text-slate-300'}>{s.name.split(' ')[0]}</span>
              <span className="text-[8px] text-slate-500 font-normal">{s.longitude.toFixed(1)}° E Long</span>
              {s.status === 'ANOMALOUS' ? (
                <span className="text-[7px] font-bold text-red-500 animate-pulse mt-0.5">⚠️ DAMAGE_CRIT</span>
              ) : s.status === 'WARNING' ? (
                <span className="text-[7px] font-bold text-amber-500 mt-0.5">⚠️ ELEVATED</span>
              ) : (
                <span className="text-[7px] text-green-400 mt-0.5 font-bold">● ACTIVE_SECURE</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main satellite telemetries */}
      <div className="border border-white/10 rounded-lg p-3 bg-slate-950/20 backdrop-blur-md flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-orange-500 animate-pulse" />
            <span className="font-bold text-white">{activeSatObj.name}</span>
          </div>
          
          <span className={`px-2 py-0.5 rounded-md text-[8px] font-bold uppercase border ${
            activeSatObj.status === 'ANOMALOUS'
              ? 'bg-red-950/30 text-red-400 border-red-500/20 animate-pulse'
              : activeSatObj.status === 'WARNING'
              ? 'bg-amber-950/30 text-amber-400 border-amber-500/20'
              : 'bg-green-950/20 text-green-400 border-green-500/20'
          }`}>
            Status: {activeSatObj.status}
          </span>
        </div>

        {/* Dynamic Telemetry meters */}
        <div className="grid grid-cols-2 gap-4">
          
          {/* Surface ESD build up potential meter */}
          <div className="flex flex-col gap-1 bg-white/5 border border-white/10 p-2 rounded-md">
            <span className="text-[9px] text-slate-400 uppercase font-bold">Surface Electrostatic Potential</span>
            <div className={`text-xl font-bold font-sans tracking-tight text-white`}>
              -{activeSatObj.surfaceChargingVolt} <span className="text-xs text-slate-400 font-normal">Volts</span>
            </div>
            
            {/* Health Bar gauge */}
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mt-1 col-span-2 border border-white/5">
              <div 
                className={`h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(249,115,22,0.4)] ${
                   activeSatObj.surfaceChargingVolt > 1000 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-orange-500'
                }`}
                style={{ width: `${Math.min(100, (activeSatObj.surfaceChargingVolt / 2400) * 100)}%` }}
              />
            </div>
            <span className="text-[8px] text-slate-500 mt-1">Ground potential limit: -1000V</span>
          </div>

          {/* Deep Dielectric Accumulating Current */}
          <div className="flex flex-col gap-1 bg-white/5 border border-white/10 p-2 rounded-md">
            <span className="text-[9px] text-slate-400 uppercase font-bold">Deep-Dielectric Ingress</span>
            <div className={`text-xl font-bold font-sans tracking-tight text-white`}>
              {activeSatObj.deepDielectricCurrent} <span className="text-xs text-slate-400 font-normal">pA/cm²</span>
            </div>
            
            {/* Health Bar gauge */}
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mt-1 col-span-2 border border-white/5">
              <div 
                className={`h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(34,197,94,0.3)] ${
                  activeSatObj.deepDielectricCurrent > 12 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, (activeSatObj.deepDielectricCurrent / 25) * 100)}%` }}
              />
            </div>
            <span className="text-[8px] text-slate-500 mt-1">Telemetry maximum: 10 pA/cm²</span>
          </div>

        </div>

        {/* Instruments status block */}
        <div className="flex items-center justify-between mt-1 text-[10px] text-slate-450 bg-white/5 p-2 rounded-md border border-white/10">
          <div className="flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5 text-slate-400" />
            <span>Telemetry Payload: <strong className="text-white">{activeSatObj.instrumentStatus.payload}</strong></span>
          </div>
          <span className={`font-bold uppercase ${
            activeSatObj.instrumentStatus.status === 'ONLINE' ? 'text-green-400' : 'text-amber-500'
          }`}>{activeSatObj.instrumentStatus.status}</span>
        </div>
      </div>

      {/* Emergency operating alert status */}
      {activeSatObj.status !== 'SAFE' && (
        <div className="p-2.5 rounded-lg border bg-red-950/20 text-red-500 border-red-500/20 animate-pulse text-[10px] leading-relaxed flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <strong>CRITICAL FIELD ENCOUNTER ALERT:</strong> Spatial relativistic flux is creating deep electrostatic breakdown conditions on Geostationary circuits. Recommend triggering local payload standby and charging dissipation grids immediately!
          </div>
        </div>
      )}

    </div>
  );
}
