// /app/components/LocationButton.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

interface LocationButtonProps {
  initialLocation: string | null;
  user: User | null;
}

export default function LocationButton({ initialLocation, user }: LocationButtonProps) {
  const [location, setLocation] = useState(initialLocation);
  const router = useRouter();

  useEffect(() => {
    // Sync with localStorage for logged out users on initial load
    if (!user) {
      const savedLocation = localStorage.getItem('skillstrong-location');
      if (savedLocation) {
        setLocation(savedLocation);
      }
    } else {
      setLocation(initialLocation);
    }
  }, [initialLocation, user]);

  const handleSetLocation = async () => {
    const newLocation = prompt("Please enter your City, State, or ZIP code:", location || "");

    if (newLocation && newLocation.trim() !== "") {
      const trimmedLocation = newLocation.trim();
      setLocation(trimmedLocation);

      if (user) {
        // If logged in, save to database
        await fetch('/api/user/update-location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ location: trimmedLocation }),
        });
      } else {
        // If logged out, save to browser storage
        localStorage.setItem('skillstrong-location', trimmedLocation);
      }
      // Refresh the page's server components to get the new location
      router.refresh();
    }
  };

  return (
    <button onClick={handleSetLocation} className="flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors">
      <MapPin className="w-4 h-4 mr-1.5" />
      {location ? <span>{location}</span> : <span>Set Location</span>}
    </button>
  );
}
