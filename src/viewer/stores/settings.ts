import { planData } from "./plan.js";

export interface HrZone {
  zone: number;
  name: string;
  low: number;
  high: number;
}

export interface PowerZone {
  zone: number;
  name: string;
  low: number;
  high: number;
}

export interface PaceZone {
  zone: string | number;
  name: string;
  pace: string;
  offset?: number;
}

export interface Settings {
  units: {
    swim: "meters" | "yards";
    bike: "kilometers" | "miles";
    run: "kilometers" | "miles";
  };
  firstDayOfWeek: "monday" | "sunday";
  run: {
    lthr: number;
    hrZones: HrZone[];
    thresholdPace: string;
    paceZones: PaceZone[];
  };
  bike: {
    lthr: number;
    hrZones: HrZone[];
    ftp: number;
    powerZones: PowerZone[];
  };
  swim: {
    css: string;
    cssSeconds: number;
    paceZones: PaceZone[];
  };
}

const defaultSettings: Settings = {
  units: { swim: "meters", bike: "kilometers", run: "kilometers" },
  firstDayOfWeek: "monday",
  run: {
    lthr: 165,
    hrZones: [
      { zone: 1, name: "Recovery", low: 0, high: 134 },
      { zone: 2, name: "Aerobic", low: 134, high: 147 },
      { zone: 3, name: "Tempo", low: 147, high: 156 },
      { zone: 4, name: "Threshold", low: 156, high: 165 },
      { zone: 5, name: "VO2max", low: 165, high: 180 },
    ],
    thresholdPace: "4:30",
    paceZones: [
      { zone: "E", name: "Easy", pace: "5:20" },
      { zone: "M", name: "Marathon", pace: "4:50" },
      { zone: "T", name: "Threshold", pace: "4:30" },
      { zone: "I", name: "Interval", pace: "4:00" },
      { zone: "R", name: "Repetition", pace: "3:40" },
    ],
  },
  bike: {
    lthr: 160,
    hrZones: [
      { zone: 1, name: "Recovery", low: 0, high: 130 },
      { zone: 2, name: "Aerobic", low: 130, high: 142 },
      { zone: 3, name: "Tempo", low: 142, high: 151 },
      { zone: 4, name: "Threshold", low: 151, high: 160 },
      { zone: 5, name: "VO2max", low: 160, high: 175 },
    ],
    ftp: 200,
    powerZones: [
      { zone: 1, name: "Active Recovery", low: 0, high: 110 },
      { zone: 2, name: "Endurance", low: 110, high: 150 },
      { zone: 3, name: "Tempo", low: 150, high: 180 },
      { zone: 4, name: "Threshold", low: 180, high: 210 },
      { zone: 5, name: "VO2max", low: 210, high: 240 },
    ],
  },
  swim: {
    css: "1:50",
    cssSeconds: 110,
    paceZones: [
      { zone: 1, name: "Recovery", offset: 20, pace: "2:10" },
      { zone: 2, name: "Aerobic", offset: 10, pace: "2:00" },
      { zone: 3, name: "Tempo", offset: 5, pace: "1:55" },
      { zone: 4, name: "Threshold", offset: 0, pace: "1:50" },
      { zone: 5, name: "VO2max", offset: -5, pace: "1:45" },
    ],
  },
};

const storageKey = `plan-${planData.meta.id}-settings`;

export function loadSettings(): Settings {
  const settings = JSON.parse(JSON.stringify(defaultSettings));

  // Merge with plan preferences
  if (planData.preferences) {
    settings.units.swim = planData.preferences.swim || settings.units.swim;
    settings.units.bike = planData.preferences.bike || settings.units.bike;
    settings.units.run = planData.preferences.run || settings.units.run;
    settings.firstDayOfWeek = planData.preferences.firstDayOfWeek || settings.firstDayOfWeek;
  }

  // Merge with plan zones
  const zones = planData.zones;
  if (zones?.run?.hr) {
    settings.run.lthr = zones.run.hr.lthr;
    settings.run.hrZones = zones.run.hr.zones.map((z) => ({
      zone: z.zone,
      name: z.name,
      low: z.hrLow,
      high: z.hrHigh,
    }));
  }
  if (zones?.run?.pace) {
    settings.run.thresholdPace = zones.run.pace.thresholdPace || settings.run.thresholdPace;
    if (zones.run.pace.zones) {
      settings.run.paceZones = zones.run.pace.zones.map((z) => ({
        zone: z.zone,
        name: z.name,
        pace: z.pace,
      }));
    }
  }
  if (zones?.bike?.hr) {
    settings.bike.lthr = zones.bike.hr.lthr;
    settings.bike.hrZones = zones.bike.hr.zones.map((z) => ({
      zone: z.zone,
      name: z.name,
      low: z.hrLow,
      high: z.hrHigh,
    }));
  }
  if (zones?.bike?.power) {
    settings.bike.ftp = zones.bike.power.ftp;
    settings.bike.powerZones = zones.bike.power.zones.map((z) => ({
      zone: z.zone,
      name: z.name,
      low: z.wattsLow,
      high: z.wattsHigh,
    }));
  }
  if (zones?.swim) {
    settings.swim.css = zones.swim.css || settings.swim.css;
    settings.swim.cssSeconds = zones.swim.cssSeconds || settings.swim.cssSeconds;
    if (zones.swim.zones) {
      settings.swim.paceZones = zones.swim.zones.map((z) => ({
        zone: z.zone,
        name: z.name,
        offset: z.paceOffset,
        pace: z.pace,
      }));
    }
  }

  // Override with user's saved settings
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    const userSettings = JSON.parse(saved);
    if (userSettings.units) settings.units = { ...settings.units, ...userSettings.units };
    if (userSettings.firstDayOfWeek) settings.firstDayOfWeek = userSettings.firstDayOfWeek;
    if (userSettings.run) settings.run = { ...settings.run, ...userSettings.run };
    if (userSettings.bike) settings.bike = { ...settings.bike, ...userSettings.bike };
    if (userSettings.swim) settings.swim = { ...settings.swim, ...userSettings.swim };
  }

  return settings;
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(storageKey, JSON.stringify(settings));
}

// Utility functions
export function paceToSeconds(pace: string): number {
  const parts = pace.split(":");
  return parseInt(parts[0]) * 60 + parseInt(parts[1] || "0");
}

export function secondsToPace(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function recalculateHrZones(lthr: number): HrZone[] {
  const percentages = [
    { zone: 1, name: "Recovery", lowPct: 0, highPct: 81 },
    { zone: 2, name: "Aerobic", lowPct: 81, highPct: 89 },
    { zone: 3, name: "Tempo", lowPct: 89, highPct: 94 },
    { zone: 4, name: "Threshold", lowPct: 94, highPct: 100 },
    { zone: 5, name: "VO2max", lowPct: 100, highPct: 106 },
  ];
  return percentages.map((p) => ({
    zone: p.zone,
    name: p.name,
    low: Math.round((lthr * p.lowPct) / 100),
    high: Math.round((lthr * p.highPct) / 100),
  }));
}

export function recalculatePowerZones(ftp: number): PowerZone[] {
  const percentages = [
    { zone: 1, name: "Active Recovery", lowPct: 0, highPct: 55 },
    { zone: 2, name: "Endurance", lowPct: 55, highPct: 75 },
    { zone: 3, name: "Tempo", lowPct: 75, highPct: 90 },
    { zone: 4, name: "Threshold", lowPct: 90, highPct: 105 },
    { zone: 5, name: "VO2max", lowPct: 105, highPct: 120 },
  ];
  return percentages.map((p) => ({
    zone: p.zone,
    name: p.name,
    low: Math.round((ftp * p.lowPct) / 100),
    high: Math.round((ftp * p.highPct) / 100),
  }));
}

export function recalculateRunPaceZones(thresholdPace: string): PaceZone[] {
  const tSeconds = paceToSeconds(thresholdPace);
  const zones = [
    { zone: "E", name: "Easy", factor: 1.18 },
    { zone: "M", name: "Marathon", factor: 1.07 },
    { zone: "T", name: "Threshold", factor: 1.0 },
    { zone: "I", name: "Interval", factor: 0.89 },
    { zone: "R", name: "Repetition", factor: 0.82 },
  ];
  return zones.map((z) => ({
    zone: z.zone,
    name: z.name,
    pace: secondsToPace(Math.round(tSeconds * z.factor)),
  }));
}

export function recalculateSwimPaceZones(css: string): PaceZone[] {
  const cssSeconds = paceToSeconds(css);
  const offsets = [
    { zone: 1, name: "Recovery", offset: 20 },
    { zone: 2, name: "Aerobic", offset: 10 },
    { zone: 3, name: "Tempo", offset: 5 },
    { zone: 4, name: "Threshold", offset: 0 },
    { zone: 5, name: "VO2max", offset: -5 },
  ];
  return offsets.map((z) => ({
    zone: z.zone,
    name: z.name,
    offset: z.offset,
    pace: secondsToPace(cssSeconds + z.offset),
  }));
}
