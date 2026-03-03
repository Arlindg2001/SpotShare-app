// ============================================
// USER TYPES
// ============================================

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  role: 'driver' | 'host' | 'both';
  created_at: string;
  updated_at: string;
}

// ============================================
// LISTING TYPES (Parking Spots)
// ============================================

export type SpotType = 'driveway' | 'garage' | 'private_lot' | 'street' | 'business';
export type VehicleSize = 'compact' | 'standard' | 'large' | 'any';

export interface ParkingListing {
  id: string;
  host_id: string;
  title: string;
  description: string;
  spot_type: SpotType;
  vehicle_size: VehicleSize;
  // Location
  address: string;
  city: string;
  state: string;
  zip_code: string;
  latitude: number;
  longitude: number;
  // Pricing
  price_per_hour: number; // in cents (e.g., 500 = $5.00)
  // Media
  photos: string[];       // URLs from Supabase storage
  // Availability
  is_active: boolean;
  // Special instructions
  instructions: string | null;
  // Metadata
  created_at: string;
  updated_at: string;
  // Joined data
  host?: UserProfile;
  average_rating?: number;
  total_reviews?: number;
}

// ============================================
// AVAILABILITY TYPES
// ============================================

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface AvailabilitySlot {
  id: string;
  listing_id: string;
  day_of_week: DayOfWeek;
  start_time: string;    // "08:00"
  end_time: string;      // "22:00"
  is_available: boolean;
}

// ============================================
// BOOKING TYPES
// ============================================

export type BookingStatus = 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  listing_id: string;
  driver_id: string;
  host_id: string;
  // Timing
  start_time: string;     // ISO datetime
  end_time: string;       // ISO datetime
  duration_hours: number;
  // Pricing
  subtotal: number;       // in cents
  platform_fee: number;   // in cents (15% commission)
  host_payout: number;    // in cents (subtotal - platform_fee)
  // Status
  status: BookingStatus;
  // Payment
  stripe_payment_intent_id: string | null;
  // Metadata
  created_at: string;
  updated_at: string;
  // Joined data
  listing?: ParkingListing;
  driver?: UserProfile;
  host?: UserProfile;
}

// ============================================
// REVIEW TYPES
// ============================================

export interface Review {
  id: string;
  booking_id: string;
  reviewer_id: string;
  reviewee_id: string;
  listing_id: string;
  rating: number;         // 1-5
  comment: string | null;
  created_at: string;
  // Joined data
  reviewer?: UserProfile;
}

// ============================================
// SEARCH / FILTER TYPES
// ============================================

export interface SearchFilters {
  latitude: number;
  longitude: number;
  radius_miles: number;
  spot_type?: SpotType;
  vehicle_size?: VehicleSize;
  max_price_per_hour?: number;
  date?: string;
  start_time?: string;
  end_time?: string;
}
