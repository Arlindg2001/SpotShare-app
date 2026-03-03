-- ============================================
-- SPOTSHARE DATABASE SCHEMA
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "postgis";  -- For location-based queries

-- ============================================
-- 1. USER PROFILES
-- Extends Supabase's built-in auth.users
-- ============================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text not null default '',
  avatar_url text,
  phone text,
  role text not null default 'driver' check (role in ('driver', 'host', 'both')),
  -- Stripe Connect account (for hosts to receive payouts)
  stripe_account_id text,
  stripe_onboarding_complete boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile when someone signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- 2. PARKING LISTINGS
-- The spots hosts put up for rent
-- ============================================
create table public.listings (
  id uuid default uuid_generate_v4() primary key,
  host_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text not null default '',
  spot_type text not null default 'driveway' 
    check (spot_type in ('driveway', 'garage', 'private_lot', 'street', 'business')),
  vehicle_size text not null default 'standard'
    check (vehicle_size in ('compact', 'standard', 'large', 'any')),
  -- Location
  address text not null,
  city text not null default 'New York',
  state text not null default 'NY',
  zip_code text not null,
  latitude double precision not null,
  longitude double precision not null,
  -- PostGIS point for geographic searches
  location geography(Point, 4326),
  -- Pricing (stored in cents to avoid decimal issues)
  price_per_hour integer not null check (price_per_hour > 0),
  -- Media (array of Supabase storage URLs)
  photos text[] not null default '{}',
  -- Special instructions for the driver
  instructions text,
  -- Status
  is_active boolean not null default true,
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-generate the PostGIS location point from lat/lng
create or replace function public.update_listing_location()
returns trigger as $$
begin
  new.location := st_point(new.longitude, new.latitude)::geography;
  return new;
end;
$$ language plpgsql;

create trigger set_listing_location
  before insert or update of latitude, longitude on public.listings
  for each row execute procedure public.update_listing_location();

-- Index for fast geographic queries ("spots near me")
create index listings_location_idx on public.listings using gist (location);
create index listings_host_id_idx on public.listings (host_id);
create index listings_is_active_idx on public.listings (is_active) where is_active = true;

-- ============================================
-- 3. AVAILABILITY SCHEDULE
-- When each spot is available for booking
-- ============================================
create table public.availability (
  id uuid default uuid_generate_v4() primary key,
  listing_id uuid references public.listings(id) on delete cascade not null,
  day_of_week text not null 
    check (day_of_week in ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  start_time time not null,
  end_time time not null,
  is_available boolean not null default true,
  constraint valid_time_range check (end_time > start_time),
  constraint unique_day_slot unique (listing_id, day_of_week, start_time)
);

create index availability_listing_idx on public.availability (listing_id);

-- ============================================
-- 4. BOOKINGS
-- When a driver reserves a spot
-- ============================================
create table public.bookings (
  id uuid default uuid_generate_v4() primary key,
  listing_id uuid references public.listings(id) on delete set null,
  driver_id uuid references public.profiles(id) on delete set null not null,
  host_id uuid references public.profiles(id) on delete set null not null,
  -- Timing
  start_time timestamptz not null,
  end_time timestamptz not null,
  duration_hours numeric(5,2) not null,
  -- Pricing (all in cents)
  subtotal integer not null check (subtotal > 0),
  platform_fee integer not null default 0,      -- 15% commission
  host_payout integer not null default 0,        -- subtotal - platform_fee
  -- Status
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'active', 'completed', 'cancelled')),
  -- Stripe
  stripe_payment_intent_id text,
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Can't book in the past, and end must be after start
  constraint valid_booking_time check (end_time > start_time)
);

create index bookings_driver_idx on public.bookings (driver_id);
create index bookings_host_idx on public.bookings (host_id);
create index bookings_listing_idx on public.bookings (listing_id);
create index bookings_status_idx on public.bookings (status);
create index bookings_time_idx on public.bookings (start_time, end_time);

-- ============================================
-- 5. REVIEWS
-- Post-booking ratings
-- ============================================
create table public.reviews (
  id uuid default uuid_generate_v4() primary key,
  booking_id uuid references public.bookings(id) on delete cascade not null,
  reviewer_id uuid references public.profiles(id) on delete set null not null,
  reviewee_id uuid references public.profiles(id) on delete set null not null,
  listing_id uuid references public.listings(id) on delete set null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz not null default now(),
  -- One review per booking per reviewer
  constraint unique_review unique (booking_id, reviewer_id)
);

create index reviews_listing_idx on public.reviews (listing_id);
create index reviews_reviewee_idx on public.reviews (reviewee_id);

-- ============================================
-- 6. ROW LEVEL SECURITY (RLS)
-- Controls who can read/write what data
-- Think of it like permissions on each table
-- ============================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.availability enable row level security;
alter table public.bookings enable row level security;
alter table public.reviews enable row level security;

-- PROFILES: Anyone can read profiles, users can update their own
create policy "Profiles are viewable by everyone" 
  on public.profiles for select using (true);

create policy "Users can update their own profile" 
  on public.profiles for update using (auth.uid() = id);

-- LISTINGS: Anyone can read active listings, hosts manage their own
create policy "Active listings are viewable by everyone" 
  on public.listings for select using (is_active = true or host_id = auth.uid());

create policy "Hosts can create listings" 
  on public.listings for insert with check (host_id = auth.uid());

create policy "Hosts can update their own listings" 
  on public.listings for update using (host_id = auth.uid());

create policy "Hosts can delete their own listings" 
  on public.listings for delete using (host_id = auth.uid());

-- AVAILABILITY: Anyone can read, hosts manage their own
create policy "Availability is viewable by everyone" 
  on public.availability for select using (true);

create policy "Hosts can manage availability" 
  on public.availability for insert with check (
    listing_id in (select id from public.listings where host_id = auth.uid())
  );

create policy "Hosts can update availability" 
  on public.availability for update using (
    listing_id in (select id from public.listings where host_id = auth.uid())
  );

create policy "Hosts can delete availability" 
  on public.availability for delete using (
    listing_id in (select id from public.listings where host_id = auth.uid())
  );

-- BOOKINGS: Drivers and hosts can see their own bookings
create policy "Users can view their own bookings" 
  on public.bookings for select using (
    driver_id = auth.uid() or host_id = auth.uid()
  );

create policy "Drivers can create bookings" 
  on public.bookings for insert with check (driver_id = auth.uid());

create policy "Booking participants can update" 
  on public.bookings for update using (
    driver_id = auth.uid() or host_id = auth.uid()
  );

-- REVIEWS: Anyone can read, participants can create
create policy "Reviews are viewable by everyone" 
  on public.reviews for select using (true);

create policy "Booking participants can create reviews" 
  on public.reviews for insert with check (
    reviewer_id = auth.uid() and
    booking_id in (
      select id from public.bookings 
      where driver_id = auth.uid() or host_id = auth.uid()
    )
  );

-- ============================================
-- 7. STORAGE BUCKET (for listing photos)
-- ============================================
insert into storage.buckets (id, name, public) 
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

create policy "Anyone can view listing photos" 
  on storage.objects for select using (bucket_id = 'listing-photos');

create policy "Authenticated users can upload listing photos" 
  on storage.objects for insert with check (
    bucket_id = 'listing-photos' and auth.role() = 'authenticated'
  );

create policy "Users can delete their own listing photos" 
  on storage.objects for delete using (
    bucket_id = 'listing-photos' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- 8. HELPER FUNCTION: Search nearby listings
-- This is the core "find parking near me" query
-- ============================================
create or replace function public.search_nearby_listings(
  search_lat double precision,
  search_lng double precision,
  search_radius_miles double precision default 2.0,
  max_price integer default null,
  spot_type_filter text default null
)
returns table (
  id uuid,
  host_id uuid,
  title text,
  description text,
  spot_type text,
  vehicle_size text,
  address text,
  city text,
  zip_code text,
  latitude double precision,
  longitude double precision,
  price_per_hour integer,
  photos text[],
  instructions text,
  distance_miles double precision,
  average_rating numeric,
  total_reviews bigint
) as $$
begin
  return query
  select
    l.id,
    l.host_id,
    l.title,
    l.description,
    l.spot_type,
    l.vehicle_size,
    l.address,
    l.city,
    l.zip_code,
    l.latitude,
    l.longitude,
    l.price_per_hour,
    l.photos,
    l.instructions,
    -- Convert meters to miles
    (st_distance(
      l.location,
      st_point(search_lng, search_lat)::geography
    ) / 1609.34) as distance_miles,
    -- Average rating from reviews
    coalesce(avg(r.rating), 0) as average_rating,
    count(r.id) as total_reviews
  from public.listings l
  left join public.reviews r on r.listing_id = l.id
  where
    l.is_active = true
    and st_dwithin(
      l.location,
      st_point(search_lng, search_lat)::geography,
      search_radius_miles * 1609.34  -- Convert miles to meters
    )
    and (max_price is null or l.price_per_hour <= max_price)
    and (spot_type_filter is null or l.spot_type = spot_type_filter)
  group by l.id
  order by distance_miles asc;
end;
$$ language plpgsql;
