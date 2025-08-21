// /app/contexts/LocationContext.tsx
'use client'

import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';

interface LocationContextType {
  location: string | null;
  setLocation: (location: string | null) => void;
  user: User | null;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocationState] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // Check for user session
    supabase.auth.getUser().then(({ data: { user } }) => {
        setUser(user);
    });

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
      // If user is logged in, also save to their profile
      if (user) {
        updateUserProfile(newLocation);
      }
    } else {
      localStorage.removeItem('skillstrong-location');
    }
  };

  const updateUserProfile = async (newLocation: string) => {
    if (!user) return;
    await supabase
      .from('profiles')
      .update({ zip_code: newLocation })
      .eq('id', user.id);
  };

  return (
    <LocationContext.Provider value={{ location, setLocation, user }}>
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
