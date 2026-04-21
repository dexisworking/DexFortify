"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type FortifyLabStatus = "idle" | "playing" | "paused" | "won" | "lost";

export type FortifyLabState = {
  score: number;
  blocked: number;
  breaches: number;
  loadPct: number;
  status: FortifyLabStatus;
  levelName: string;
  winTarget: number;
  completedLevelIds: string[];
  totalGraduated: boolean;
};

const defaultState: FortifyLabState = {
  score: 0,
  blocked: 0,
  breaches: 0,
  loadPct: 0,
  status: "idle",
  levelName: "",
  winTarget: 500,
  completedLevelIds: [],
  totalGraduated: false,
};

type FortifyLabContextValue = {
  state: FortifyLabState;
  setLabState: (partial: Partial<FortifyLabState> | ((prev: FortifyLabState) => FortifyLabState)) => void;
};

const FortifyLabContext = createContext<FortifyLabContextValue | null>(null);

export function FortifyLabProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FortifyLabState>(defaultState);

  const setLabState = useCallback(
    (partial: Partial<FortifyLabState> | ((prev: FortifyLabState) => FortifyLabState)) => {
      setState((prev) => (typeof partial === "function" ? partial(prev) : { ...prev, ...partial }));
    },
    []
  );

  const value = useMemo(() => ({ state, setLabState }), [state, setLabState]);

  return <FortifyLabContext.Provider value={value}>{children}</FortifyLabContext.Provider>;
}

export function useFortifyLab() {
  const ctx = useContext(FortifyLabContext);
  if (!ctx) {
    throw new Error("useFortifyLab must be used within FortifyLabProvider");
  }
  return ctx;
}
