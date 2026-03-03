'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import {
  Car, Search, Home, User, MapPin, SlidersHorizontal,
  Star, X, Navigation, Clock, DollarSign, Loader2, ChevronDown
} from 'lucide-react';
import type { SpotType } from '@/types';

// ============================================
// TYPES
// ============================================
interface ListingResult {
  id: string;
  host_id: string;
  title: string;
  description: string;
  spot_type: string;
  vehicle_size: string;
  address: string;
  city: string;
  zip_code: string;
  latitude: number;
  longitude: number;
  price_per_hour: number;
  photos: string[];
  instructions: string | null;
  distance_miles: number;
  average_rating: number;
  total_reviews: number;
}

const SPOT_TYPE_LABELS: Record<string, string> = {
  driveway: '🏠 Driveway',
  garage: '🏗️ Garage',
  private_lot: '🅿️ Private Lot',
  business: '🏢 Business',
  street: '🛣️ Street',
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function BrowsePage() {
  const supabase = createClient();

  // State
  const [listings, setListings] = useState<ListingResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedListing, setSelectedListing] = useState<ListingResult | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Filters
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [spotTypeFilter, setSpotTypeFilter] = useState<string>('');
  const [searchRadius, setSearchRadius] = useState(2);
  const [searchQuery, setSearchQuery] = useState('');

  // Map refs
  const mapDivRef = useRef<HTMLDivElement>(null);

  // ============================================
  // GET USER LOCATION
  // ============================================
  useEffect(() => {
    const defaultLocation = { lat: 40.7580, lng: -73.9855 };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          setUserLocation(defaultLocation);
        },
        { timeout: 5000 }
      );
    } else {
      setUserLocation(defaultLocation);
    }
  }, []);

  // ============================================
  // COMMUNICATE WITH MAP IFRAME
  // ============================================
  useEffect(() => {
    if (viewMode !== 'map' || !mapDivRef.current) return;

    const iframe = mapDivRef.current as unknown as HTMLIFrameElement;

    // Wait for iframe to load, then send markers
    const sendMarkers = () => {
      try {
        const iframeWin = iframe.contentWindow as any;
        if (iframeWin?.setMarkers) {
          iframeWin.setMarkers(listings);
        }
      } catch (e) {
        // iframe not ready yet
      }
    };

    iframe.addEventListener('load', sendMarkers);
    // Also try immediately in case already loaded
    sendMarkers();

    return () => iframe.removeEventListener('load', sendMarkers);
  }, [viewMode, listings]);

  // Update center when location changes
  useEffect(() => {
    if (viewMode !== 'map' || !mapDivRef.current || !userLocation) return;

    try {
      const iframe = mapDivRef.current as unknown as HTMLIFrameElement;
      const iframeWin = iframe.contentWindow as any;
      if (iframeWin?.setCenter) {
        iframeWin.setCenter(userLocation.lat, userLocation.lng);
        // Also re-send markers
        if (iframeWin?.setMarkers) {
          iframeWin.setMarkers(listings);
        }
      }
    } catch (e) {
      // iframe not ready
    }
  }, [userLocation, viewMode]);

  // Listen for marker clicks from iframe
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'marker-click') {
        setSelectedListing(event.data.listing);
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // ============================================
  // SEARCH BY LOCATION
  // ============================================
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery.trim())}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        setUserLocation({ lat, lng });
      }
    } catch (err) {
      console.error('Search geocoding failed:', err);
    }
  }

  // ============================================
  // SEARCH LISTINGS
  // ============================================
  const searchListings = useCallback(async () => {
    if (!userLocation) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('search_nearby_listings', {
        search_lat: userLocation.lat,
        search_lng: userLocation.lng,
        search_radius_miles: searchRadius,
        max_price: maxPrice ? Math.round(parseFloat(maxPrice) * 100) : null,
        spot_type_filter: spotTypeFilter || null,
      });

      if (error) throw error;
      setListings(data || []);
    } catch (err) {
      console.error('Search error:', err);
      setListings([]);
    }
    setLoading(false);
  }, [userLocation, searchRadius, maxPrice, spotTypeFilter]);

  useEffect(() => {
    searchListings();
  }, [searchListings]);

  // ============================================
  // FORMAT HELPERS
  // ============================================
  function formatPrice(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }

  function formatDistance(miles: number): string {
    if (miles < 0.1) return 'Nearby';
    return `${miles.toFixed(1)} mi`;
  }

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="min-h-dvh bg-surface-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-surface-100 sticky top-0 z-40">
        <div className="page-container flex items-center gap-3 h-16">
          <Link href="/" className="flex-shrink-0">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
          </Link>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by neighborhood or ZIP..."
              className="w-full pl-9 pr-4 py-2 bg-surface-100 rounded-xl text-sm text-surface-800 placeholder:text-surface-400 outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
            />
          </form>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              showFilters ? 'bg-brand-500 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
            }`}
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="page-container py-4 border-t border-surface-100 bg-white">
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 bg-surface-50 rounded-xl px-3 py-2">
                <DollarSign className="w-4 h-4 text-surface-400" />
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="Max $/hr"
                  className="w-20 bg-transparent text-sm outline-none text-surface-700 placeholder:text-surface-400"
                  min="0"
                  step="1"
                />
              </div>
              <div className="relative">
                <select
                  value={spotTypeFilter}
                  onChange={(e) => setSpotTypeFilter(e.target.value)}
                  className="appearance-none bg-surface-50 rounded-xl pl-3 pr-8 py-2 text-sm text-surface-700 outline-none cursor-pointer"
                >
                  <option value="">All types</option>
                  <option value="driveway">Driveway</option>
                  <option value="garage">Garage</option>
                  <option value="private_lot">Private Lot</option>
                  <option value="business">Business</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
              </div>
              <div className="flex items-center gap-2 bg-surface-50 rounded-xl px-3 py-2">
                <Navigation className="w-4 h-4 text-surface-400" />
                <select
                  value={searchRadius}
                  onChange={(e) => setSearchRadius(parseInt(e.target.value))}
                  className="bg-transparent text-sm text-surface-700 outline-none cursor-pointer"
                >
                  <option value={1}>1 mile</option>
                  <option value={2}>2 miles</option>
                  <option value={5}>5 miles</option>
                  <option value={10}>10 miles</option>
                </select>
              </div>
              {(maxPrice || spotTypeFilter) && (
                <button
                  onClick={() => { setMaxPrice(''); setSpotTypeFilter(''); }}
                  className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 px-2"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* View toggle */}
      <div className="page-container py-3 flex items-center justify-between">
        <p className="text-sm text-surface-500">
          {loading ? 'Searching...' : `${listings.length} spot${listings.length !== 1 ? 's' : ''} nearby`}
        </p>
        <div className="flex bg-surface-100 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('list')}
            className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all ${
              viewMode === 'list' ? 'bg-white text-surface-800 shadow-sm' : 'text-surface-500'
            }`}
          >
            List
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all ${
              viewMode === 'map' ? 'bg-white text-surface-800 shadow-sm' : 'text-surface-500'
            }`}
          >
            Map
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 page-container pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin mb-4" />
            <p className="text-surface-500 text-sm">Finding spots near you...</p>
          </div>
        ) : (
          <>
            {/* MAP VIEW */}
            {viewMode === 'map' && (
              <div
                className="rounded-2xl overflow-hidden border border-surface-200 relative"
                style={{ height: '60vh' }}
              >
                <iframe
                  ref={mapDivRef as any}
                  id="spotshare-map"
                  src={`/map.html?lat=${userLocation?.lat || 40.758}&lng=${userLocation?.lng || -73.9855}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="Map"
                />

                {/* Selected listing popup */}
                {selectedListing && (
                  <div className="absolute bottom-4 left-4 right-4 z-30">
                    <Link
                      href={`/listing/${selectedListing.id}`}
                      className="card flex overflow-hidden shadow-lg"
                    >
                      <div className="w-24 flex-shrink-0 bg-surface-100">
                        {selectedListing.photos.length > 0 ? (
                          <img src={selectedListing.photos[0]} alt={selectedListing.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center min-h-[80px]">
                            <Car className="w-6 h-6 text-surface-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 p-3">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-surface-900 text-sm truncate">{selectedListing.title}</h3>
                          <span className="font-bold text-brand-600 text-sm">{formatPrice(selectedListing.price_per_hour)}/hr</span>
                        </div>
                        <p className="text-xs text-surface-400">{SPOT_TYPE_LABELS[selectedListing.spot_type]} · {formatDistance(selectedListing.distance_miles)}</p>
                      </div>
                    </Link>
                    <button
                      onClick={(e) => { e.preventDefault(); setSelectedListing(null); }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full shadow flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-surface-500" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* LIST VIEW */}
            {viewMode === 'list' && (
              <>
                {listings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 bg-surface-100 rounded-full flex items-center justify-center mb-6">
                      <MapPin className="w-10 h-10 text-surface-300" />
                    </div>
                    <h2 className="font-display font-bold text-xl text-surface-800 mb-2">
                      No spots found nearby
                    </h2>
                    <p className="text-surface-500 text-sm mb-6 max-w-xs">
                      Try expanding your search radius or adjusting your filters.
                      New spots are added every day.
                    </p>
                    <button
                      onClick={() => { setSearchRadius(5); setMaxPrice(''); setSpotTypeFilter(''); }}
                      className="btn-primary"
                    >
                      Widen search to 5 miles
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {listings.map(listing => (
                      <Link
                        key={listing.id}
                        href={`/listing/${listing.id}`}
                        className="card flex overflow-hidden group"
                      >
                        <div className="w-28 sm:w-36 flex-shrink-0 bg-surface-100">
                          {listing.photos.length > 0 ? (
                            <img src={listing.photos[0]} alt={listing.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Car className="w-8 h-8 text-surface-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 p-4 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-semibold text-surface-900 text-sm truncate group-hover:text-brand-600 transition-colors">
                              {listing.title}
                            </h3>
                            <span className="flex-shrink-0 font-bold text-brand-600 text-sm">
                              {formatPrice(listing.price_per_hour)}/hr
                            </span>
                          </div>
                          <p className="text-xs text-surface-400 mb-2">
                            {SPOT_TYPE_LABELS[listing.spot_type] || listing.spot_type} · {formatDistance(listing.distance_miles)}
                          </p>
                          {listing.total_reviews > 0 && (
                            <div className="flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                              <span className="text-xs font-medium text-surface-700">
                                {listing.average_rating.toFixed(1)}
                              </span>
                              <span className="text-xs text-surface-400">
                                ({listing.total_reviews})
                              </span>
                            </div>
                          )}
                          {listing.description && (
                            <p className="text-xs text-surface-500 mt-1 line-clamp-1">
                              {listing.description}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-surface-100 sm:hidden z-50">
        <div className="flex items-center justify-around h-16">
          <Link href="/browse" className="flex flex-col items-center gap-1 text-brand-600">
            <Search className="w-5 h-5" />
            <span className="text-xs font-medium">Browse</span>
          </Link>
          <Link href="/host" className="flex flex-col items-center gap-1 text-surface-400 hover:text-brand-600">
            <Home className="w-5 h-5" />
            <span className="text-xs">Host</span>
          </Link>
          <Link href="/dashboard" className="flex flex-col items-center gap-1 text-surface-400 hover:text-brand-600">
            <User className="w-5 h-5" />
            <span className="text-xs">Me</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
