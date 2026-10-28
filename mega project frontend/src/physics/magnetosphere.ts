/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SolarWindData, ElectronFluxData, ForecastOutputs } from '../types';

/**
 * Calculates the magnetopause standoff distance (in Earth Radii, Re) 
 * using the Shue et al. (1998) Empirical Magnetopause Model.
 * r0 = (10.22 + 1.29 * tanh(0.184 * (Bz + 1.43))) * P_dyn^(-1/6.6)
 */
export function calculateMagnetopauseRe(Bz: number, P_dyn: number): number {
  const normalizedP = Math.max(0.01, P_dyn); // Prevent division by zero
  const term1 = 10.22 + 1.29 * Math.tanh(0.184 * (Bz + 1.43));
  const term2 = Math.pow(normalizedP, -1 / 6.6);
  return term1 * term2;
}

/**
 * Calculates Solar Wind Dynamic Pressure P_dyn in nPa
 * P_dyn = 1.6726e-6 * Nsw * Vsw^2
 */
export function calculateDynamicPressure(Nsw: number, Vsw: number): number {
  return 1.6726e-6 * Nsw * Math.pow(Vsw, 2);
}

/**
 * Estimates Kp index based on solar wind speed and interplanetary magnetic field Bz
 * Kp is driven primarily by solar wind velocity Vsw and southward IMF Bz (negative values).
 */
export function estimateKpIndex(Vsw: number, Bz: number): number {
  // Empirical simplified estimation: Kp increases as Vsw increases and Bz gets highly negative
  const vFactor = Math.max(0, (Vsw - 300) / 100);
  const bFactor = Bz < 0 ? Math.abs(Bz) * 0.4 : 0;
  const kpVec = 1.5 + 0.5 * vFactor + bFactor;
  return Math.min(9, Math.max(0, parseFloat(kpVec.toFixed(1))));
}

/**
 * Simulates a realistic physical trajectory of electron fluxes based on Earth outer radiation belt physics.
 * Under high solar wind speed (Vsw) and southward IMF (Bz < 0), wave-particle interactions (chorus waves)
 * accelerate electrons to relativistic (>2 MeV) energy. 
 * High dynamic pressure causes compression and "magnetopause shadowing" (sudden dropouts).
 * 
 * Returns the current electron flux (H-E units: particles / cm^2 s sr)
 */
export function simulateElectronFluxResponse(
  prevFlux: number,
  Vsw: number,
  Bz: number,
  Nsw: number,
  dt_minutes: number
): number {
  // Convert flux to log10 space for stable physical diffusion models
  let logFlux = Math.log10(Math.max(1, prevFlux));
  
  const P_dyn = calculateDynamicPressure(Nsw, Vsw);
  const r0 = calculateMagnetopauseRe(Bz, P_dyn);
  const Kp = estimateKpIndex(Vsw, Bz);

  // 1. Magnetopause Shadowing (Loss Process)
  // If standoff distance compresses past geosynchronous orbit (6.6 Re), massive loss of electron flux occurs.
  let shadowLossRate = 0;
  if (r0 < 6.6) {
    const geoExposurePercent = (6.6 - r0) / 6.6;
    shadowLossRate = 1.2 * geoExposurePercent; // heavy log loss per hour
  }

  // 2. Wave-Particle Acceleration (Chorus Acceleration Source Process)
  // Chorus waves grow rapidly when Kp is high and Bz is negative.
  const chorusAccel = Vsw > 400 ? (Vsw - 400) * 0.0003 : 0;
  const stormInjection = Bz < 0 ? Math.abs(Bz) * 0.005 : 0;
  const sourceRate = 0.08 * Kp + chorusAccel + stormInjection;

  // 3. Radial Diffusion (D_LL transport from tail)
  // Parametrized outer radial injection
  const radialDiffusion = Math.max(0, (Vsw - 300) * 0.0001);

  // 4. Wave scattering (Loss to atmosphere via EMIC/Plasmaspheric Hiss)
  // Natural decay rate
  const atmosphericLoss = 0.01 + (Kp > 5 ? 0.05 : 0);

  // Apply change in log10 space
  const ratePerHour = (sourceRate + radialDiffusion) - (atmosphericLoss + shadowLossRate);
  const change = ratePerHour * (dt_minutes / 60);
  
  logFlux += change;
  
  // Outer belt saturation limits (typical geosynchronous fluxes are between 1e1 and 1e6)
  logFlux = Math.min(6.5, Math.max(1.0, logFlux));
  
  return Math.pow(10, logFlux);
}

/**
 * Preprocessing Data Simulator: Despikes raw satellite measurement arrays.
 * Removes spikes using a rolling moving median filter (Z-score of absolute deviations).
 */
export function despikeData(rawFluxes: number[]): number[] {
  if (rawFluxes.length < 5) return [...rawFluxes];
  const cleaned = [...rawFluxes];
  
  for (let i = 2; i < rawFluxes.length - 2; i++) {
    const neighborhood = [
      rawFluxes[i-2],
      rawFluxes[i-1],
      rawFluxes[i],
      rawFluxes[i+1],
      rawFluxes[i+2]
    ].sort((a,b) => a - b);
    const median = neighborhood[2];
    
    // If the difference is a huge multiplier (typical of satellite measurement spikes), clamp to neighborhood bounds
    const ratio = rawFluxes[i] / (median || 1);
    if (ratio > 10 || ratio < 0.1) {
      cleaned[i] = median;
    }
  }
  return cleaned;
}

/**
 * Interpolates gaps using cubic spline or linear interpolation.
 * Replaces values of 0 or NaN with smooth transitions.
 */
export function interpolateGaps(data: number[]): number[] {
  const result = [...data];
  let i = 0;
  while (i < result.length) {
    if (result[i] === 0 || isNaN(result[i])) {
      // Find start of gap
      const gapStart = i;
      // Find end of gap
      let gapEnd = i;
      while (gapEnd < result.length && (result[gapEnd] === 0 || isNaN(result[gapEnd]))) {
        gapEnd++;
      }
      
      const leftVal = gapStart > 0 ? result[gapStart - 1] : (gapEnd < result.length ? result[gapEnd] : 100);
      const rightVal = gapEnd < result.length ? result[gapEnd] : leftVal;
      
      // Fill gap linearly
      const gapLength = gapEnd - gapStart;
      for (let g = 0; g < gapLength; g++) {
        const t = (g + 1) / (gapLength + 1);
        result[gapStart + g] = leftVal + t * (rightVal - leftVal);
      }
      i = gapEnd;
    } else {
      i++;
    }
  }
  return result;
}

/**
 * Generates sample solar wind storm trajectory based on a historical CME incident.
 */
export function generateCMEStormTimeline(lengthHours = 24): SolarWindData[] {
  const dataset: SolarWindData[] = [];
  const baseTime = Date.now() - lengthHours * 3600 * 1000;
  
  for (let step = 0; step < lengthHours * 6; step++) { // 6 samples per hour (10-minute resolution)
    const minutesElapsed = step * 10;
    const time = new Date(baseTime + minutesElapsed * 60000).toISOString();
    
    let Vsw = 380;
    let Bz = 2.1;
    let Nsw = 4.2;

    // Sub-storm injection modeling
    if (minutesElapsed > 240 && minutesElapsed <= 360) {
      // Storm Shock Front Approaches
      const progress = (minutesElapsed - 240) / 120;
      Vsw = 380 + progress * 320; // sudden jump
      Nsw = 4.2 + progress * 25;   // dynamic pressure jump
      Bz = 2.1 - progress * 12;    // southward turning IMF
    } else if (minutesElapsed > 360 && minutesElapsed <= 720) {
      // Main Phase of Storm
      const progress = (minutesElapsed - 360) / 360;
      Vsw = 700 - progress * 100;
      Nsw = 29.2 - progress * 15;
      Bz = -9.9 + progress * 7;    // slowly recovering Bz
    } else if (minutesElapsed > 720) {
      // Recovery Phase
      const progress = (minutesElapsed - 720) / (lengthHours * 60 - 720);
      Vsw = 600 - progress * 150;
      Nsw = 14.2 - progress * 9;
      Bz = -2.9 + progress * 4.5;
    }

    // Add high frequency space noise
    Vsw += (Math.random() - 0.5) * 15;
    Bz += (Math.random() - 0.5) * 1.5;
    Nsw += (Math.random() - 0.5) * 1.2;

    Nsw = Math.max(0.1, Nsw);
    Vsw = Math.max(100, Vsw);

    const P_dyn = calculateDynamicPressure(Nsw, Vsw);
    const Kp = estimateKpIndex(Vsw, Bz);

    dataset.push({ time, Vsw, Bz, Nsw, P_dyn, Kp });
  }

  return dataset;
}
