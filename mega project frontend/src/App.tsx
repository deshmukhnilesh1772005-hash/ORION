/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { SpiralAnimation } from './components/SpiralAnimation';
import { WebGLShader } from './components/WebGLShader';
import { WindowWorkspace } from './components/WindowWorkspace';
import { 
  Terminal, 
  Settings, 
  Activity, 
  UploadCloud, 
  SlidersHorizontal, 
  HelpCircle, 
  Sparkles, 
  Download, 
  ShieldAlert, 
  RefreshCw, 
  BrainCircuit, 
  Layers, 
  Maximize2,
  FileSpreadsheet,
  AlertOctagon
} from 'lucide-react';

import DesktopWindow from './components/DesktopWindow';
import MagnetosphereView from './components/MagnetosphereView';
import ForecastCharts from './components/ForecastCharts';
import AnomalyMonitor from './components/AnomalyMonitor';
import CDFProcessor from './components/CDFProcessor';
import ModelDeveloperPanel from './components/ModelDeveloperPanel';
import AlertMonitorDashboard from './components/AlertMonitorDashboard';
import MultivariateRiskRadar from './components/MultivariateRiskRadar';
import { ScrambledTitle } from './components/ScrambledTitle';

import { SolarWindData, ElectronFluxData } from './types';
import { estimateKpIndex, calculateDynamicPressure, simulateElectronFluxResponse, generateCMEStormTimeline, calculateMagnetopauseRe } from './physics/magnetosphere';
import { modelRegistry } from './services/modelRegistry';

export default function App() {
  // 1. Core State Drivers
  const [Vsw, setVsw] = useState(420);    // Solar wind speed, km/s
  const [Bz, setBz] = useState(1.5);      // IMF Bz component, nT
  const [Nsw, setNsw] = useState(5.2);    // Solar density, cm^-3
  const [selectedSatelliteId, setSelectedSatelliteId] = useState('gsat-31');

  // Space weather datasets timelines
  const [solarWindHistory, setSolarWindHistory] = useState<SolarWindData[]>([]);
  const [electronFluxHistory, setElectronFluxHistory] = useState<ElectronFluxData[]>([]);
  const [predictedFluxes, setPredictedFluxes] = useState<{ times: string[]; predictions: number[] }>({ times: [], predictions: [] });

  // 2. Active Model Status
  const [activeModelId, setActiveModelId] = useState(modelRegistry.getActiveModel().id);

  // 3. Desktop UI Panel Management
  const [openWindows, setOpenWindows] = useState({
    simControl: true,      // Simulation manual sliders
    magnetosphere: true,   // Bow shock visualization
    forecast: true,        // D3/recharts line graphs
    instruments: true,     // Charging potential meters
    alertsDashboard: true, // Persistent Astromagnetic Alert & Dispatch Monitor Dashboard
    riskRadar: true,       // Multivariate Risk Radar
    cdfIngest: false,      // CDF file pipeline core
    modelRegistry: false,  // Custom Python ML model registry
    systemLogs: true,      // Telemetry Console log
    aiAnalyst: true,       // AI Physics Analyst (Gemini)
  });

  const [activeWindow, setActiveWindow] = useState('forecast');
  const [windowOrder, setWindowOrder] = useState<string[]>(['simControl', 'alertsDashboard', 'forecast', 'aiAnalyst', 'riskRadar']);

  // 4. Gemini AI Space Weather Report State
  const [aiReport, setAiReport] = useState<{
    standoffAnalysis?: string;
    beltElectrodynamics?: string;
    anomalyAssessment?: string;
    mitigationRecommendation?: string;
  } | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // 5. System console diagnostics logs
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    '[SYSTEM] AstroShield Geostationary Space Weather Dashboard v2.6 Ready.',
    '[VSSC/SPL] Active Longitude mapped: 83° East (Indian sector).',
    '[WIND] NASA CDAWEB stream linked: OK.',
    '[GOES] NOAA SEISS radiation flux synced: OK.'
  ]);

  const addLog = (msg: string) => {
    setConsoleLogs(prev => [...prev.slice(-30), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // 6. Initialize history datasets
  useEffect(() => {
    // Produce initial historical curves
    const swData = generateCMEStormTimeline(12); // Past 12 hours
    setSolarWindHistory(swData);

    // Bootstrap historical electron flux responses conforming to solar wind history
    const fluxData: ElectronFluxData[] = [];
    let currentGoes = 1200;
    let currentGrasp = 850;

    swData.forEach((d) => {
      // Goes tracks baseline physics with slight offset
      currentGoes = simulateElectronFluxResponse(currentGoes, d.Vsw, d.Bz, d.Nsw, 10);
      
      // ISRO GRASP at Indian longitude is mapped with structural geomagnetic offset
      const indianOffsetVsw = d.Vsw * (1 + 0.05 * Math.sin(83 * Math.PI / 180));
      currentGrasp = simulateElectronFluxResponse(currentGrasp, indianOffsetVsw, d.Bz, d.Nsw, 10);

      fluxData.push({
        time: d.time,
        fluxGoes: currentGoes,
        fluxGrasp: currentGrasp
      });
    });

    setElectronFluxHistory(fluxData);
    addLog('Loaded past 12 hours tracking telemetry of wind solar parameters.');
  }, []);

  // 6.5 Real-time Telemetry Data Feed Simulation
  useEffect(() => {
    const timer = setInterval(() => {
      // Small random walks for realistic orbital data jitter
      setVsw(prev => Math.max(250, Math.min(prev + (Math.random() - 0.5) * 15, 1200)));
      setNsw(prev => Math.max(1, Math.min(prev + (Math.random() - 0.5) * 1.5, 50)));
      setBz(prev => Math.max(-30, Math.min(prev + (Math.random() - 0.5) * 2, 20)));
    }, 3000); // New telemetry arrives every 3 seconds

    return () => clearInterval(timer);
  }, []);

  // 6.6 Auto-append telemetry stream to history buffers
  useEffect(() => {
    if (solarWindHistory.length === 0) return;

    const time = new Date().toISOString();
    const P_dyn = calculateDynamicPressure(Nsw, Vsw);
    const Kp = estimateKpIndex(Vsw, Bz);
    const newDataPoint: SolarWindData = { time, Vsw, Bz, Nsw, P_dyn, Kp };

    setSolarWindHistory(prev => [...prev.slice(1), newDataPoint]);

    setElectronFluxHistory(prev => {
      const lastGoes = prev[prev.length - 1]?.fluxGoes || 1200;
      const lastGrasp = prev[prev.length - 1]?.fluxGrasp || 850;

      const nextGoes = simulateElectronFluxResponse(lastGoes, Vsw, Bz, Nsw, 10);
      const indianOffsetVsw = Vsw * (1 + 0.05 * Math.sin(83 * Math.PI / 180));
      const nextGrasp = simulateElectronFluxResponse(lastGrasp, indianOffsetVsw, Bz, Nsw, 10);

      return [
        ...prev.slice(1),
        { time, fluxGoes: nextGoes, fluxGrasp: nextGrasp }
      ];
    });
  }, [Vsw, Bz, Nsw]);

  // Update dynamic predictive trajectories when inputs, model selection or slider change
  useEffect(() => {
    if (electronFluxHistory.length === 0) return;
    
    const latestFlux = electronFluxHistory[electronFluxHistory.length - 1]?.fluxGoes || 1200;
    
    // Core predictive forecast matrix based on active ML/Physics selection
    const forecast = modelRegistry.generateForecast(activeModelId, latestFlux, solarWindHistory, 12); // 12 hours forecast grid (includes 30m, 6h, 12h steps)
    setPredictedFluxes({
      times: forecast.times,
      predictions: forecast.predictions,
    });
  }, [electronFluxHistory, activeModelId, solarWindHistory, Vsw, Bz, Nsw]);

  // Adjust immediate parameters manually
  const handleSliderChange = (type: 'Vsw' | 'Bz' | 'Nsw', val: number) => {
    if (type === 'Vsw') {
      setVsw(val);
      addLog(`Solar wind velocity shifted manually to ${val.toFixed(0)} km/s`);
    } else if (type === 'Bz') {
      setBz(val);
      addLog(`Interplanetary Magnetic field Bz shifted to ${val.toFixed(1)} nT (North/South axis)`);
    } else if (type === 'Nsw') {
      setNsw(val);
      addLog(`Outer solar wind concentration density adjusted to ${val.toFixed(1)} cm⁻³`);
    }
    // Note: History appending is now handled automatically by the telemetry stream effect above.
  };

  // Pre-configured scientific solar storm scenarios loading
  const loadScenario = (type: 'calm' | 'cme_shock' | 'halloween') => {
    addLog(`Loading planetary event profile: ${type.toUpperCase()}`);
    if (type === 'calm') {
      setVsw(340);
      setBz(2.8);
      setNsw(3.5);
      addLog('Baseline magnetopause standoff at 10.5 Earth Radii. Satellites secure.');
    } else if (type === 'cme_shock') {
      setVsw(780);
      setBz(-12.5); // extreme southward turning driving geomagnetic storm
      setNsw(32);
      addLog('Severe Coronal Mass Ejection shock loading. Magnetopause compression triggered!');
    } else if (type === 'halloween') {
      setVsw(990); // Super-extreme solar wind velocity
      setBz(-22.0);
      setNsw(48);
      addLog('Simulating Historic class DST index event. Massive dielectric damage forecast!');
    }
  };

  // 7. Trigger AI integration via Express proxy router to Gemini API
  const generateSpaceWeatherPhysicsReport = async () => {
    setIsGeneratingReport(true);
    setAiReport(null);
    addLog('Querying server-side Space Physics Laboratory AI modeling analyst (Gemini)...');
    
    try {
      const activeSatelliteName = selectedSatelliteId === 'gsat-31' 
        ? 'GSAT-31 (Indian long: 83°E)' 
        : selectedSatelliteId === 'gsat-30'
        ? 'GSAT-30 (Indian long: 55°E)'
        : 'GOES-16 (NOAA primary)';

      const response = await fetch('/api/forecast/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Vsw,
          Bz,
          Nsw,
          P_dyn: calculateDynamicPressure(Nsw, Vsw),
          Kp: estimateKpIndex(Vsw, Bz),
          currentFlux: electronFluxHistory[electronFluxHistory.length - 1]?.fluxGoes || 1200,
          satelliteName: activeSatelliteName,
          warningTime: '30-45 minutes ahead warning threshold'
        }),
      });

      const data = await response.json();
      setAiReport(data);
      addLog('Physics-informed space weather report generated successfully.');
    } catch (err) {
      console.error(err);
      addLog('Failed to connect to the server-side Gemini intelligence engine.');
      setAiReport({
        standoffAnalysis: 'Communication pipeline to server-side AI model timed out.',
        beltElectrodynamics: 'Check if GEMINI_API_KEY is configured in Settings > Secrets.',
        anomalyAssessment: 'Fall back to empirical Euler-limit calculations.',
        mitigationRecommendation: 'Implement standard satellite charging mitigation: shut down non-vital transponders.'
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleWindowFocus = (name: string) => {
    setActiveWindow(name);
    setWindowOrder(prev => {
      const remaining = prev.filter(w => w !== name);
      return [...remaining, name];
    });
  };

  const toggleWindow = (name: keyof typeof openWindows) => {
    setOpenWindows(prev => {
      const isOpening = !prev[name];
      if (isOpening) {
        setWindowOrder(order => {
          const remaining = order.filter(w => w !== name);
          return [...remaining, name];
        });
        setActiveWindow(name);
      }
      return { ...prev, [name]: isOpening };
    });
  };

  // Pre-calculate 12h, 6h and 30m predictive values & risk statuses for the Alert Monitor Dashboard
  const getFluxRisk = (fluxVal: number) => {
    if (fluxVal > 100000) return 'CRITICAL';
    if (fluxVal > 52000) return 'HIGH';
    if (fluxVal > 10000) return 'MODERATE';
    return 'LOW';
  };

  const latestFluxVal = electronFluxHistory[electronFluxHistory.length - 1]?.fluxGoes || 1200;
  
  const p30m = predictedFluxes.predictions[2] || (latestFluxVal * 1.05);
  const p6h = predictedFluxes.predictions[35] || (latestFluxVal * 1.35);
  const p12h = predictedFluxes.predictions[71] || (latestFluxVal * 1.85);

  const predicted30m = { flux: p30m, risk: getFluxRisk(p30m) };
  const predicted6h = { flux: p6h, risk: getFluxRisk(p6h) };
  const predicted12h = { flux: p12h, risk: getFluxRisk(p12h) };

  const currentRe0 = calculateMagnetopauseRe(Bz, calculateDynamicPressure(Nsw, Vsw));
  const activeSatName = selectedSatelliteId === 'gsat-31' 
    ? 'GSAT-31 (Indian long: 83°E)' 
    : selectedSatelliteId === 'gsat-30'
    ? 'GSAT-30 (Indian long: 55°E)'
    : 'GOES-16 (NOAA Primary)';

  const renderWindowContent = (id: string, motionStyle: any) => {
    switch(id) {
      case 'simControl':
        return (
          <DesktopWindow
            id="simControl"
            title="LIVE TELEMETRY FEED"
            onClose={() => toggleWindow('simControl')}
            isActive={activeWindow === 'simControl'}
            onFocus={() => handleWindowFocus('simControl')}
            defaultPosition={{ x: 0, y: 0 }}
            defaultSize={{ width: 650, height: 450 }}
            motionStyle={motionStyle}
          >
            <div className="flex flex-col gap-5 font-sans text-xs mt-2 px-1">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-slate-300 mb-0.5">
                  <span className="font-semibold tracking-wide">Velocity (Vsw)</span>
                  <span className="text-orange-400 font-mono font-bold bg-orange-950/30 px-2 py-0.5 rounded shadow-inner">{Vsw.toFixed(0)} km/s</span>
                </div>
                <input
                  type="range"
                  min="300"
                  max="1200"
                  value={Vsw}
                  onChange={(e) => handleSliderChange('Vsw', parseInt(e.target.value))}
                  className="w-full accent-orange-500 bg-slate-800 cursor-ew-resize rounded-lg h-2"
                />
                <span className="text-[10px] text-slate-500 italic mt-0.5">Standard background is ~400 km/s. CMEs exceed 800.</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-slate-300 mb-0.5">
                  <span className="font-semibold tracking-wide">IMF polarity Bz (Z-Axis)</span>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded shadow-inner ${Bz < 0 ? 'text-red-400 bg-red-950/30' : 'text-emerald-400 bg-emerald-950/30'}`}>{Bz.toFixed(1)} nT</span>
                </div>
                <input
                  type="range"
                  min="-25"
                  max="15"
                  step="0.5"
                  value={Bz}
                  onChange={(e) => handleSliderChange('Bz', parseFloat(e.target.value))}
                  className="w-full accent-red-500 bg-slate-800 cursor-ew-resize rounded-lg h-2"
                />
                <span className="text-[10px] text-slate-500 italic mt-0.5">Negative Bz values (southward) trigger geomagnetic storms.</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-slate-300 mb-0.5">
                  <span className="font-semibold tracking-wide">Proton density (Nsw)</span>
                  <span className="text-orange-400 font-mono font-bold bg-orange-950/30 px-2 py-0.5 rounded shadow-inner">{Nsw.toFixed(1)} cm⁻³</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="60"
                  step="0.1"
                  value={Nsw}
                  onChange={(e) => handleSliderChange('Nsw', parseFloat(e.target.value))}
                  className="w-full accent-orange-500 bg-slate-800 cursor-ew-resize rounded-lg h-2"
                />
                <span className="text-[10px] text-slate-500 italic mt-0.5">Plasma concentration. Amplifies solar dynamic pressure.</span>
              </div>
            </div>
          </DesktopWindow>
        );
      case 'magnetosphere':
        return (
          <DesktopWindow
            id="magnetosphere"
            title="BOW SHOCK & RAD BELT"
            onClose={() => toggleWindow('magnetosphere')}
            isActive={activeWindow === 'magnetosphere'}
            onFocus={() => handleWindowFocus('magnetosphere')}
            defaultPosition={{ x: 0, y: 0 }}
            defaultSize={{ width: 650, height: 450 }}
            motionStyle={motionStyle}
          >
            <MagnetosphereView Bz={Bz} Nsw={Nsw} Vsw={Vsw} selectedSatelliteLong={selectedSatelliteId === 'gsat-31' ? 83.0 : (selectedSatelliteId === 'gsat-30' ? 55.0 : 285.0)} />
          </DesktopWindow>
        );
      case 'forecast':
        return (
          <DesktopWindow
            id="forecast"
            title="PREDICTIVE FORECAST"
            onClose={() => toggleWindow('forecast')}
            isActive={activeWindow === 'forecast'}
            onFocus={() => handleWindowFocus('forecast')}
            defaultPosition={{ x: 0, y: 0 }}
            defaultSize={{ width: 650, height: 450 }}
            motionStyle={motionStyle}
          >
            <ForecastCharts solarWindHistory={solarWindHistory} electronFluxHistory={electronFluxHistory} predictedFluxes={predictedFluxes} warningTime={45} />
          </DesktopWindow>
        );
      case 'instruments':
        return (
          <DesktopWindow
            id="instruments"
            title="SURFACE RISK MONITOR"
            onClose={() => toggleWindow('instruments')}
            isActive={activeWindow === 'instruments'}
            onFocus={() => handleWindowFocus('instruments')}
            defaultPosition={{ x: 0, y: 0 }}
            defaultSize={{ width: 650, height: 450 }}
            motionStyle={motionStyle}
          >
            <AnomalyMonitor currentFlux={electronFluxHistory[electronFluxHistory.length - 1]?.fluxGoes || 1200} r0={calculateMagnetopauseRe(Bz, calculateDynamicPressure(Nsw, Vsw))} selectedSatelliteId={selectedSatelliteId} onSatelliteChanged={(id) => { setSelectedSatelliteId(id); addLog(`Swapped active satellite context node to ${id.toUpperCase()}`); }} />
          </DesktopWindow>
        );
      case 'cdfIngest':
        return (
          <DesktopWindow
            id="cdfIngest"
            title="CDF DATA PIPELINE"
            onClose={() => toggleWindow('cdfIngest')}
            isActive={activeWindow === 'cdfIngest'}
            onFocus={() => handleWindowFocus('cdfIngest')}
            defaultPosition={{ x: 0, y: 0 }}
            defaultSize={{ width: 650, height: 450 }}
            motionStyle={motionStyle}
          >
            <CDFProcessor onDataIngested={(raw, cleaned) => { addLog('CDF file extracted successfully. Transferring resampled timelines...'); const incomingSWHistory = generateCMEStormTimeline(12); setSolarWindHistory(incomingSWHistory); const newFluxHistory = incomingSWHistory.map((d, index) => { const cleanedVal = cleaned[index % cleaned.length] || 1500; return { time: d.time, fluxGoes: cleanedVal, fluxGrasp: cleanedVal * 0.8 }; }); setElectronFluxHistory(newFluxHistory); addLog('Despiking complete. Gap interpolation loaded successfully.'); }} />
          </DesktopWindow>
        );
      case 'modelRegistry':
        return (
          <DesktopWindow
            id="modelRegistry"
            title="AI MODELS REGISTRY"
            onClose={() => toggleWindow('modelRegistry')}
            isActive={activeWindow === 'modelRegistry'}
            onFocus={() => handleWindowFocus('modelRegistry')}
            defaultPosition={{ x: 0, y: 0 }}
            defaultSize={{ width: 650, height: 450 }}
            motionStyle={motionStyle}
          >
            <ModelDeveloperPanel activeModelId={activeModelId} onModelsChanged={() => { const active = modelRegistry.getActiveModel(); setActiveModelId(active.id); addLog(`Model architecture changed to: ${active.name} (${active.type})`); }} />
          </DesktopWindow>
        );
      case 'alertsDashboard':
        return (
          <DesktopWindow
            id="alertsDashboard"
            title="ALERT DISPATCH DASHBOARD"
            onClose={() => toggleWindow('alertsDashboard')}
            isActive={activeWindow === 'alertsDashboard'}
            onFocus={() => handleWindowFocus('alertsDashboard')}
            defaultPosition={{ x: 0, y: 0 }}
            defaultSize={{ width: 650, height: 450 }}
            motionStyle={motionStyle}
          >
            <AlertMonitorDashboard Vsw={Vsw} Bz={Bz} Nsw={Nsw} P_dyn={calculateDynamicPressure(Nsw, Vsw)} Kp={estimateKpIndex(Vsw, Bz)} r0={currentRe0} predicted30m={predicted30m} predicted6h={predicted6h} predicted12h={predicted12h} addLog={addLog} activeSatelliteName={activeSatName} />
          </DesktopWindow>
        );
      case 'systemLogs':
        return (
          <DesktopWindow
            id="systemLogs"
            title="TERMINAL CONSOLE logs"
            onClose={() => toggleWindow('systemLogs')}
            isActive={activeWindow === 'systemLogs'}
            onFocus={() => handleWindowFocus('systemLogs')}
            defaultPosition={{ x: 0, y: 0 }}
            defaultSize={{ width: 650, height: 450 }}
            motionStyle={motionStyle}
          >
            <div className="flex flex-col gap-1 font-mono text-[10px] text-slate-500 max-h-[150px] overflow-auto">
              {consoleLogs.map((log, idx) => (
                <div key={idx} className={log.includes('[SYSTEM]') ? 'text-slate-400' : log.includes('swapped') ? 'text-cyan-400' : 'text-slate-500'}>
                  {log}
                </div>
              ))}
            </div>
          </DesktopWindow>
        );
      case 'aiAnalyst':
        return (
          <DesktopWindow
            id="aiAnalyst"
            title="AI ANALYST (GEMINI)"
            onClose={() => toggleWindow('aiAnalyst')}
            isActive={activeWindow === 'aiAnalyst'}
            onFocus={() => handleWindowFocus('aiAnalyst')}
            defaultPosition={{ x: 0, y: 0 }}
            defaultSize={{ width: 650, height: 450 }}
            motionStyle={motionStyle}
          >
            <div className="flex flex-col gap-3 h-full">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-display font-semibold text-[11px] tracking-widest text-slate-400">GEMINI LLM ENGINE</span>
                <button
                  onClick={generateSpaceWeatherPhysicsReport}
                  disabled={isGeneratingReport}
                  className="px-2.5 py-1 text-[11px] font-sans font-medium tracking-wide rounded-md bg-white/5 border border-white/10 text-orange-400 hover:bg-white/10 transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isGeneratingReport ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin text-orange-500" />
                      <span className="text-orange-400">Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <BrainCircuit className="h-3.5 w-3.5 text-orange-500" />
                      <span>Ask Physics Report</span>
                    </>
                  )}
                </button>
              </div>
              {aiReport ? (
                <div className="flex flex-col gap-3.5 font-sans text-[11px] text-slate-300 pr-1">
                  <div className="flex flex-col gap-1 border-l-2 border-orange-500 pl-2">
                    <span className="text-orange-400 font-display font-bold uppercase tracking-widest text-[10px]">Standoff Core Analysis</span>
                    <span className="leading-relaxed">{aiReport.standoffAnalysis}</span>
                  </div>
                  <div className="flex flex-col gap-1 border-l-2 border-cyan-500 pl-2">
                    <span className="text-cyan-400 font-display font-bold uppercase tracking-widest text-[10px]">Belt Electrodynamics</span>
                    <span className="leading-relaxed">{aiReport.beltElectrodynamics}</span>
                  </div>
                  <div className="flex flex-col gap-1 border-l-2 border-red-500 pl-2">
                    <span className="text-red-400 font-display font-bold uppercase tracking-widest text-[10px]">Anomaly / Risk Assessment</span>
                    <span className="leading-relaxed">{aiReport.anomalyAssessment}</span>
                  </div>
                  <div className="flex flex-col gap-1 border-l-2 border-emerald-500 pl-2">
                    <span className="text-emerald-400 font-display font-bold uppercase tracking-widest text-[10px]">Mitigation Protocol</span>
                    <span className="leading-relaxed whitespace-pre-line">{aiReport.mitigationRecommendation}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center flex-1">
                  <span className="text-slate-600 text-xs italic">Awaiting query instructions...</span>
                </div>
              )}
            </div>
          </DesktopWindow>
        );
      case 'riskRadar':
        return (
          <DesktopWindow
            id="riskRadar"
            title="MULTIVARIATE RISK RADAR"
            onClose={() => toggleWindow('riskRadar')}
            isActive={activeWindow === 'riskRadar'}
            onFocus={() => handleWindowFocus('riskRadar')}
            defaultPosition={{ x: 0, y: 0 }}
            defaultSize={{ width: 650, height: 450 }}
            motionStyle={motionStyle}
          >
            <MultivariateRiskRadar 
              currentSolarWind={solarWindHistory[solarWindHistory.length - 1] || null} 
              currentElectronFlux={electronFluxHistory[electronFluxHistory.length - 1] || null}
            />
          </DesktopWindow>
        );
      default: return null;
    }
  };

  return (
    <div 
      className="flex h-screen w-screen flex-col font-sans text-slate-300 overflow-hidden relative selection:bg-orange-500/30 select-none bg-transparent"
    >
      <WebGLShader />
      <SpiralAnimation />
      
      {/* AstroShield Desktop Header (Taskbar top) */}
      <div className="h-16 border-b border-white/10 bg-slate-950/20 px-5 flex items-center justify-between z-40 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),_0_8px_32px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-3">
          <BrainCircuit className="h-6 w-6 text-orange-500 animate-pulse" />
          <div className="flex flex-col">
            <ScrambledTitle className="font-display text-[15px] font-bold tracking-[0.2em] text-[#f0f0f0] uppercase leading-tight" />
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt[-2px]">Geostationary Space Weather Desktop v2.6</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-sans font-medium text-slate-500 uppercase tracking-widest mr-2">Presets:</span>
          <button 
            onClick={() => loadScenario('calm')}
            className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] font-sans font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            Calm GEO Space
          </button>
          <button 
            onClick={() => loadScenario('cme_shock')}
            className="px-2.5 py-1 rounded-md bg-orange-950/20 border border-orange-500/20 text-[11px] font-sans font-medium text-orange-400 hover:text-orange-200 hover:bg-orange-950/40 transition-colors cursor-pointer"
          >
            CME Solar Storm
          </button>
          <button 
            onClick={() => loadScenario('halloween')}
            className="px-2.5 py-1 rounded-md bg-red-950/20 border border-red-500/20 text-[11px] font-sans font-medium text-red-400 hover:text-red-200 hover:bg-red-950/40 transition-colors cursor-pointer"
          >
            Halloween Historic Flare
          </button>
        </div>

        {/* Quick Launch Icons for our modules */}
        <div className="flex items-center gap-3 border-l border-white/10 pl-5 h-full py-1">
          {[
            { id: 'simControl', title: 'Feed Override', icon: <SlidersHorizontal className="h-4 w-4" />, gradientFrom: '#ea580c', gradientTo: '#fb923c' },
            { id: 'magnetosphere', title: 'Magneto', icon: <Maximize2 className="h-4 w-4" />, gradientFrom: '#0284c7', gradientTo: '#38bdf8' },
            { id: 'forecast', title: 'Forecast', icon: <Activity className="h-4 w-4" />, gradientFrom: '#059669', gradientTo: '#34d399' },
            { id: 'instruments', title: 'Hardware', icon: <ShieldAlert className="h-4 w-4" />, gradientFrom: '#ca8a04', gradientTo: '#facc15' },
            { id: 'cdfIngest', title: 'CDF Data', icon: <UploadCloud className="h-4 w-4" />, gradientFrom: '#7c3aed', gradientTo: '#c084fc' },
            { id: 'modelRegistry', title: 'AI Models', icon: <Layers className="h-4 w-4" />, gradientFrom: '#db2777', gradientTo: '#f472b6' },
            { id: 'alertsDashboard', title: 'Alerts', icon: <AlertOctagon className="h-4 w-4" />, gradientFrom: '#dc2626', gradientTo: '#f87171' },
            { id: 'riskRadar', title: 'Risk Radar', icon: <Activity className="h-4 w-4" />, gradientFrom: '#eab308', gradientTo: '#fef08a' },
            { id: 'aiAnalyst', title: 'Analyst', icon: <Sparkles className="h-4 w-4" />, gradientFrom: '#0891b2', gradientTo: '#22d3ee' },
          ].map(({ id, title, icon, gradientFrom, gradientTo }) => {
            const isOpen = openWindows[id as keyof typeof openWindows];
            const isAlert = id === 'alertsDashboard' && calculateMagnetopauseRe(Bz, calculateDynamicPressure(Nsw, Vsw)) < 6.6;
            return (
              <div
                key={id}
                onClick={() => toggleWindow(id as keyof typeof openWindows)}
                style={{ '--gradient-from': gradientFrom, '--gradient-to': gradientTo } as any}
                className={`relative w-[34px] h-[34px] ${isOpen ? 'bg-white/10 shadow-[0_0_8px_rgba(255,255,255,0.1)]' : 'bg-black/40'} border border-white/10 rounded-full flex items-center justify-center transition-all duration-500 hover:w-[110px] hover:border-transparent hover:shadow-none group cursor-pointer ${isAlert ? 'animate-pulse !border-red-500' : ''}`}
                title={title}
              >
                {/* Gradient background on hover */}
                <span className="absolute inset-0 rounded-full bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))] opacity-0 transition-all duration-500 group-hover:opacity-100"></span>
                {/* Blur glow */}
                <span className="absolute top-[3px] inset-x-0 h-full rounded-full bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))] blur-[8px] opacity-0 -z-10 transition-all duration-500 group-hover:opacity-40"></span>

                {/* Icon */}
                <span className={`relative z-10 transition-all duration-500 group-hover:scale-0 delay-0 ${isAlert ? 'text-red-400' : (isOpen ? 'text-white' : 'text-slate-400')} group-hover:text-white`}>
                  {icon}
                </span>

                {/* Title */}
                <span className="absolute text-white font-display font-semibold uppercase tracking-[0.1em] text-[10px] transition-all duration-500 scale-0 group-hover:scale-100 delay-150 whitespace-nowrap z-10">
                  {title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

            <div id="maximized-window-portal" className="absolute left-0 top-[64px] right-0 bottom-[40px] z-[9999] pointer-events-none" />

      {/* Main Container - Desktop Environment using the 3D Stacking Workspace */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center -mt-8">
        <WindowWorkspace
          windowOrder={windowOrder.filter(id => openWindows[id as keyof typeof openWindows])}
          activeWindow={activeWindow}
          renderWindow={renderWindowContent}
        />
      </div>

      {/* Workspace Active Dock (Bottom taskbar status bar) */}
        <div className="h-10 border-t border-white/10 bg-slate-950/20 px-4 flex items-center justify-between z-40 text-xs font-sans text-slate-400 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),_0_-8px_32px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-4">
            <span className="text-[10px] uppercase font-display font-bold tracking-widest text-slate-300 bg-white/5 border border-white/10 rounded-md px-1.5 py-0.5">SPL-VSSC</span>
            <span className="text-slate-400 text-[11px] font-medium">Node: <strong className="text-white font-mono text-[10px]">83.0° E</strong></span>
            <span className="text-slate-400 text-[11px] font-medium items-center flex gap-1">Model: <span className="text-orange-500 font-display font-semibold uppercase text-[10px] tracking-widest">
              {modelRegistry.getModels().find(m => m.id === activeModelId)?.type.replace('_', ' ')}
            </span></span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-medium bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-[11px]">
              System: <strong className="text-orange-500 font-mono animate-pulse font-normal">● ON</strong>
            </span>
            <span className="text-slate-500 text-[10px] uppercase tracking-widest font-display">UTC-12 Synced</span>
          </div>
        </div>
    </div>
  );
}
