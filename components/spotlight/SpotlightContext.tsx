"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type SpotlightContextType = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  openSpotlight: () => void;
  closeSpotlight: () => void;
};

const SpotlightContext = createContext<SpotlightContextType | null>(null);

export function SpotlightProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openSpotlight = useCallback(() => setIsOpen(true), []);
  const closeSpotlight = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({
      isOpen,
      setIsOpen,
      openSpotlight,
      closeSpotlight,
    }),
    [isOpen, openSpotlight, closeSpotlight],
  );

  return (
    <SpotlightContext.Provider value={value}>
      {children}
    </SpotlightContext.Provider>
  );
}

export function useSpotlight(): SpotlightContextType {
  const context = useContext(SpotlightContext);
  if (!context) {
    return {
      isOpen: false,
      setIsOpen: () => {},
      openSpotlight: () => {},
      closeSpotlight: () => {},
    };
  }
  return context;
}
