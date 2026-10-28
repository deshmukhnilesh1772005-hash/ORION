/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Send, 
  AlertOctagon, 
  Mail, 
  MessageSquare, 
  UserPlus, 
  History, 
  ToggleLeft, 
  ToggleRight,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  Clock,
  Trash2,
  ListFilter
} from 'lucide-react';
import { SolarWindData } from '../types';

interface AuthorizedUser {
  id: string;
  name: string;
  email: string;
  mobile: string;
  designation: string;
  isActive: boolean;
}

interface SentNotification {
  id: string;
  timestamp: string;
  recipientName: string;
  recipientContact: string;
  type: 'EMAIL' | 'SMS' | 'BOTH';
  status: 'DELIVERED' | 'SIMULATED' | 'FAILED';
  standoff: number;
  details: string;
}

interface AlertMonitorDashboardProps {
  Vsw: number;
  Bz: number;
  Nsw: number;
  P_dyn: number;
  Kp: number;
  r0: number;
  predicted30m: { flux: number; risk: string };
  predicted6h: { flux: number; risk: string };
  predicted12h: { flux: number; risk: string };
  addLog: (msg: string) => void;
  activeSatelliteName: string;
}

export default function AlertMonitorDashboard({
  Vsw,
  Bz,
  Nsw,
  P_dyn,
  Kp,
  r0,
  predicted30m,
  predicted6h,
  predicted12h,
  addLog,
  activeSatelliteName
}: AlertMonitorDashboardProps) {
  // Core States
  const [users, setUsers] = useState<AuthorizedUser[]>([]);
  const [notifications, setNotifications] = useState<SentNotification[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [autoDispatch, setAutoDispatch] = useState(true);

  // Form Inputs
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [designation, setDesignation] = useState('');

  // Local dispatch state
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  // Initialize Users and Sent log from localStorage on mount
  useEffect(() => {
    const cachedUsers = localStorage.getItem('astroshield_users');
    const cachedLogs = localStorage.getItem('astroshield_notif_logs');

    if (cachedUsers) {
      setUsers(JSON.parse(cachedUsers));
    } else {
      const defaultUsers: AuthorizedUser[] = [
        {
          id: '1',
          name: 'Dr. Abu Jar Nadaf',
          email: 'abujarnadaf001@gmail.com',
          mobile: '+919999999999',
          designation: 'Director, ISRO Space Physics Lab',
          isActive: true
        },
        {
          id: '2',
          name: 'Dr. G. Madhavan',
          email: 'g.madhavan.isro@gmail.com',
          mobile: '+919876543210',
          designation: 'Lead Spacecraft Charging Scientist, VSSC',
          isActive: true
        }
      ];
      setUsers(defaultUsers);
      localStorage.setItem('astroshield_users', JSON.stringify(defaultUsers));
    }

    if (cachedLogs) {
      setNotifications(JSON.parse(cachedLogs));
    } else {
      setNotifications([]);
    }
  }, []);

  const saveUsersToStorage = (updatedUsers: AuthorizedUser[]) => {
    setUsers(updatedUsers);
    localStorage.setItem('astroshield_users', JSON.stringify(updatedUsers));
  };

  const saveLogsToStorage = (updatedLogs: SentNotification[]) => {
    setNotifications(updatedLogs);
    localStorage.setItem('astroshield_notif_logs', JSON.stringify(updatedLogs));
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !mobile) return;

    const newUser: AuthorizedUser = {
      id: Date.now().toString(),
      name,
      email,
      mobile,
      designation: designation || 'Support Officer',
      isActive: true
    };

    const updated = [...users, newUser];
    saveUsersToStorage(updated);
    addLog(`Authorized personnel added to Space Weather alert list: ${name}`);

    // Reset Form
    setName('');
    setEmail('');
    setMobile('');
    setDesignation('');
    setShowAddForm(false);
  };

  const handleDeleteUser = (id: string, userName: string) => {
    const updated = users.filter(u => u.id !== id);
    saveUsersToStorage(updated);
    addLog(`Removed alert authorization for personnel: ${userName}`);
  };

  const toggleUserActive = (id: string) => {
    const updated = users.map(u => u.id === id ? { ...u, isActive: !u.isActive } : u);
    saveUsersToStorage(updated);
  };

  // Automated trigger effect when standoff compresses past 6.6
  const [criticalTriggered, setCriticalTriggered] = useState(false);
  useEffect(() => {
    if (r0 < 6.6) {
      if (!criticalTriggered) {
        setCriticalTriggered(true);
        addLog(`⚠️ CRITICAL COLLAPSE: Magnetopause compressed past geostationary threshold (${r0.toFixed(2)} Re < 6.6 Re)!`);
        
        if (autoDispatch) {
          triggerAlertDispatch('AUTOMATED REAL-TIME CRITICAL EXCURSION');
        }
      }
    } else {
      if (criticalTriggered) {
        setCriticalTriggered(false);
        addLog(`☀️ NOTICE: Magnetopause standoff distance recovered to safe level (${r0.toFixed(2)} Re).`);
      }
    }
  }, [r0, autoDispatch]);

  const triggerAlertDispatch = async (triggerSource = 'MANUAL CONSOLE COMMAND') => {
    setIsDispatching(true);
    setDispatchStatus('In Progress...');
    addLog(`Initiating Astromagnetic alert notification payload stream to authorized personnel...`);

    const activeRecipients = users.filter(u => u.isActive);
    if (activeRecipients.length === 0) {
      setDispatchStatus('No active authorized recipients present.');
      setIsDispatching(false);
      return;
    }

    try {
      const response = await fetch('/api/alerts/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggerSource,
          Vsw,
          Bz,
          Nsw,
          P_dyn,
          Kp,
          r0,
          predicted30m,
          predicted6h,
          predicted12h,
          satelliteName: activeSatelliteName,
          recipients: activeRecipients.map(u => ({
            name: u.name,
            email: u.email,
            mobile: u.mobile,
            designation: u.designation
          }))
        })
      });

      const result = await response.json();

      // Log items to local status
      const newLogs: SentNotification[] = [];
      result.results?.forEach((item: any) => {
        newLogs.push({
          id: `${Date.now()}-${Math.random()}`,
          timestamp: new Date().toLocaleTimeString(),
          recipientName: item.recipientName,
          recipientContact: `${item.email} / ${item.mobile}`,
          type: 'BOTH',
          status: item.status === 'success' ? 'DELIVERED' : item.status === 'simulated' ? 'SIMULATED' : 'FAILED',
          standoff: r0,
          details: item.summary || 'Alert processed successfully.'
        });
      });

      const updatedLogs = [...newLogs, ...notifications].slice(0, 40);
      saveLogsToStorage(updatedLogs);

      if (result.isSimulated) {
        setDispatchStatus('Simulation Delivered (See details)');
        addLog(`Sent simulated Space Weather alert notifications to ${activeRecipients.length} authorities.`);
      } else {
        setDispatchStatus('Real Alert Successfully Sent!');
        addLog(`🔔 REAL ALERT CHANNELS ENGAGED: Successfully sent live alerts via Twilio/SMTP to ${activeRecipients.length} operators.`);
      }
    } catch (err: any) {
      console.error(err);
      setDispatchStatus('Dispatch failed. Server connection error.');
      addLog(`Failed to communicate with alert notification dispatch router: ${err.message}`);
    } finally {
      setIsDispatching(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk?.toUpperCase()) {
      case 'CRITICAL': return 'text-red-500 font-bold';
      case 'HIGH': return 'text-orange-500 font-bold';
      case 'MODERATE': return 'text-yellow-400';
      default: return 'text-green-400';
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full font-mono text-xs text-slate-300">
      
      {/* Alert Header Status Panel */}
      <div 
        className={`px-4 h-12 border rounded-lg transition-all duration-500 relative overflow-hidden flex items-center justify-between shrink-0 ${
          r0 < 6.6 
            ? 'bg-red-950/25 border-red-500/40 shadow-[inset_0_0_15px_rgba(239,68,68,0.1),0_0_10px_rgba(239,68,68,0.05)] text-red-100 animate-pulse' 
            : 'bg-emerald-950/15 border-emerald-500/30 text-emerald-100'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <AlertOctagon className={`h-5 w-5 shrink-0 ${r0 < 6.6 ? 'text-red-500 animate-spin' : 'text-emerald-500'}`} />
          <span className="font-bold uppercase tracking-widest text-xs select-none">
            {r0 < 6.6 ? 'CRITICAL EXCURSION WARNING' : 'MAGNETOPAUSE STANDOFF SECURE'}
          </span>
        </div>
        <span className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider flex items-center justify-center ${
          r0 < 6.6 ? 'bg-red-500 text-black animate-pulse' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/25'
        }`}>
          {r0 < 6.6 ? 'SHADOWING ACTIVE' : 'SAFE ENVIRONMENT'}
        </span>
      </div>

      {/* Boundary Metrics & Text Description Container */}
      <div className="bg-slate-950/15 border border-white/5 p-4 rounded-lg flex flex-col gap-3">
        <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
          {r0 < 6.6 
            ? `WARNING: The magnetopause standoff boundary has compressed to ${r0.toFixed(2)} Re, penetrating inside geosynchronous orbit (6.6 Re). Spacecraft shielding is compromised! Non-essential electrical payloads should go on offline standby.`
            : `Geomagnetic boundary is secure at ${r0.toFixed(2)} Re. Geosynchronous orbit (6.6 Re) remains safely protected inside Earth's magnetosphere shell.`
          }
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-black/40 border border-white/5 p-3 rounded-md flex flex-col justify-center">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Boundary Standoff</span>
            <span className={`text-[14px] font-bold mt-1 ${r0 < 6.6 ? 'text-red-400' : 'text-emerald-400'}`}>{r0.toFixed(3)} Re</span>
          </div>
          <div className="bg-black/40 border border-white/5 p-3 rounded-md flex flex-col justify-center">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Geosynchronous Limit</span>
            <span className="text-[14px] font-bold text-white mt-1">6.600 Re</span>
          </div>
        </div>
      </div>

      {/* Grid: Recipient Management & Dispatch Logs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Recipient manager */}
        <div className="bg-slate-950/20 border border-white/10 p-4 rounded-lg flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2 font-bold text-slate-200">
              <Users className="h-4.5 w-4.5 text-orange-500" />
              <span className="tracking-wide text-xs">AUTHORIZED CONTACTS</span>
            </div>
            
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-2.5 py-1 rounded-sm bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-400 text-[10px] uppercase font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>{showAddForm ? 'CANCEL' : 'AUTHORIZE'}</span>
            </button>
          </div>

          {showAddForm ? (
            <form onSubmit={handleAddUser} className="bg-black/35 border border-white/5 p-3 rounded flex flex-col gap-2.5">
              <div className="text-[10px] font-bold text-orange-500 tracking-wider">NEW AUTHORITY CREDENTIALS</div>
              
              <div className="flex flex-col gap-1.5">
                <input 
                  type="text" 
                  placeholder="Full Name (e.g., Dr. Abu Jar)" 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  className="bg-black/60 border border-white/10 p-1.5 px-2 rounded-sm outline-none text-white focus:border-orange-500/40 text-[11px] placeholder:text-slate-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="email" 
                  placeholder="Email Contact" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  className="bg-black/60 border border-white/10 p-1.5 px-2 rounded-sm outline-none text-white focus:border-orange-500/40 text-[11px] placeholder:text-slate-600"
                  required
                />
                <input 
                  type="text" 
                  placeholder="Mobile (e.g., +91...)" 
                  value={mobile} 
                  onChange={e => setMobile(e.target.value)}
                  className="bg-black/60 border border-white/10 p-1.5 px-2 rounded-sm outline-none text-white focus:border-orange-500/40 text-[11px] placeholder:text-slate-600"
                  required
                />
              </div>

              <input 
                type="text" 
                placeholder="Department / Designation" 
                value={designation} 
                onChange={e => setDesignation(e.target.value)}
                className="bg-black/60 border border-white/10 p-1.5 px-2 rounded-sm outline-none text-white focus:border-orange-500/40 text-[11px] placeholder:text-slate-600"
              />

              <button 
                type="submit" 
                className="w-full bg-orange-500/20 hover:bg-orange-500/35 border border-orange-500/40 rounded-sm py-1.5 mt-1 font-bold text-orange-400 text-[11px] uppercase tracking-wider transition-colors"
              >
                Register & Authorize
              </button>
            </form>
          ) : null}

          {/* User List */}
          <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
            {users.length === 0 ? (
              <div className="text-[11px] text-slate-500 italic text-center py-6">No authorized users configured.</div>
            ) : (
              users.map(u => (
                <div key={u.id} className="p-2.5 bg-white/5 border border-white/5 hover:border-white/10 rounded flex items-center justify-between gap-2 transition-colors">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100 text-[12px]">{u.name}</span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{u.designation}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1 font-mono"><Mail className="h-3 w-3 text-slate-500" /> {u.email}</span>
                      <span className="flex items-center gap-1 font-mono"><MessageSquare className="h-3 w-3 text-slate-500" /> {u.mobile}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => toggleUserActive(u.id)}
                      className="p-1 hover:text-white text-slate-450 cursor-pointer"
                      title={u.isActive ? "Deactivate Alerts" : "Activate Alerts"}
                    >
                      {u.isActive ? (
                        <ToggleRight className="h-5 w-5 text-orange-500" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-slate-600" />
                      )}
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(u.id, u.name)}
                      className="p-1 text-slate-500 hover:text-red-400 cursor-pointer transition-colors"
                      title="Deauthorize Personnel"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Dispatch Controls & Status */}
        <div className="bg-slate-950/20 border border-white/10 p-4 rounded-lg flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-white/5 pb-2 font-bold text-slate-200">
            <div className="flex items-center gap-2">
              <Mail className="h-4.5 w-4.5 text-orange-500" />
              <span className="tracking-wide text-xs">DISPATCH CONSOLE</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
              <span className="text-slate-550">Autopilot:</span>
              <button 
                onClick={() => {
                  setAutoDispatch(!autoDispatch);
                  addLog(`Autopilot dispatcher ${!autoDispatch ? 'ENABLED' : 'DISABLED'}`);
                }}
                className={`px-2 py-0.5 rounded-sm font-bold transition-colors ${
                  autoDispatch ? 'bg-orange-950/50 text-orange-400 border border-orange-500/20 hover:bg-orange-900/60' : 'bg-[#111] text-slate-500 border border-[#222] hover:bg-[#222]'
                }`}
              >
                {autoDispatch ? 'ACTIVE' : 'MUTED'}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Dispatch a high-priority alert payload detailing geostationary orbit space weather warnings. Ideal for immediate system testing and validation.
            </p>

            <div className="grid grid-cols-2 gap-3 my-1">
              <button
                type="button"
                onClick={() => triggerAlertDispatch('MANUAL CONSOLE DISPATCH')}
                disabled={isDispatching}
                className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:opacity-50 py-2.5 rounded-sm font-bold text-white cursor-pointer select-none transition-colors text-[11px] flex items-center justify-center gap-2 uppercase tracking-wide shadow-md shadow-orange-950/25"
              >
                <Send className="h-4 w-4" />
                <span>{isDispatching ? 'Dispatching...' : 'Dispatch Alerts Now'}</span>
              </button>

              <div className="bg-black/35 border border-white/5 rounded-sm px-3 py-2 flex flex-col justify-center gap-1">
                <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Latest Dispatch status</span>
                <span className="text-[11px] font-bold truncate text-slate-200">
                  {dispatchStatus || 'System Standby'}
                </span>
              </div>
            </div>

            {/* Config warning info */}
            <div className="text-[10px] text-slate-450 bg-white/5 border border-white/5 p-3 rounded-sm flex items-start gap-2 mt-1">
              <HelpCircle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <div className="leading-snug">
                <strong className="text-white">DEPLOYMENT NOTE:</strong> By default, this applet operates in evaluation simulation mode with detailed logging. To deliver fully real emails and SMS, add your SMTP and Twilio parameters to your system secrets. Consult <span className="text-orange-400 font-bold border-b border-orange-500/20 cursor-help" title="Configures your own server node">ALERT_SYSTEM_SETUP.md</span>.
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Interactive Payload Preview */}
      <div className="bg-slate-950/20 border border-white/10 p-4 rounded-lg flex flex-col gap-3">
        <div className="border-b border-white/5 pb-2 font-bold text-slate-200 flex items-center gap-2">
          <Clock className="h-4.5 w-4.5 text-orange-500" />
          <span className="tracking-wide text-xs">LIVE ALERT CHANNEL PAYLOAD PREVIEW</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
          {/* SMS Preview */}
          <div className="bg-black/45 border border-white/5 p-3 rounded-md flex flex-col gap-2">
            <span className="text-[10px] text-orange-400 font-bold uppercase flex items-center gap-1.5 tracking-wider">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>SMS CHANNEL FORMAT</span>
            </span>
            <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded text-[10px] leading-relaxed font-mono text-slate-300 whitespace-pre-line max-h-[160px] overflow-y-auto custom-scrollbar">
              {`🚨 ISRO ASTROSHIELD ALERTS
STATION: VSSC SPL
TARGET: ${activeSatelliteName}
STATUS: CRITICAL EXCURSION WARNING

Magnetopause Boundary: ${r0.toFixed(2)} Re (COLLAPSED past geosynchronous limit of 6.6 Re!)
SW velocity: ${Vsw.toFixed(0)} km/s
IMF Bz: ${Bz.toFixed(1)} nT
Solar Plasma: ${Nsw.toFixed(1)} cm⁻³
Dynamic Pressure: ${P_dyn.toFixed(2)} nPa

FORECAST MATRIX RADIATION RISK:
- T+30M: ${predicted30m.flux.toFixed(0)} p/cm²·s·sr (${predicted30m.risk})
- T+6H: ${(predicted6h.flux).toFixed(0)} p/cm²·s·sr (${predicted6h.risk})
- T+12H: ${(predicted12h.flux).toFixed(0)} p/cm²·s·sr (${predicted12h.risk})

ALERT CAUSE: Standoff boundary compressed past 6.6 Re exposing spacecraft to direct solar magnetosheath flux and deep dielectric charging hazards! Initiate charge dissipaters.`}
            </div>
          </div>

          {/* Email Preview */}
          <div className="bg-black/45 border border-white/5 p-3 rounded-md flex flex-col gap-2">
            <span className="text-[10px] text-orange-400 font-bold uppercase flex items-center gap-1.5 tracking-wider">
              <Mail className="h-3.5 w-3.5" />
              <span>EMAIL CHANNEL FORMAT</span>
            </span>
            <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded text-[10.5px] font-sans text-slate-300 leading-relaxed overflow-y-auto max-h-[160px] custom-scrollbar flex flex-col gap-1.5">
              <div className="border-b border-white/5 pb-1.5 mb-1 text-[11px] font-medium">
                <span className="text-slate-400">Subject:</span> <span className="text-red-400 font-bold ml-1">⚠️ CRITICAL: ISRO Space Weather Geostationary Excursion Alert - {activeSatelliteName}</span>
              </div>
              <p className="font-bold text-white mb-0.5">Dear Authorized Space Operations Scientist/Officer,</p>
              <p className="leading-snug">This is an automated alert generated by the ISRO Space Physics Laboratory (SPL) AstroShield monitoring system. The planet-scale empirical magnetopause standoff boundary has compressed past the critical geostationary orbit ceiling.</p>
              <div className="bg-black/40 p-2 rounded font-mono text-[9px] my-1 flex flex-col gap-1 text-slate-300">
                <div>- Computed Boundary Standoff: <strong className="text-white">{r0.toFixed(3)} Re</strong> (<span className="text-red-400">Critical &lt; 6.6 Re</span>)</div>
                <div>- Current SW Velocity (Vsw): <strong className="text-white">{Vsw.toFixed(0)} km/s</strong></div>
                <div>- IMF North-South Component (Bz): <strong className="text-white">{Bz.toFixed(1)} nT</strong></div>
                <div>- Dynamic Radiation Pressure: <strong className="text-white">{P_dyn.toFixed(3)} nPa</strong></div>
              </div>
              <p className="leading-snug"><strong>Predictive Flux Trends:</strong> 30 min forecast: <span className="text-white">{predicted30m.flux.toFixed(0)} units ({predicted30m.risk})</span> | 6 Hr forecast: <span className="text-white">{predicted6h.flux.toFixed(0)} ({predicted6h.risk})</span> | 12 Hr: <span className="text-white">{predicted12h.flux.toFixed(0)} ({predicted12h.risk})</span>.</p>
              <p className="leading-tight text-[9px] italic text-slate-500 border-t border-white/5 mt-1.5 pt-1.5">This email has high-priority status. Real-time telemetry compiled via AstroShield VSSC Server node.</p>
            </div>
          </div>
        </div>
      </div>

      {/* History of Sent alerts list */}
      <div className="bg-slate-950/20 border border-white/10 p-4 rounded-lg flex flex-col gap-3">
        <div className="border-b border-white/5 pb-2 font-bold text-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4.5 w-4.5 text-orange-500" />
            <span className="tracking-wide text-xs">DISPATCH LOGS HISTORY</span>
          </div>
          {notifications.length > 0 && (
            <button 
              onClick={() => saveLogsToStorage([])}
              className="px-2 py-1 rounded-sm text-[9px] font-bold bg-[#111] hover:bg-slate-900 border border-[#333] hover:text-white cursor-pointer transition-colors"
            >
              CLEAR LOGS
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
          {notifications.length === 0 ? (
            <div className="text-[11px] text-slate-500 italic text-center py-6">No alert despatches have been registered in this session.</div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="p-2.5 bg-black/30 border border-white/5 hover:border-white/10 rounded flex items-center justify-between gap-3 transition-colors">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-[11px]">{n.recipientName}</span>
                    <span className="text-[9px] text-slate-400 font-mono">{n.recipientContact}</span>
                  </div>
                  <p className="text-[9.5px] text-slate-300 capitalize leading-relaxed select-text">{n.details}</p>
                </div>
                <div className="flex flex-col items-end shrink-0 gap-1.5">
                  <span className="text-[9px] text-slate-500 flex items-center gap-1 font-mono">
                    <Clock className="h-3 w-3" />
                    <span>{n.timestamp}</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded-sm text-[8px] font-bold tracking-wider uppercase border ${
                    n.status === 'DELIVERED' 
                      ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/20' 
                      : n.status === 'SIMULATED'
                      ? 'bg-orange-950/30 text-orange-400 border-orange-500/20'
                      : 'bg-red-950/30 text-red-400 border-red-500/20'
                  }`}>
                    {n.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
