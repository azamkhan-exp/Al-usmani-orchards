'use client';

import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Truck,
  Clock,
  Banknote,
  AlertTriangle,
  ChevronDown,
  Search,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { safeFetchJson } from '@/lib/api-client';

export interface SelectedLocationDetails {
  province: string;
  district: string;
  city: string;
  area: string;
  deliveryFee: number;
  estimatedDays: string;
  codAvailable: boolean;
  isServiceable: boolean;
}

interface PakistanLocationSelectorProps {
  initialProvince?: string;
  initialDistrict?: string;
  initialCity?: string;
  initialArea?: string;
  onLocationChange: (loc: SelectedLocationDetails) => void;
}

export default function PakistanLocationSelector({
  initialProvince = 'Punjab',
  initialDistrict = 'Lahore',
  initialCity = 'Lahore',
  initialArea = '',
  onLocationChange
}: PakistanLocationSelectorProps) {
  const [provinces, setProvinces] = useState<string[]>([
    'Punjab',
    'Islamabad Capital Territory',
    'Sindh',
    'Khyber Pakhtunkhwa',
    'Balochistan',
    'Azad Jammu & Kashmir',
    'Gilgit-Baltistan'
  ]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [cities, setCities] = useState<any[]>([]);

  const [province, setProvince] = useState(initialProvince);
  const [district, setDistrict] = useState(initialDistrict);
  const [city, setCity] = useState(initialCity);
  const [area, setArea] = useState(initialArea);
  const [selectedLocId, setSelectedLocId] = useState<string>('');

  const [deliveryFee, setDeliveryFee] = useState(350);
  const [estimatedDays, setEstimatedDays] = useState('24 Hours Cold-Chain Express');
  const [codAvailable, setCodAvailable] = useState(true);
  const [isServiceable, setIsServiceable] = useState(true);
  const [loading, setLoading] = useState(false);

  // 1. Fetch provinces on mount
  useEffect(() => {
    safeFetchJson<any>('/api/locations?action=provinces')
      .then((res) => {
        if (res?.provinces && Array.isArray(res.provinces)) {
          setProvinces(res.provinces);
        }
      })
      .catch(() => {});
  }, []);

  // 2. When province changes, fetch districts
  useEffect(() => {
    if (!province) return;
    setLoading(true);
    safeFetchJson<any>(`/api/locations?action=districts&province=${encodeURIComponent(province)}`)
      .then((res) => {
        if (res?.districts && Array.isArray(res.districts)) {
          setDistricts(res.districts);
          if (!res.districts.includes(district)) {
            setDistrict(res.districts[0] || '');
            setSelectedLocId('');
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [province]);

  // 3. When district or province changes, fetch cities
  useEffect(() => {
    if (!province || !district) return;
    setLoading(true);
    safeFetchJson<any>(`/api/locations?action=cities&province=${encodeURIComponent(province)}&district=${encodeURIComponent(district)}`)
      .then((res) => {
        if (res?.cities && Array.isArray(res.cities)) {
          setCities(res.cities);
          const found = res.cities.find((c: any) =>
            (selectedLocId && c.id === selectedLocId) ||
            (c.city.toLowerCase() === city.toLowerCase() && (!area || c.area === area)) ||
            (c.city.toLowerCase() === city.toLowerCase())
          );
          if (found) {
            setSelectedLocId(found.id || '');
            setCity(found.city);
            setDeliveryFee(found.delivery_fee);
            setEstimatedDays(found.estimated_delivery_days);
            setCodAvailable(found.cod_available === 1);
            setIsServiceable(found.is_serviceable === 1);
          } else if (res.cities.length > 0) {
            const first = res.cities[0];
            setSelectedLocId(first.id || '');
            setCity(first.city);
            setDeliveryFee(first.delivery_fee);
            setEstimatedDays(first.estimated_delivery_days);
            setCodAvailable(first.cod_available === 1);
            setIsServiceable(first.is_serviceable === 1);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [province, district]);

  // 4. When city/area selection changes
  const handleLocationSelect = (selectedIdOrName: string) => {
    const selected = cities.find((c: any) => c.id === selectedIdOrName || c.city === selectedIdOrName);
    if (selected) {
      setSelectedLocId(selected.id || '');
      setCity(selected.city);
      if (selected.area && !area) {
        setArea(selected.area);
      }
      setDeliveryFee(selected.delivery_fee);
      setEstimatedDays(selected.estimated_delivery_days);
      setCodAvailable(selected.cod_available === 1);
      setIsServiceable(selected.is_serviceable === 1);
    }
  };

  // Broadcast any changes to parent
  useEffect(() => {
    onLocationChange({
      province,
      district,
      city,
      area,
      deliveryFee,
      estimatedDays,
      codAvailable,
      isServiceable
    });
  }, [province, district, city, area, deliveryFee, estimatedDays, codAvailable, isServiceable]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Province / Region */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
            Province / Region *
          </label>
          <div className="relative">
            <select
              value={province}
              onChange={(e) => {
                setProvince(e.target.value);
                setSelectedLocId('');
              }}
              className="w-full text-sm font-medium py-2.5 px-3.5 bg-white border border-stone-300 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-900/20 focus:border-emerald-900 shadow-sm pr-10"
            >
              {provinces.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          </div>
        </div>

        {/* District */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
            District *
          </label>
          <div className="relative">
            <select
              value={district}
              onChange={(e) => {
                setDistrict(e.target.value);
                setSelectedLocId('');
              }}
              disabled={loading || districts.length === 0}
              className="w-full text-sm font-medium py-2.5 px-3.5 bg-white border border-stone-300 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-900/20 focus:border-emerald-900 shadow-sm pr-10 disabled:bg-stone-50"
            >
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* City / Town */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
            City / Town *
          </label>
          <div className="relative">
            <select
              value={selectedLocId || (cities.find(c => c.city.toLowerCase() === city.toLowerCase())?.id) || city}
              onChange={(e) => handleLocationSelect(e.target.value)}
              disabled={loading || cities.length === 0}
              className="w-full text-sm font-medium py-2.5 px-3.5 bg-white border border-stone-300 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-900/20 focus:border-emerald-900 shadow-sm pr-10 disabled:bg-stone-50"
            >
              {cities.map((c: any, idx: number) => {
                const uniqueKey = c.id ? `city-${c.id}` : `city-${c.city}-${c.area || idx}`;
                return (
                  <option key={uniqueKey} value={c.id || c.city}>
                    {c.city} {c.area ? `(${c.area})` : ''}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          </div>
        </div>

        {/* Area / Sector / Colony */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
            Area / Colony / Sector (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. DHA Phase 5, Cantt, Gulberg, Model Town"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="w-full text-sm font-medium py-2.5 px-3.5 bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-900/20 focus:border-emerald-900 shadow-sm"
          />
        </div>
      </div>

      {/* Dynamic Delivery Service Card */}
      <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-900 text-amber-400 rounded-lg shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-emerald-950 flex items-center gap-2">
              <span>{city}, {district}</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold tracking-wide uppercase">
                Direct Express Network
              </span>
            </div>
            <div className="text-emerald-800/90 flex items-center gap-1.5 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-emerald-700" />
              <span>Est. Transit: <strong>{estimatedDays}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-emerald-200/60">
          <div className="text-right">
            <span className="text-[11px] text-stone-500 block">Cold-Chain Fee</span>
            <span className="font-bold text-sm text-stone-900">PKR {deliveryFee.toLocaleString()}</span>
          </div>

          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-900 text-xs font-semibold shadow-xs">
            <Banknote className="w-3.5 h-3.5 text-emerald-700" />
            {codAvailable ? 'COD Eligible' : 'Prepaid Only'}
          </div>
        </div>
      </div>

      {/* Unserviceable Warning if marked 0 */}
      {!isServiceable && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Special Transit Region</p>
            <p className="mt-0.5 text-amber-800">
              {city} is outside our daily cold-chain courier zone. We can still dispatch your harvest via dedicated temperature-controlled air/cargo transit. Please coordinate with our concierge via WhatsApp for booking.
            </p>
            <a
              href="https://wa.me/923008472910?text=Salam%2C%20I%20would%20like%20to%20order%20mangoes%20for%20delivery%20to%20"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-emerald-900 font-bold hover:underline"
            >
              WhatsApp Orchard Concierge <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
