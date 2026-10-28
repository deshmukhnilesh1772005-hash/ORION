import React, { useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { SolarWindData, ElectronFluxData } from '../types';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart";
import { AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

interface MultivariateRiskRadarProps {
  currentSolarWind: SolarWindData | null;
  currentElectronFlux: ElectronFluxData | null;
}

const chartConfig = {
  riskScore: {
    label: "Risk Level",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export default function MultivariateRiskRadar({ currentSolarWind, currentElectronFlux }: MultivariateRiskRadarProps) {
  
  const chartData = useMemo(() => {
    if (!currentSolarWind || !currentElectronFlux) return [];

    // Normalize parameters to 0-100% scale for the radar chart
    // Vsw: typical 300 to 1000
    const vswNorm = Math.min(100, Math.max(0, (currentSolarWind.Vsw - 300) / 700 * 100));
    
    // Bz: only southern Bz is dangerous (negative), 0 to -20
    const bzNorm = Math.min(100, Math.max(0, (Math.max(0, -currentSolarWind.Bz)) / 20 * 100));
    
    // Nsw: typical 1 to 50
    const nswNorm = Math.min(100, Math.max(0, currentSolarWind.Nsw / 50 * 100));
    
    // P_dyn: typical 0 to 20
    const pdynNorm = Math.min(100, Math.max(0, currentSolarWind.P_dyn / 20 * 100));
    
    // Kp: 0 to 9
    const kpNorm = Math.min(100, Math.max(0, (currentSolarWind.Kp || 0) / 9 * 100));
    
    // fluxGoes: log space 10^1 to 10^6
    const goesLog = Math.max(1, Math.log10(currentElectronFlux.fluxGoes || 10));
    const goesNorm = Math.min(100, Math.max(0, (goesLog - 1) / 5 * 100));
    
    // fluxGrasp: log space 10^1 to 10^6
    const graspLog = Math.max(1, Math.log10(currentElectronFlux.fluxGrasp || 10));
    const graspNorm = Math.min(100, Math.max(0, (graspLog - 1) / 5 * 100));

    return [
      { metric: "Vsw", riskScore: vswNorm, rawScore: Math.round(vswNorm) },
      { metric: "Bz (South)", riskScore: bzNorm, rawScore: Math.round(bzNorm) },
      { metric: "Density", riskScore: nswNorm, rawScore: Math.round(nswNorm) },
      { metric: "Pressure", riskScore: pdynNorm, rawScore: Math.round(pdynNorm) },
      { metric: "Kp Index", riskScore: kpNorm, rawScore: Math.round(kpNorm) },
      { metric: "GOES Flux", riskScore: goesNorm, rawScore: Math.round(goesNorm) },
      { metric: "GSAT Flux", riskScore: graspNorm, rawScore: Math.round(graspNorm) },
    ];
  }, [currentSolarWind, currentElectronFlux]);

  const maxRisk = useMemo(() => {
    if (chartData.length === 0) return 0;
    return Math.max(...chartData.map(d => d.riskScore));
  }, [chartData]);

  const statusColor = maxRisk > 80 ? '#ef4444' : maxRisk > 50 ? '#f97316' : '#22c55e';
  const statusFill = maxRisk > 80 ? 'rgba(239, 68, 68, 0.4)' : maxRisk > 50 ? 'rgba(249, 115, 22, 0.4)' : 'rgba(34, 197, 94, 0.4)';
  const statusText = maxRisk > 80 ? 'CRITICAL' : maxRisk > 50 ? 'ELEVATED' : 'NOMINAL';
  const StatusIcon = maxRisk > 80 ? AlertTriangle : maxRisk > 50 ? Zap : ShieldCheck;

  if (!chartData.length) {
    return <div className="h-full flex items-center justify-center text-slate-500 font-mono text-sm">Waiting for telemetry...</div>;
  }

  // Update chartConfig dynamically based on risk color
  const dynamicConfig = {
    riskScore: {
      label: "Risk Capacity %",
      color: statusColor,
    }
  } satisfies ChartConfig;

  return (
    <div className="flex flex-col h-full bg-slate-950/25 border border-white/10 p-4 rounded-sm relative shadow-inner">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-mono font-medium tracking-tight text-slate-300">MULTIVARIATE RISK RADAR</h3>
        <div 
          className="flex items-center gap-1.5 font-mono text-[10px] px-2 py-0.5 rounded-sm border"
          style={{
            borderColor: `${statusColor}40`,
            backgroundColor: `${statusColor}15`,
            color: statusColor
          }}
        >
          <StatusIcon className="w-3 h-3" />
          <span>{statusText}</span>
        </div>
      </div>
      
      <div className="flex-1 w-full h-full min-h-[220px]">
        <ChartContainer config={dynamicConfig} className="w-full h-full">
          <RadarChart data={chartData} margin={{ top: 15, right: 15, bottom: 15, left: 15 }}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <PolarGrid className="stroke-white/10" gridType="polygon" />
            <PolarAngleAxis 
              dataKey="metric" 
              tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }} 
            />
            <PolarRadiusAxis 
              angle={30} 
              domain={[0, 100]} 
              tick={{ fill: "#64748b", fontSize: 8, fontFamily: "monospace" }}
              tickCount={5}
            />
            <Radar
              name="Risk Level"
              dataKey="riskScore"
              stroke={statusColor}
              fill={statusFill}
              fillOpacity={0.6}
              strokeWidth={2}
            />
          </RadarChart>
        </ChartContainer>
      </div>

    </div>
  );
}
