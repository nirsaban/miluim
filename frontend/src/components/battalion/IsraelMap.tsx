'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface MapPoint {
  id: string;
  name: string;
  location: string;
  locationLat: number;
  locationLng: number;
  company: {
    id: string;
    name: string;
    code: string;
    _count?: { users: number };
  };
  _count?: { attendances: number };
}

interface IsraelMapProps {
  points: MapPoint[];
}

export function IsraelMap({ points }: IsraelMapProps) {
  const [MapComponents, setMapComponents] = useState<any>(null);

  useEffect(() => {
    // Dynamic import to avoid SSR issues with Leaflet
    (async () => {
      const L = await import('leaflet');
      const RL = await import('react-leaflet');

      // Fix default marker icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      setMapComponents({ L, ...RL });
    })();
  }, []);

  if (!MapComponents) {
    return (
      <div className="h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
        <span className="text-gray-400">טוען מפה...</span>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup } = MapComponents;

  // Israel center
  const center: [number, number] = [31.5, 34.8];

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
      />
      <div className="h-[400px] rounded-lg overflow-hidden border border-gray-200">
        <MapContainer
          center={center}
          zoom={7}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {points.map((point) => (
            <Marker
              key={point.id}
              position={[point.locationLat, point.locationLng]}
            >
              <Popup>
                <div className="text-right min-w-[180px]" dir="rtl">
                  <div className="font-bold text-sm mb-1">{point.company.name}</div>
                  <div className="text-xs text-gray-600 mb-1">{point.name}</div>
                  <div className="text-xs text-gray-500 mb-2">
                    📍 {point.location} &bull; {point._count?.attendances || 0} חיילים
                  </div>
                  <Link
                    href={`/battalion/companies/${point.company.id}`}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    צפה בפלוגה &larr;
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </>
  );
}
