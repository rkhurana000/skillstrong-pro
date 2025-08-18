// /app/contexts/LocationContext.tsx
'use client'

import { createContext, useState, useEffect, useContext, ReactNode } from 'react';

interface LocationContextType {
  location: string | null;
  setLocation: (location: string | null) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocationState] = useState<string | null>(null);

  useEffect(() => {
    // On initial load, try to get the location from localStorage
    const savedLocation = localStorage.getItem('skillstrong-location');
    if (savedLocation) {
      setLocationState(savedLocation);
    }
  }, []);

  const setLocation = (newLocation: string | null) => {
    setLocationState(newLocation);
    if (newLocation) {
      localStorage.setItem('skillstrong-location', newLocation);
    } else {
      localStorage.removeItem('skillstrong-location');
    }
  };

  return (
    <LocationContext.Provider value={{ location, setLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
