"use client";

import { create } from "zustand";

type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

interface VpnState {
  connection: ConnectionState;
  selectedCountry: string | null;
  bytesIn: number;
  bytesOut: number;
  connectedSince: number | null;
  setCountry: (code: string) => void;
  connect: () => void;
  disconnect: () => void;
}

export const useVpnStore = create<VpnState>((set, get) => ({
  connection: "disconnected",
  selectedCountry: "CH",
  bytesIn: 0,
  bytesOut: 0,
  connectedSince: null,
  setCountry: (code) => set({ selectedCountry: code }),
  connect: () => {
    if (get().connection !== "disconnected") return;
    set({ connection: "connecting" });
    setTimeout(() => {
      set({ connection: "connected", connectedSince: Date.now() });
    }, 900);
  },
  disconnect: () => {
    set({ connection: "disconnected", connectedSince: null });
  },
}));
