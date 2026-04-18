'use client';

import { useEffect, useRef } from 'react';

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
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Load Leaflet CSS
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    const loadLeaflet = (): Promise<any> => {
      if ((window as any).L) return Promise.resolve((window as any).L);

      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
        script.onload = () => resolve((window as any).L);
        document.head.appendChild(script);
      });
    };

    loadLeaflet().then((L) => {
      if (!mapRef.current || mapInstanceRef.current) return;

      const map = L.map(mapRef.current).setView([31.5, 34.8], 7);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      points.forEach((point) => {
        const marker = L.marker([point.locationLat, point.locationLng]).addTo(map);
        marker.bindPopup(`
          <div style="text-align:right; direction:rtl; min-width:160px;">
            <div style="font-weight:bold; margin-bottom:4px;">${point.company.name}</div>
            <div style="font-size:12px; color:#666; margin-bottom:4px;">${point.name}</div>
            <div style="font-size:11px; color:#999; margin-bottom:6px;">
              📍 ${point.location} &bull; ${point._count?.attendances || 0} חיילים
            </div>
            <a href="/battalion/companies/${point.company.id}"
               style="font-size:12px; color:#2563eb; text-decoration:none; font-weight:500;">
              צפה בפלוגה ←
            </a>
          </div>
        `);
      });

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [points]);

  return (
    <div
      ref={mapRef}
      className="h-[400px] rounded-lg overflow-hidden border border-gray-200"
    />
  );
}
