'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
  NewspaperIcon, 
  PlayIcon, 
  DocumentTextIcon,
  TrendingUpIcon,
  GlobeAltIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

import { Header } from '@/components/layout/Header';
import { ArticleGrid } from '@/components/articles/ArticleGrid';
import { TrendingSection } from '@/components/home/TrendingSection';
import { CategoryFilter } from '@/components/filters/CategoryFilter';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useArticles } from '@/hooks/useArticles';
import { useAuth } from '@/hooks/useAuth';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function HomePage() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const {
    data: articlesData,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useArticles({
    category: selectedCategory === 'all' ? undefined : selectedCategory,
    search: searchQuery || undefined,
    pageSize: 12
  });

  const [heroRef, heroInView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  const [statsRef, statsInView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  const articles = articlesData?.pages.flatMap(page => page.items) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section ref={heroRef} className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <motion.div
            className="text-center"
            initial="initial"
            animate={heroInView ? "animate" : "initial"}
            variants={staggerContainer}
          >
            <motion.h1 
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6"
              variants={fadeInUp}
            >
              Africa&apos;s Intelligence
              <br />
              <span className="text-accent-400">Platform</span>
            </motion.h1>
            
            <motion.p 
              className="text-xl text-primary-100 mb-8 max-w-3xl mx-auto"
              variants={fadeInUp}
            >
              AI-powered news intelligence delivering personalized, timely insights 
              on African tech, business, and innovation. Stay ahead with curated content 
              from across the continent.
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              variants={fadeInUp}
            >
              <button className="btn btn-lg bg-white text-primary-700 hover:bg-gray-50">
                <NewspaperIcon className="w-5 h-5 mr-2" />
                Explore Articles
              </button>
              <button className="btn btn-lg border-white text-white hover:bg-white/10">
                <PlayIcon className="w-5 h-5 mr-2" />
                Watch Demo
              </button>
            </motion.div>
          </motion.div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-secondary-500/20 rounded-full blur-3xl" />
        </div>
      </section>

      {/* Stats Section */}
      <section ref={statsRef} className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-4 gap-8"
            initial="initial"
            animate={statsInView ? "animate" : "initial"}
            variants={staggerContainer}
          >
            {[
              { label: 'Articles Processed', value: '10,000+', icon: NewspaperIcon },
              { label: 'AI Summaries', value: '8,500+', icon: SparklesIcon },
              { label: 'Video Scripts', value: '2,100+', icon: PlayIcon },
              { label: 'Countries Covered', value: '54', icon: GlobeAltIcon }
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                className="text-center"
                variants={fadeInUp}
              >
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-primary-100 rounded-lg">
                    <stat.icon className="w-8 h-8 text-primary-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Content Area */}
          <div className="lg:col-span-3">
            {/* Welcome Message for Logged In Users */}
            {user && (
              <motion.div 
                className="card card-body mb-8 bg-gradient-to-r from-primary-50 to-secondary-50 border-primary-200"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Welcome back, {user.first_name}! 👋
                </h2>
                <p className="text-gray-600">
                  Here are today&apos;s top stories curated for your interests.
                </p>
              </motion.div>
            )}

            {/* Filters */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex-1">
                  <CategoryFilter
                    selectedCategory={selectedCategory}
                    onCategoryChange={setSelectedCategory}
                  />
                </div>
                <div className="w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Search articles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input w-full sm:w-80"
                  />
                </div>
              </div>
            </div>

            {/* Articles Grid */}
            {isLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : error ? (
              <div className="card card-body text-center py-12">
                <div className="text-error-500 mb-2">
                  <ExclamationTriangleIcon className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Failed to load articles
                </h3>
                <p className="text-gray-600">
                  Please try again later or refresh the page.
                </p>
              </div>
            ) : (
              <ArticleGrid
                articles={articles}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                onLoadMore={fetchNextPage}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-8">
              
              {/* Trending Section */}
              <TrendingSection />

              {/* Categories Overview */}
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">
                    Popular Categories
                  </h3>
                </div>
                <div className="card-body">
                  <div className="space-y-3">
                    {[
                      { name: 'Fintech', count: 234, color: 'bg-green-100 text-green-800' },
                      { name: 'Startups', count: 189, color: 'bg-blue-100 text-blue-800' },
                      { name: 'Infrastructure', count: 156, color: 'bg-orange-100 text-orange-800' },
                      { name: 'DRC Specific', count: 123, color: 'bg-purple-100 text-purple-800' },
                      { name: 'Technology', count: 98, color: 'bg-indigo-100 text-indigo-800' }
                    ].map((category) => (
                      <div 
                        key={category.name}
                        className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-md"
                        onClick={() => setSelectedCategory(category.name.toLowerCase())}
                      >
                        <span className="text-sm text-gray-700">{category.name}</span>
                        <span className={`badge ${category.color}`}>
                          {category.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Newsletter Signup */}
              <div className="card bg-gradient-to-br from-primary-50 to-secondary-50 border-primary-200">
                <div className="card-body text-center">
                  <div className="mb-4">
                    <div className="inline-flex p-3 bg-primary-100 rounded-full">
                      <NewspaperIcon className="w-6 h-6 text-primary-600" />
                    </div>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Daily Digest
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Get the most important African tech and business news delivered to your inbox every morning.
                  </p>
                  <div className="space-y-3">
                    <input
                      type="email"
                      placeholder="Enter your email"
                      className="input w-full"
                    />
                    <button className="btn btn-primary w-full">
                      Subscribe
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    No spam. Unsubscribe anytime.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
