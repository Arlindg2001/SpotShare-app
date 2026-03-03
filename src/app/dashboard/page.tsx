'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { UserProfile } from '@/types';
import {
  Car, MapPin, Plus, LogOut, Search, Home,
  User, Clock, DollarSign, ArrowRight, Star,
  Edit, Eye, ToggleLeft, ToggleRight, Trash2
} from 'lucide-react';

interface MyListing {
  id: string;
  title: string;
  spot_type: string;
  price_per_hour: number;
  photos: string[];
  is_active: boolean;
  created_at: string;
  city: string;
  zip_code: string;
}

interface MyBooking {
  id: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  subtotal: number;
  status: string;
  listing: {
    title: string;
    address: string;
    city: string;
  } | null;
}

const SPOT_LABELS: Record<string, string> = {
  driveway: '🏠 Driveway',
  garage: '🏗️ Garage',
  private_lot: '🅿️ Private Lot',
  business: '🏢 Business',
};

export default function DashboardPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [listings, setListings] = useState<MyListing[]>([]);
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'listings' | 'bookings'>('listings');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadDashboard() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/login');
        return;
      }

      // Load profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();
      setUser(profile);

      // Load user's listings
      const { data: listingsData } = await supabase
        .from('listings')
        .select('id, title, spot_type, price_per_hour, photos, is_active, created_at, city, zip_code')
        .eq('host_id', authUser.id)
        .order('created_at', { ascending: false });
      setListings(listingsData || []);

      // Load user's bookings (as driver)
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('id, start_time, end_time, duration_hours, subtotal, status, listing:listing_id(title, address, city)')
        .eq('driver_id', authUser.id)
        .order('created_at', { ascending: false });
      setBookings((bookingsData as any) || []);

      setLoading(false);
    }
    loadDashboard();
  }, []);

  async function toggleListing(listingId: string, currentActive: boolean) {
    await supabase
      .from('listings')
      .update({ is_active: !currentActive })
      .eq('id', listingId);

    setListings(prev =>
      prev.map(l => l.id === listingId ? { ...l, is_active: !currentActive } : l)
    );
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  function formatPrice(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  }

  const STATUS_STYLES: Record<string, string> = {
    confirmed: 'bg-green-50 text-green-700',
    active: 'bg-blue-50 text-blue-700',
    completed: 'bg-surface-100 text-surface-600',
    cancelled: 'bg-red-50 text-red-700',
    pending: 'bg-amber-50 text-amber-700',
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-surface-50">
        <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  const firstName = user?.full_name?.split(' ')[0] || 'there';
  const hasActivity = listings.length > 0 || bookings.length > 0;

  return (
    <div className="min-h-dvh bg-surface-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-surface-100">
        <div className="page-container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl text-surface-900">SpotShare</span>
          </Link>

          <button onClick={handleLogout} className="btn-ghost flex items-center gap-2 text-sm">
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </header>

      {/* Welcome section */}
      <div className="page-container pt-8">
        <h1 className="font-display font-bold text-2xl text-surface-900 mb-1">
          Hey {firstName}
        </h1>
        <p className="text-surface-500 mb-8">
          What would you like to do today?
        </p>

        {/* Quick actions */}
        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          <Link href="/browse" className="card p-6 group cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <Search className="w-6 h-6 text-blue-600" />
              </div>
              <ArrowRight className="w-5 h-5 text-surface-300 group-hover:text-surface-500 transition-colors" />
            </div>
            <h2 className="font-display font-semibold text-lg text-surface-900 mb-1">
              Find parking
            </h2>
            <p className="text-surface-500 text-sm">
              Browse available spots near any NYC location
            </p>
          </Link>

          <Link href="/host" className="card p-6 group cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                <Plus className="w-6 h-6 text-brand-600" />
              </div>
              <ArrowRight className="w-5 h-5 text-surface-300 group-hover:text-surface-500 transition-colors" />
            </div>
            <h2 className="font-display font-semibold text-lg text-surface-900 mb-1">
              List your spot
            </h2>
            <p className="text-surface-500 text-sm">
              Earn money from your empty driveway, garage, or lot
            </p>
          </Link>
        </div>

        {/* Activity section */}
        {hasActivity ? (
          <>
            {/* Tabs */}
            <div className="flex gap-1 bg-surface-100 rounded-xl p-1 mb-6">
              <button
                onClick={() => setActiveTab('listings')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'listings'
                    ? 'bg-white text-surface-900 shadow-sm'
                    : 'text-surface-500 hover:text-surface-700'
                }`}
              >
                My Listings ({listings.length})
              </button>
              <button
                onClick={() => setActiveTab('bookings')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'bookings'
                    ? 'bg-white text-surface-900 shadow-sm'
                    : 'text-surface-500 hover:text-surface-700'
                }`}
              >
                My Bookings ({bookings.length})
              </button>
            </div>

            {/* Listings tab */}
            {activeTab === 'listings' && (
              <div className="space-y-3">
                {listings.length === 0 ? (
                  <div className="card p-6 text-center">
                    <p className="text-surface-500 text-sm mb-4">You haven&apos;t listed any spots yet.</p>
                    <Link href="/host" className="btn-primary inline-flex items-center gap-2 text-sm">
                      <Plus className="w-4 h-4" />
                      List your first spot
                    </Link>
                  </div>
                ) : (
                  listings.map(listing => (
                    <div key={listing.id} className="card overflow-hidden">
                      <div className="flex">
                        {/* Thumbnail */}
                        <div className="w-24 sm:w-32 flex-shrink-0 bg-surface-100">
                          {listing.photos.length > 0 ? (
                            <img
                              src={listing.photos[0]}
                              alt={listing.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center min-h-[96px]">
                              <Car className="w-8 h-8 text-surface-300" />
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 p-4">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-semibold text-surface-900 text-sm">
                              {listing.title}
                            </h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              listing.is_active
                                ? 'bg-green-50 text-green-700'
                                : 'bg-surface-100 text-surface-500'
                            }`}>
                              {listing.is_active ? 'Active' : 'Paused'}
                            </span>
                          </div>

                          <p className="text-xs text-surface-400 mb-2">
                            {SPOT_LABELS[listing.spot_type] || listing.spot_type} · {listing.city} {listing.zip_code}
                          </p>

                          <p className="text-sm font-bold text-brand-600 mb-3">
                            {formatPrice(listing.price_per_hour)}/hr
                          </p>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/listing/${listing.id}`}
                              className="flex items-center gap-1 text-xs text-surface-500 hover:text-brand-600 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </Link>
                            <span className="text-surface-200">·</span>
                            <button
                              onClick={() => toggleListing(listing.id, listing.is_active)}
                              className="flex items-center gap-1 text-xs text-surface-500 hover:text-brand-600 transition-colors"
                            >
                              {listing.is_active ? (
                                <><ToggleRight className="w-3.5 h-3.5" /> Pause</>
                              ) : (
                                <><ToggleLeft className="w-3.5 h-3.5" /> Activate</>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Bookings tab */}
            {activeTab === 'bookings' && (
              <div className="space-y-3">
                {bookings.length === 0 ? (
                  <div className="card p-6 text-center">
                    <p className="text-surface-500 text-sm mb-4">You haven&apos;t booked any spots yet.</p>
                    <Link href="/browse" className="btn-primary inline-flex items-center gap-2 text-sm">
                      <Search className="w-4 h-4" />
                      Find parking
                    </Link>
                  </div>
                ) : (
                  bookings.map(booking => (
                    <div key={booking.id} className="card p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h3 className="font-semibold text-surface-900 text-sm">
                            {booking.listing?.title || 'Listing removed'}
                          </h3>
                          <p className="text-xs text-surface-400">
                            {booking.listing?.city || ''} · {booking.duration_hours}hr{booking.duration_hours !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          STATUS_STYLES[booking.status] || 'bg-surface-100 text-surface-600'
                        }`}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-surface-500">
                          {formatDate(booking.start_time)}
                        </span>
                        <span className="font-bold text-surface-800">
                          {formatPrice(booking.subtotal)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        ) : (
          /* Empty state - no activity at all */
          <div>
            <h2 className="font-display font-semibold text-lg text-surface-900 mb-4">
              My Activity
            </h2>
            <div className="card p-8 text-center">
              <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-7 h-7 text-surface-400" />
              </div>
              <h3 className="font-medium text-surface-700 mb-2">
                No activity yet
              </h3>
              <p className="text-surface-400 text-sm mb-6">
                Your bookings and listings will appear here once you start using SpotShare.
              </p>
              <Link href="/browse" className="btn-primary inline-flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Explore spots
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Bottom navigation (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-surface-100 sm:hidden z-50">
        <div className="flex items-center justify-around h-16">
          <Link href="/browse" className="flex flex-col items-center gap-1 text-surface-400 hover:text-brand-600">
            <Search className="w-5 h-5" />
            <span className="text-xs">Browse</span>
          </Link>
          <Link href="/host" className="flex flex-col items-center gap-1 text-surface-400 hover:text-brand-600">
            <Home className="w-5 h-5" />
            <span className="text-xs">Host</span>
          </Link>
          <Link href="/dashboard" className="flex flex-col items-center gap-1 text-brand-600">
            <User className="w-5 h-5" />
            <span className="text-xs font-medium">Me</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
