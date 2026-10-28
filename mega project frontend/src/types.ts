/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SolarWindData {
  time: string; // ISO string
  Vsw: number;  // Solar wind speed in km/s (typically 300 to 1000)
  Bz: number;   // IMF Bz component in nT (typically -20 to +20)
  Nsw: number;  // Particle density in cm^-3 (typically 1 to 50)
  P_dyn: number; // Dynamic pressure in nPa
  Kp: number;    // Estimated Kp index (0 to 9)
}

export interface ElectronFluxData {
  time: string;
  fluxGoes: number; // >2 MeV electron flux (cm^-2 s^-1 sr^-1)
  fluxGrasp: number; // GRASP payload at Indian Longitude (~83 E)
}

export interface ForecastOutputs {
  timeGenerated: string;
  warning30m: {
    flux: number;
    risk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    confidence: number;
  };
  forecast6h: {
    fluxValues: number[];
    times: string[];
    risk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  };
  forecast12h: {
    fluxValues: number[];
    times: string[];
    risk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  };
}

export type ModelType = 'physics_informed_nn' | 'lstm_timeseries' | 'transformer' | 'empirical_fokker_planck';

export interface MLModel {
  id: string;
  name: string;
  type: ModelType;
  developer: string;
  version: string;
  status: 'ACTIVE' | 'DRAFT' | 'STANDBY';
  accuracyMetrics: {
    rmse: number;
    correlation: number;
    nse: number; // Nash-Sutcliffe Efficiency
  };
  hyperparameters: Record<string, string | number | boolean>;
  features: string[];
}

export interface SatelliteState {
  id: string;
  name: string;
  longitude: number; // East longitude
  role: 'ISRO_GSAT' | 'NOAA_GOES';
  surfaceChargingVolt: number;  // simulated surface charging amplitude (-V)
  deepDielectricCurrent: number; // simulated interior charging flux (pA/cm2)
  status: 'SAFE' | 'WARNING' | 'ANOMALOUS';
  instrumentStatus: {
    payload: string;
    status: 'ONLINE' | 'DEGRADED' | 'STANDBY';
  };
}

export interface CDFFileRecord {
  fileName: string;
  fileSize: string;
  durationDays: number;
  timestepsCount: number;
  parameters: string[];
  uploadedAt: string;
}
