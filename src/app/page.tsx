'use client';

import Link from 'next/link';
import { Car, MapPin, DollarSign, Shield, ArrowRight, Clock, Star } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-surface-50">
      {/* ============================================ */}
      {/* NAVIGATION */}
      {/* ============================================ */}
      <nav className="sticky top-0 z-50 bg-surface-50/80 backdrop-blur-xl border-b border-surface-100">
        <div className="page-container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl text-surface-900">SpotShare</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost text-sm">
              Sign in
            </Link>
            <Link href="/signup" className="btn-primary text-sm !py-2 !px-4">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ============================================ */}
      {/* HERO SECTION */}
      {/* ============================================ */}
      <section className="page-container pt-16 sm:pt-24 pb-20">
        <div className="max-w-2xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 px-3 py-1.5 rounded-full text-sm font-medium mb-6">
            <MapPin className="w-4 h-4" />
            Now in NYC
          </div>

          <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl text-surface-950 leading-[1.1] mb-6">
            Park in someone&apos;s
            <span className="text-brand-600"> driveway</span>,
            <br />
            not a $40 garage.
          </h1>

          <p className="text-lg sm:text-xl text-surface-500 mb-10 max-w-lg leading-relaxed">
            SpotShare connects drivers with locals who have empty driveways, garages, and private lots. 
            Save money on parking. Earn money on empty space.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/browse"
              className="btn-primary text-center flex items-center justify-center gap-2 text-lg !py-4 !px-8"
            >
              Find parking
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/signup"
              className="btn-secondary text-center flex items-center justify-center gap-2 text-lg !py-4 !px-8"
            >
              List your spot
              <DollarSign className="w-5 h-5" />
            </Link>
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-6 mt-10 text-surface-400 text-sm">
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              <span>Secure payments</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4" />
              <span>Rated hosts</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>Book by the hour</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* HOW IT WORKS */}
      {/* ============================================ */}
      <section className="bg-white border-y border-surface-100 py-20">
        <div className="page-container">
          <h2 className="font-display font-bold text-3xl text-surface-900 mb-4">
            How it works
          </h2>
          <p className="text-surface-500 mb-12 max-w-lg">
            Whether you need a spot or have one to spare, it takes less than a minute.
          </p>

          <div className="grid sm:grid-cols-2 gap-8">
            {/* Driver flow */}
            <div className="card p-8">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                <MapPin className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-display font-bold text-xl text-surface-900 mb-2">
                I need parking
              </h3>
              <ol className="space-y-3 text-surface-600">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-surface-100 rounded-full flex items-center justify-center text-xs font-bold text-surface-600">1</span>
                  <span>Search the map for spots near your destination</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-surface-100 rounded-full flex items-center justify-center text-xs font-bold text-surface-600">2</span>
                  <span>Compare prices, read reviews, check photos</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-surface-100 rounded-full flex items-center justify-center text-xs font-bold text-surface-600">3</span>
                  <span>Book and pay — get directions to your spot</span>
                </li>
              </ol>
            </div>

            {/* Host flow */}
            <div className="card p-8">
              <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center mb-6">
                <DollarSign className="w-6 h-6 text-brand-600" />
              </div>
              <h3 className="font-display font-bold text-xl text-surface-900 mb-2">
                I have a spot
              </h3>
              <ol className="space-y-3 text-surface-600">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-surface-100 rounded-full flex items-center justify-center text-xs font-bold text-surface-600">1</span>
                  <span>List your driveway, garage, or lot in 2 minutes</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-surface-100 rounded-full flex items-center justify-center text-xs font-bold text-surface-600">2</span>
                  <span>Set your price and available hours</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-surface-100 rounded-full flex items-center justify-center text-xs font-bold text-surface-600">3</span>
                  <span>Get paid automatically when drivers book</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* VALUE PROPS */}
      {/* ============================================ */}
      <section className="py-20">
        <div className="page-container">
          <h2 className="font-display font-bold text-3xl text-surface-900 mb-12">
            Why SpotShare?
          </h2>

          <div className="grid sm:grid-cols-3 gap-8">
            <div>
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-display font-semibold text-lg text-surface-900 mb-2">
                Save up to 60%
              </h3>
              <p className="text-surface-500">
                Neighborhood spots cost a fraction of commercial garages. 
                Hosts set fair prices, not corporate parking rates.
              </p>
            </div>

            <div>
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="font-display font-semibold text-lg text-surface-900 mb-2">
                Trusted & reviewed
              </h3>
              <p className="text-surface-500">
                Every host and driver is verified. Real reviews from real people 
                so you know exactly what to expect.
              </p>
            </div>

            <div>
              <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-violet-600" />
              </div>
              <h3 className="font-display font-semibold text-lg text-surface-900 mb-2">
                Book in seconds
              </h3>
              <p className="text-surface-500">
                No circling the block. No prayer. Find a guaranteed 
                spot before you even leave the house.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* FINAL CTA */}
      {/* ============================================ */}
      <section className="pb-20">
        <div className="page-container">
          <div className="bg-brand-600 rounded-3xl p-10 sm:p-16 text-center">
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-white mb-4">
              Ready to stop overpaying for parking?
            </h2>
            <p className="text-brand-100 text-lg mb-8 max-w-md mx-auto">
              Join SpotShare today. It&apos;s free to sign up — start saving or earning in minutes.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-white text-brand-700 font-semibold px-8 py-4 rounded-2xl hover:bg-brand-50 transition-colors text-lg"
            >
              Get started free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* FOOTER */}
      {/* ============================================ */}
      <footer className="border-t border-surface-100 py-8">
        <div className="page-container flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
              <Car className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-surface-900">SpotShare</span>
          </div>
          <p className="text-surface-400 text-sm">
            &copy; {new Date().getFullYear()} SpotShare. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
