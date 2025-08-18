// /app/components/LocationButton.tsx
'use client'

import { useRouter } from 'next/navigation'
import { MapPin } from 'lucide-react'
import { useLocation } from '@/app/contexts/LocationContext' // Import the new hook

export default function LocationButton() {
  const { location, setLocation } = useLocation(); // Use the global context
  const router = useRouter();

  const handleSetLocation = () => {
    const newLocation = prompt("Please enter your City, State, or ZIP code:", location || "");

    if (newLocation && newLocation.trim() !== "") {
      setLocation(newLocation.trim());
      router.refresh(); // Refresh to ensure server components also know about the new location if needed
    }
  };

  return (
    <button onClick={handleSetLocation} className="flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors">
      <MapPin className="w-4 h-4 mr-1.5" />
      {location ? <span>{location}</span> : <span>Set Location</span>}
    </button>
  );
}
