'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';
import {
  Bars3Icon,
  XMarkIcon,
  MapPinIcon,
  BellIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { hasLocation, locationContext } = useLocation();

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Articles', href: '/articles' },
    { name: 'Tech Hubs', href: '/tech-hubs' },
    { name: 'About', href: '/about' }
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AI</span>
              </div>
              <span className="font-bold text-xl text-gray-900">
                Africa Intelligence
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Location indicator */}
            {isAuthenticated && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <MapPinIcon className={`h-4 w-4 ${hasLocation ? 'text-green-500' : 'text-gray-400'}`} />
                <span className="hidden sm:inline">
                  {hasLocation && locationContext?.city 
                    ? locationContext.city 
                    : 'Location not set'
                  }
                </span>
              </div>
            )}

            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                {/* Notifications */}
                <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                  <BellIcon className="h-5 w-5" />
                </button>

                {/* User menu */}
                <div className="relative group">
                  <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100">
                    <UserCircleIcon className="h-6 w-6 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">
                      {user?.first_name}
                    </span>
                  </button>
                  
                  {/* Dropdown menu */}
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="py-1">
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Profile
                      </Link>
                      <Link
                        href="/settings"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Settings
                      </Link>
                      <button
                        onClick={logout}
                        className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  href="/login"
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="btn btn-primary btn-sm"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              {isMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden"
          >
            <div className="px-2 pt-2 pb-3 space-y-1 border-t border-gray-200">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              
              {!isAuthenticated && (
                <div className="pt-4 border-t border-gray-200">
                  <Link
                    href="/login"
                    className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    className="block px-3 py-2 text-base font-medium text-primary-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </header>
  );
}
