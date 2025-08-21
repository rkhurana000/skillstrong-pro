// /app/components/LocationButton.tsx
'use client'

import { useRouter } from 'next/navigation'
import { MapPin } from 'lucide-react'
import { useLocation } from '@/app/contexts/LocationContext'

export default function LocationButton() {
  const { location, setLocation } = useLocation();
  const router = useRouter();

  const handleSetLocation = () => {
    const newLocation = prompt("Please enter your City, State, or ZIP code:", location || "");

    if (newLocation && newLocation.trim() !== "") {
      setLocation(newLocation.trim());
      // A slight delay to ensure state has time to update before refresh
      setTimeout(() => router.refresh(), 100);
    }
  };

  return (
    <button onClick={handleSetLocation} className="flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors">
      <MapPin className="w-4 h-4 mr-1.5" />
      {location ? <span>{location}</span> : <span>Set Location</span>}
    </button>
  );
}
