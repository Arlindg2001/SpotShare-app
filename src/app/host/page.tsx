'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Car, ArrowLeft, ArrowRight, Camera, X, DollarSign,
  Home, MapPin, Clock, Info, Check, Loader2,
  Search, User
} from 'lucide-react';
import type { SpotType, VehicleSize, DayOfWeek } from '@/types';

// ============================================
// TYPES
// ============================================
interface AvailabilityDay {
  enabled: boolean;
  start: string;
  end: string;
}

type AvailabilitySchedule = Record<DayOfWeek, AvailabilityDay>;

const DAYS: { key: DayOfWeek; label: string; short: string }[] = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
];

const SPOT_TYPES: { value: SpotType; label: string; icon: string }[] = [
  { value: 'driveway', label: 'Driveway', icon: '🏠' },
  { value: 'garage', label: 'Garage', icon: '🏗️' },
  { value: 'private_lot', label: 'Private Lot', icon: '🅿️' },
  { value: 'business', label: 'Business Spot', icon: '🏢' },
];

const VEHICLE_SIZES: { value: VehicleSize; label: string; desc: string }[] = [
  { value: 'compact', label: 'Compact', desc: 'Sedans, small SUVs' },
  { value: 'standard', label: 'Standard', desc: 'Most cars & SUVs' },
  { value: 'large', label: 'Large', desc: 'Trucks, vans, full-size SUVs' },
  { value: 'any', label: 'Any size', desc: 'No restrictions' },
];

const defaultSchedule: AvailabilitySchedule = {
  monday: { enabled: true, start: '08:00', end: '22:00' },
  tuesday: { enabled: true, start: '08:00', end: '22:00' },
  wednesday: { enabled: true, start: '08:00', end: '22:00' },
  thursday: { enabled: true, start: '08:00', end: '22:00' },
  friday: { enabled: true, start: '08:00', end: '22:00' },
  saturday: { enabled: true, start: '08:00', end: '22:00' },
  sunday: { enabled: true, start: '08:00', end: '22:00' },
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function HostPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Basic info
  const [title, setTitle] = useState('');
  const [spotType, setSpotType] = useState<SpotType>('driveway');
  const [vehicleSize, setVehicleSize] = useState<VehicleSize>('standard');
  const [description, setDescription] = useState('');

  // Step 2: Location
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('New York');
  const [state, setState] = useState('NY');
  const [zipCode, setZipCode] = useState('');
  const [instructions, setInstructions] = useState('');

  // Step 3: Photos
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  // Step 4: Pricing & availability
  const [pricePerHour, setPricePerHour] = useState('');
  const [schedule, setSchedule] = useState<AvailabilitySchedule>(defaultSchedule);

  // ============================================
  // PHOTO HANDLING
  // ============================================
  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 5) {
      setError('Maximum 5 photos allowed');
      return;
    }
    setError(null);

    const newPhotos = [...photos, ...files].slice(0, 5);
    setPhotos(newPhotos);

    // Generate previews
    const newPreviews = newPhotos.map(file => URL.createObjectURL(file));
    // Clean up old preview URLs
    photoPreviews.forEach(url => URL.revokeObjectURL(url));
    setPhotoPreviews(newPreviews);
  }

  function removePhoto(index: number) {
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  }

  // ============================================
  // SCHEDULE HANDLING
  // ============================================
  function toggleDay(day: DayOfWeek) {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled }
    }));
  }

  function updateDayTime(day: DayOfWeek, field: 'start' | 'end', value: string) {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  }

  // ============================================
  // VALIDATION
  // ============================================
  function canProceed(): boolean {
    switch (step) {
      case 1: return title.trim().length > 0;
      case 2: return address.trim().length > 0 && zipCode.trim().length >= 5;
      case 3: return true; // Photos optional
      case 4: return parseFloat(pricePerHour) > 0;
      default: return false;
    }
  }

  // ============================================
  // SUBMIT
  // ============================================
  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      // Upload photos
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const fileName = `${user.id}/${Date.now()}-${photo.name}`;
        const { data, error: uploadError } = await supabase.storage
          .from('listing-photos')
          .upload(fileName, photo);
        
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('listing-photos')
          .getPublicUrl(data.path);
        
        photoUrls.push(urlData.publicUrl);
      }

      // Geocode address using Google Maps Geocoding API
      let lat = 40.7128;
      let lng = -74.0060;
      
      try {
        const geocodeAddress = `${address.trim()}, ${city}, ${state} ${zipCode.trim()}`;
        const geocodeResponse = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(geocodeAddress)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
        );
        const geocodeData = await geocodeResponse.json();
        
        if (geocodeData.results && geocodeData.results.length > 0) {
          lat = geocodeData.results[0].geometry.location.lat;
          lng = geocodeData.results[0].geometry.location.lng;
        }
      } catch (geoErr) {
        console.error('Geocoding failed, using default coordinates:', geoErr);
      }

      // Create listing
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .insert({
          host_id: user.id,
          title: title.trim(),
          description: description.trim(),
          spot_type: spotType,
          vehicle_size: vehicleSize,
          address: address.trim(),
          city,
          state,
          zip_code: zipCode.trim(),
          latitude: lat,
          longitude: lng,
          price_per_hour: Math.round(parseFloat(pricePerHour) * 100),
          photos: photoUrls,
          instructions: instructions.trim() || null,
          is_active: true,
        })
        .select()
        .single();

      if (listingError) throw listingError;

      // Create availability schedule
      const availabilityRows = DAYS
        .filter(d => schedule[d.key].enabled)
        .map(d => ({
          listing_id: listing.id,
          day_of_week: d.key,
          start_time: schedule[d.key].start,
          end_time: schedule[d.key].end,
          is_available: true,
        }));

      if (availabilityRows.length > 0) {
        const { error: availError } = await supabase
          .from('availability')
          .insert(availabilityRows);
        
        if (availError) throw availError;
      }

      // Update user role to host or both
      await supabase
        .from('profiles')
        .update({ role: 'both' })
        .eq('id', user.id);

      // Success - go to dashboard
      router.push('/dashboard');
      router.refresh();

    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  // ============================================
  // STEP CONTENT
  // ============================================
  const totalSteps = 4;

  return (
    <div className="min-h-dvh bg-surface-50">
      {/* Header */}
      <header className="bg-white border-b border-surface-100 sticky top-0 z-50">
        <div className="page-container flex items-center justify-between h-16">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : router.back()}
            className="flex items-center gap-2 text-surface-600 hover:text-surface-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">
              {step > 1 ? 'Back' : 'Cancel'}
            </span>
          </button>

          <span className="text-sm text-surface-400">
            Step {step} of {totalSteps}
          </span>

          <div className="w-16" /> {/* Spacer for centering */}
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-surface-100">
          <div
            className="h-full bg-brand-500 transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </header>

      {/* Content */}
      <div className="page-container max-w-lg mx-auto py-8 pb-32">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* ==================== STEP 1: BASICS ==================== */}
        {step === 1 && (
          <div>
            <h1 className="font-display font-bold text-2xl text-surface-900 mb-2">
              Describe your spot
            </h1>
            <p className="text-surface-500 mb-8">
              Tell drivers what kind of parking you&apos;re offering.
            </p>

            {/* Title */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-surface-700 mb-1.5">
                Listing title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field"
                placeholder='e.g. "Covered driveway near Yankee Stadium"'
                maxLength={80}
              />
              <p className="text-xs text-surface-400 mt-1">{title.length}/80</p>
            </div>

            {/* Spot type */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-surface-700 mb-3">
                Spot type
              </label>
              <div className="grid grid-cols-2 gap-3">
                {SPOT_TYPES.map(type => (
                  <button
                    key={type.value}
                    onClick={() => setSpotType(type.value)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                      spotType === type.value
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-surface-200 bg-white hover:border-surface-300'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{type.icon}</span>
                    <span className={`text-sm font-medium ${
                      spotType === type.value ? 'text-brand-700' : 'text-surface-700'
                    }`}>
                      {type.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Vehicle size */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-surface-700 mb-3">
                What size vehicles fit?
              </label>
              <div className="space-y-2">
                {VEHICLE_SIZES.map(size => (
                  <button
                    key={size.value}
                    onClick={() => setVehicleSize(size.value)}
                    className={`w-full p-3 rounded-xl border-2 text-left flex items-center justify-between transition-all ${
                      vehicleSize === size.value
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-surface-200 bg-white hover:border-surface-300'
                    }`}
                  >
                    <div>
                      <span className={`text-sm font-medium ${
                        vehicleSize === size.value ? 'text-brand-700' : 'text-surface-700'
                      }`}>
                        {size.label}
                      </span>
                      <span className="text-xs text-surface-400 ml-2">{size.desc}</span>
                    </div>
                    {vehicleSize === size.value && (
                      <Check className="w-5 h-5 text-brand-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">
                Description <span className="text-surface-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field resize-none"
                rows={3}
                placeholder="Any details drivers should know? E.g. surface type, lighting, nearby landmarks..."
                maxLength={500}
              />
            </div>
          </div>
        )}

        {/* ==================== STEP 2: LOCATION ==================== */}
        {step === 2 && (
          <div>
            <h1 className="font-display font-bold text-2xl text-surface-900 mb-2">
              Where is your spot?
            </h1>
            <p className="text-surface-500 mb-8">
              Drivers will get directions to this address after booking.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Street address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="input-field"
                  placeholder="123 Main Street"
                  autoComplete="street-address"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="input-field"
                    placeholder="New York"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">
                    State
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="input-field"
                    maxLength={2}
                    placeholder="NY"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">
                    ZIP code
                  </label>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    className="input-field"
                    placeholder="10001"
                    maxLength={5}
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700">
                  Your exact address is only shown to drivers after they book. 
                  On the map, your spot appears as an approximate location.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Special instructions <span className="text-surface-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="input-field resize-none"
                  rows={3}
                  placeholder="E.g. gate code, which side of the driveway, where to park..."
                  maxLength={300}
                />
              </div>
            </div>
          </div>
        )}

        {/* ==================== STEP 3: PHOTOS ==================== */}
        {step === 3 && (
          <div>
            <h1 className="font-display font-bold text-2xl text-surface-900 mb-2">
              Add photos
            </h1>
            <p className="text-surface-500 mb-8">
              Spots with photos get 3x more bookings. Show drivers what to expect.
            </p>

            {/* Photo upload area */}
            <div className="space-y-4">
              {/* Upload button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={photos.length >= 5}
                className="w-full border-2 border-dashed border-surface-300 rounded-2xl p-8 flex flex-col items-center gap-3 hover:border-brand-400 hover:bg-brand-50/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-14 h-14 bg-surface-100 rounded-full flex items-center justify-center">
                  <Camera className="w-7 h-7 text-surface-500" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-surface-700">
                    {photos.length === 0 ? 'Upload photos' : 'Add more photos'}
                  </p>
                  <p className="text-xs text-surface-400 mt-1">
                    {photos.length}/5 photos · JPG, PNG up to 10MB
                  </p>
                </div>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handlePhotoSelect}
                className="hidden"
              />

              {/* Photo previews */}
              {photoPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {photoPreviews.map((preview, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-surface-100">
                      <img src={preview} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removePhoto(i)}
                        className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                      {i === 0 && (
                        <span className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-2 py-0.5 rounded-full">
                          Cover
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {photos.length === 0 && (
                <p className="text-sm text-surface-400 text-center">
                  You can add photos later, but we recommend at least one.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ==================== STEP 4: PRICING & AVAILABILITY ==================== */}
        {step === 4 && (
          <div>
            <h1 className="font-display font-bold text-2xl text-surface-900 mb-2">
              Set your price & schedule
            </h1>
            <p className="text-surface-500 mb-8">
              You keep 85% of every booking. We take a 15% platform fee.
            </p>

            {/* Price */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-surface-700 mb-1.5">
                Hourly rate
              </label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  type="number"
                  value={pricePerHour}
                  onChange={(e) => setPricePerHour(e.target.value)}
                  className="input-field pl-10 text-2xl font-bold"
                  placeholder="0.00"
                  min="1"
                  max="100"
                  step="0.50"
                  inputMode="decimal"
                />
              </div>
              {parseFloat(pricePerHour) > 0 && (
                <div className="mt-3 p-3 bg-brand-50 rounded-xl">
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-600">Driver pays</span>
                    <span className="font-medium text-surface-800">${parseFloat(pricePerHour).toFixed(2)}/hr</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-surface-600">Platform fee (15%)</span>
                    <span className="text-surface-500">-${(parseFloat(pricePerHour) * 0.15).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-brand-200 mt-2 pt-2 flex justify-between text-sm">
                    <span className="font-medium text-brand-700">You earn</span>
                    <span className="font-bold text-brand-700">${(parseFloat(pricePerHour) * 0.85).toFixed(2)}/hr</span>
                  </div>
                </div>
              )}
            </div>

            {/* Availability */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-3">
                Available hours
              </label>
              <div className="space-y-2">
                {DAYS.map(day => (
                  <div
                    key={day.key}
                    className={`p-3 rounded-xl border transition-all ${
                      schedule[day.key].enabled
                        ? 'border-surface-200 bg-white'
                        : 'border-surface-100 bg-surface-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => toggleDay(day.key)}
                        className="flex items-center gap-3"
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                          schedule[day.key].enabled
                            ? 'bg-brand-500 border-brand-500'
                            : 'border-surface-300'
                        }`}>
                          {schedule[day.key].enabled && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <span className={`text-sm font-medium ${
                          schedule[day.key].enabled ? 'text-surface-800' : 'text-surface-400'
                        }`}>
                          {day.short}
                        </span>
                      </button>

                      {schedule[day.key].enabled && (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={schedule[day.key].start}
                            onChange={(e) => updateDayTime(day.key, 'start', e.target.value)}
                            className="text-sm border border-surface-200 rounded-lg px-2 py-1 text-surface-700"
                          />
                          <span className="text-surface-400 text-xs">to</span>
                          <input
                            type="time"
                            value={schedule[day.key].end}
                            onChange={(e) => updateDayTime(day.key, 'end', e.target.value)}
                            className="text-sm border border-surface-200 rounded-lg px-2 py-1 text-surface-700"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-surface-100 p-4 z-50">
        <div className="max-w-lg mx-auto">
          {step < totalSteps ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canProceed() || submitting}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Publish your spot
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
