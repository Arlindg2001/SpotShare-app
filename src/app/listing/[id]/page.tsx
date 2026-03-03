'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Car, ArrowLeft, Star, MapPin, Clock, Shield,
  ChevronLeft, ChevronRight, DollarSign, Check,
  Loader2, Calendar, Info
} from 'lucide-react';

// ============================================
// TYPES
// ============================================
interface ListingDetail {
  id: string;
  host_id: string;
  title: string;
  description: string;
  spot_type: string;
  vehicle_size: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  latitude: number;
  longitude: number;
  price_per_hour: number;
  photos: string[];
  instructions: string | null;
  is_active: boolean;
  created_at: string;
}

interface HostProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
}

interface AvailabilitySlot {
  day_of_week: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface ReviewData {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer: { full_name: string } | null;
}

const SPOT_TYPE_LABELS: Record<string, string> = {
  driveway: '🏠 Driveway',
  garage: '🏗️ Garage',
  private_lot: '🅿️ Private Lot',
  business: '🏢 Business',
  street: '🛣️ Street',
};

const VEHICLE_LABELS: Record<string, string> = {
  compact: 'Compact cars',
  standard: 'Standard vehicles',
  large: 'Large vehicles',
  any: 'Any vehicle size',
};

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_SHORT: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun'
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const listingId = params.id as string;

  // Data
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [host, setHost] = useState<HostProfile | null>(null);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Photo carousel
  const [photoIndex, setPhotoIndex] = useState(0);

  // Booking form
  const [hours, setHours] = useState(1);
  const [booking, setBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [isOwnListing, setIsOwnListing] = useState(false);

  // ============================================
  // LOAD DATA
  // ============================================
  useEffect(() => {
    async function loadListing() {
      try {
        // Get listing
        const { data: listingData, error: listingErr } = await supabase
          .from('listings')
          .select('*')
          .eq('id', listingId)
          .single();

        if (listingErr || !listingData) {
          setError('Listing not found');
          setLoading(false);
          return;
        }
        setListing(listingData);

        // Check if this is the user's own listing
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser && authUser.id === listingData.host_id) {
          setIsOwnListing(true);
        }

        // Get host profile
        const { data: hostData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, created_at')
          .eq('id', listingData.host_id)
          .single();
        setHost(hostData);

        // Get availability
        const { data: availData } = await supabase
          .from('availability')
          .select('day_of_week, start_time, end_time, is_available')
          .eq('listing_id', listingId)
          .eq('is_available', true);
        setAvailability(availData || []);

        // Get reviews
        const { data: reviewData } = await supabase
          .from('reviews')
          .select('id, rating, comment, created_at, reviewer:reviewer_id(full_name)')
          .eq('listing_id', listingId)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (reviewData && reviewData.length > 0) {
          setReviews(reviewData as any);
          const avg = reviewData.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewData.length;
          setAvgRating(avg);
        }

      } catch (err) {
        setError('Failed to load listing');
      }
      setLoading(false);
    }

    loadListing();
  }, [listingId]);

  // ============================================
  // BOOKING
  // ============================================
  async function handleBook() {
    if (!listing) return;
    setBooking(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/login?redirect=/listing/${listingId}`);
        return;
      }

      const now = new Date();
      const startTime = now.toISOString();
      const endTime = new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
      const subtotal = listing.price_per_hour * hours;
      const platformFee = Math.round(subtotal * 0.15);
      const hostPayout = subtotal - platformFee;

      // Prevent booking own listing
      if (user.id === listing.host_id) {
        setError("You can't book your own listing.");
        setBooking(false);
        return;
      }

      const { error: bookErr } = await supabase
        .from('bookings')
        .insert({
          listing_id: listing.id,
          driver_id: user.id,
          host_id: listing.host_id,
          start_time: startTime,
          end_time: endTime,
          duration_hours: hours,
          subtotal,
          platform_fee: platformFee,
          host_payout: hostPayout,
          status: 'confirmed',
        });

      if (bookErr) throw bookErr;
      setBookingSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Booking failed');
    }
    setBooking(false);
  }

  // ============================================
  // HELPERS
  // ============================================
  function formatPrice(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }

  function formatTime(timeStr: string): string {
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
  }

  // ============================================
  // LOADING / ERROR STATES
  // ============================================
  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-surface-50">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-dvh bg-surface-50 flex flex-col items-center justify-center p-6">
        <div className="card p-8 text-center max-w-sm">
          <MapPin className="w-12 h-12 text-surface-300 mx-auto mb-4" />
          <h1 className="font-display font-bold text-xl text-surface-900 mb-2">
            {error || 'Listing not found'}
          </h1>
          <p className="text-surface-500 text-sm mb-6">
            This spot may have been removed or is no longer available.
          </p>
          <Link href="/browse" className="btn-primary inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to browse
          </Link>
        </div>
      </div>
    );
  }

  // ============================================
  // BOOKING SUCCESS
  // ============================================
  if (bookingSuccess) {
    return (
      <div className="min-h-dvh bg-surface-50 flex flex-col items-center justify-center p-6">
        <div className="card p-8 text-center max-w-sm">
          <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-brand-600" />
          </div>
          <h1 className="font-display font-bold text-2xl text-surface-900 mb-2">
            Booked!
          </h1>
          <p className="text-surface-500 mb-2">
            Your spot at <span className="font-medium text-surface-700">{listing.title}</span> is confirmed.
          </p>
          <p className="text-sm text-surface-400 mb-6">
            {hours} hour{hours !== 1 ? 's' : ''} · {formatPrice(listing.price_per_hour * hours)} total
          </p>

          {listing.instructions && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-left mb-6">
              <p className="text-xs font-medium text-blue-700 mb-1">Parking instructions:</p>
              <p className="text-sm text-blue-800">{listing.instructions}</p>
            </div>
          )}

          <div className="space-y-3">
            <Link href="/dashboard" className="btn-primary w-full flex items-center justify-center gap-2">
              View my bookings
            </Link>
            <Link href="/browse" className="btn-secondary w-full flex items-center justify-center gap-2">
              Browse more spots
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================
  // Driver pays the listed price — fee comes out of it, not on top
  const total = listing.price_per_hour * hours;
  const platformFee = Math.round(total * 0.15);
  const hostEarns = total - platformFee;

  return (
    <div className="min-h-dvh bg-surface-50 pb-36">
      {/* Photo carousel */}
      <div className="relative bg-surface-200" style={{ height: '280px' }}>
        {listing.photos.length > 0 ? (
          <>
            <img
              src={listing.photos[photoIndex]}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
            {listing.photos.length > 1 && (
              <>
                <button
                  onClick={() => setPhotoIndex(i => i > 0 ? i - 1 : listing.photos.length - 1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 rounded-full flex items-center justify-center hover:bg-black/60"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={() => setPhotoIndex(i => i < listing.photos.length - 1 ? i + 1 : 0)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 rounded-full flex items-center justify-center hover:bg-black/60"
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/40 text-white text-xs px-2 py-1 rounded-full">
                  {photoIndex + 1}/{listing.photos.length}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Car className="w-16 h-16 text-surface-300" />
          </div>
        )}

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:bg-white"
        >
          <ArrowLeft className="w-5 h-5 text-surface-700" />
        </button>
      </div>

      {/* Content */}
      <div className="page-container -mt-4 relative z-10">
        <div className="card p-6 mb-4">
          {/* Title & price */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <h1 className="font-display font-bold text-xl text-surface-900">
              {listing.title}
            </h1>
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-lg text-brand-600">
                {formatPrice(listing.price_per_hour)}
              </p>
              <p className="text-xs text-surface-400">per hour</p>
            </div>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-surface-500 mb-4">
            <span>{SPOT_TYPE_LABELS[listing.spot_type]}</span>
            <span className="text-surface-300">·</span>
            <span>{VEHICLE_LABELS[listing.vehicle_size]}</span>
            {avgRating > 0 && (
              <>
                <span className="text-surface-300">·</span>
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  {avgRating.toFixed(1)} ({reviews.length})
                </span>
              </>
            )}
          </div>

          {/* Location */}
          <div className="flex items-start gap-2 text-sm text-surface-600 mb-4">
            <MapPin className="w-4 h-4 text-surface-400 mt-0.5 flex-shrink-0" />
            <span>{listing.city}, {listing.state} {listing.zip_code}</span>
          </div>

          {/* Description */}
          {listing.description && (
            <p className="text-sm text-surface-600 mb-4">{listing.description}</p>
          )}

          {/* Instructions hint */}
          {listing.instructions && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700">
                This host has provided parking instructions. You&apos;ll see them after booking.
              </p>
            </div>
          )}
        </div>

        {/* Availability */}
        {availability.length > 0 && (
          <div className="card p-6 mb-4">
            <h2 className="font-display font-semibold text-surface-900 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-surface-400" />
              Available hours
            </h2>
            <div className="space-y-1.5">
              {DAY_ORDER.map(day => {
                const slot = availability.find(a => a.day_of_week === day);
                return (
                  <div key={day} className="flex items-center justify-between text-sm">
                    <span className={slot ? 'text-surface-700 font-medium' : 'text-surface-400'}>
                      {DAY_SHORT[day]}
                    </span>
                    {slot ? (
                      <span className="text-surface-600">
                        {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                      </span>
                    ) : (
                      <span className="text-surface-300">Unavailable</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Host info */}
        {host && (
          <div className="card p-6 mb-4">
            <h2 className="font-display font-semibold text-surface-900 mb-3">
              Hosted by
            </h2>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center">
                <span className="text-brand-700 font-bold text-lg">
                  {host.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-surface-800">{host.full_name}</p>
                <p className="text-xs text-surface-400">
                  Member since {new Date(host.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="card p-6">
            <h2 className="font-display font-semibold text-surface-900 mb-4 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              Reviews ({reviews.length})
            </h2>
            <div className="space-y-4">
              {reviews.map(review => (
                <div key={review.id} className="border-b border-surface-100 last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-surface-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-surface-400">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-surface-600">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom booking bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-surface-100 p-4 z-50">
        <div className="page-container max-w-lg mx-auto">
          {/* Duration selector */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setHours(h => Math.max(1, h - 1))}
                className="w-8 h-8 rounded-full border border-surface-200 flex items-center justify-center text-surface-600 hover:bg-surface-50"
              >
                −
              </button>
              <span className="text-sm font-medium text-surface-800 min-w-[60px] text-center">
                {hours} hour{hours !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => setHours(h => Math.min(12, h + 1))}
                className="w-8 h-8 rounded-full border border-surface-200 flex items-center justify-center text-surface-600 hover:bg-surface-50"
              >
                +
              </button>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-surface-900">
                {formatPrice(total)}
              </p>
              <p className="text-xs text-surface-400">
                {formatPrice(listing.price_per_hour)}/hr × {hours}hr{hours !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {isOwnListing ? (
            <div className="text-center py-3">
              <p className="text-sm text-surface-500">This is your listing.</p>
              <Link href="/dashboard" className="text-sm text-brand-600 font-medium hover:text-brand-700">
                ← Back to dashboard
              </Link>
            </div>
          ) : (
            <button
              onClick={handleBook}
              disabled={booking}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {booking ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Booking...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Book this spot
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
