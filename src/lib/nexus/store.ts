// Small client store persisted to this browser's localStorage (no backend is connected).
import { useSyncExternalStore } from "react";
import type { AlertStatus, Thresholds } from "./alerts";

export interface AlertOverride { status: AlertStatus; note?: string; updatedAt: string }
export interface NexusState {
  thresholds: Thresholds;
  channels: { inApp: boolean; sms: boolean; email: boolean };
  autoCheck: boolean;
  alertOverrides: Record<string, AlertOverride>;
  readIds: string[];
  completedActions: string[];
  lastCheckAt: string | null;
}

export const DEFAULT_STATE: NexusState = {
  thresholds: { cholera: 0.5, typhoid: 0.5 },
  channels: { inApp: true, sms: false, email: false },
  autoCheck: true,
  alertOverrides: {},
  readIds: [],
  completedActions: [],
  lastCheckAt: null,
};

const KEY = "nexus-mumbai-state-v1";
let state: NexusState = DEFAULT_STATE;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    state = DEFAULT_STATE;
  }
}

export function setNexus(updater: (s: NexusState) => NexusState) {
  load();
  state = updater(state);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useNexus(): NexusState {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return state;
    },
    () => DEFAULT_STATE,
  );
}
