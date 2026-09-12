'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useCart } from '@/context/CartContext';
import { useFeatureFlags } from '@/context/FeaturesContext';
import {
  ShoppingBag,
  Check,
  Award,
  Sparkles,
  Truck,
  Heart,
  Search,
  SlidersHorizontal,
  Scale,
  Star,
  Bell,
  X,
  Calendar,
  RotateCcw
} from 'lucide-react';
import { ProductDTO, PackageSizeDTO } from '@/types/dtos';
import { formatPKR, formatStock } from '@/lib/formatters';
import VarietyComparisonModal from './VarietyComparisonModal';
import BackInStockModal from './BackInStockModal';

export default function ProductSection({ products }: { products: ProductDTO[] }) {
  const { addItem } = useCart();
  const { isFeatureEnabled } = useFeatureFlags();

  // Selected package size ID per product: Record<productId, packageSizeId>
  const [selectedPackages, setSelectedPackages] = useState<Record<string, string>>({});
  const [addedAnimation, setAddedAnimation] = useState<Record<string, boolean>>({});
  const [activeImages, setActiveImages] = useState<Record<string, string>>({});

  // Modals state
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [backInStockTarget, setBackInStockTarget] = useState<{
    productId: string;
    productName: string;
    packageSizeId?: string;
    packageName?: string;
  } | null>(null);

  // Wishlist state
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [wishlistLoading, setWishlistLoading] = useState<Record<string, boolean>>({});

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('ALL');
  const [selectedGrade, setSelectedGrade] = useState('ALL');
  const [sortBy, setSortBy] = useState<'FEATURED' | 'PRICE_LOW' | 'PRICE_HIGH' | 'BRIX_HIGH'>('FEATURED');

  // Load wishlist items if wishlist feature is active
  useEffect(() => {
    if (!isFeatureEnabled('wishlist')) return;

    fetch('/api/account/wishlist')
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data?.success && Array.isArray(data.items)) {
          const ids = new Set<string>(data.items.map((i: any) => i.product_id as string));
          setWishlistIds(ids);
        }
      })
      .catch(() => {});
  }, [isFeatureEnabled]);

  const handleToggleWishlist = async (productId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isFeatureEnabled('wishlist')) return;

    const isCurrentlySaved = wishlistIds.has(productId);
    setWishlistLoading((prev) => ({ ...prev, [productId]: true }));

    try {
      if (isCurrentlySaved) {
        const res = await fetch(`/api/account/wishlist?productId=${productId}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          setWishlistIds((prev) => {
            const next = new Set(prev);
            next.delete(productId);
            return next;
          });
        }
      } else {
        const res = await fetch('/api/account/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId })
        });
        if (res.status === 401) {
          window.location.href = '/login?redirect=/#harvest';
          return;
        }
        if (res.ok) {
          setWishlistIds((prev) => new Set(prev).add(productId));
        }
      }
    } catch (err) {
      console.error('Failed to toggle wishlist:', err);
    } finally {
      setWishlistLoading((prev) => ({ ...prev, [productId]: false }));
    }
  };

  const getSelectedPackage = (product: ProductDTO): PackageSizeDTO | undefined => {
    const selectedId = selectedPackages[product.id];
    if (selectedId) {
      return product.packages.find((p) => p.id === selectedId) || product.packages[0];
    }
    return product.packages[0];
  };

  const handlePackageSelect = (productId: string, packageId: string) => {
    setSelectedPackages((prev) => ({ ...prev, [productId]: packageId }));
  };

  const handleAddToCart = (product: ProductDTO) => {
    const pkg = getSelectedPackage(product);
    if (!pkg) return;

    const unitPrice = pkg.effective_price ?? pkg.base_price;
    if (unitPrice === null || unitPrice <= 0) return;

    addItem({
      packageSizeId: pkg.id,
      productId: product.id,
      productName: product.name,
      varietyName: product.variety_name,
      packageName: pkg.name,
      weightKg: pkg.weight_kg,
      unitPrice,
      image: product.primary_image
    });

    setAddedAnimation((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedAnimation((prev) => ({ ...prev, [product.id]: false }));
    }, 1500);
  };

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (isFeatureEnabled('advanced_search')) {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        list = list.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.variety_name.toLowerCase().includes(q) ||
            p.tagline.toLowerCase().includes(q) ||
            p.origin_city.toLowerCase().includes(q)
        );
      }

      if (selectedSeason !== 'ALL') {
        list = list.filter((p) => p.harvest_season?.toUpperCase().includes(selectedSeason));
      }

      if (selectedGrade !== 'ALL') {
        list = list.filter((p) => p.grade?.toUpperCase() === selectedGrade);
      }

      if (sortBy === 'PRICE_LOW') {
        list.sort((a, b) => {
          const priceA = a.packages[0]?.effective_price ?? 0;
          const priceB = b.packages[0]?.effective_price ?? 0;
          return priceA - priceB;
        });
      } else if (sortBy === 'PRICE_HIGH') {
        list.sort((a, b) => {
          const priceA = a.packages[0]?.effective_price ?? 0;
          const priceB = b.packages[0]?.effective_price ?? 0;
          return priceB - priceA;
        });
      } else if (sortBy === 'BRIX_HIGH') {
        list.sort((a, b) => (b.sweetness_brix || 0) - (a.sweetness_brix || 0));
      }
    }

    return list;
  }, [products, isFeatureEnabled, searchQuery, selectedSeason, selectedGrade, sortBy]);

  const uniqueSeasons = useMemo(() => {
    const seasons = new Set<string>();
    products.forEach((p) => {
      if (p.harvest_season) seasons.add(p.harvest_season);
    });
    return Array.from(seasons);
  }, [products]);

  return (
    <section id="harvest" className="py-24 bg-[#FDFBF7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div className="space-y-3">
            <div className="inline-flex items-center space-x-2 text-xs font-bold text-[#D97706] uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Available Right Now • Live Orchard Stocks</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-black text-[#113824]">
              Purchase Fresh Harvest Crates
            </h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-xl">
              Delivered within 24 hours of dawn plucking. Packed in export-grade ventilated cartons with cushioned foam sleeves.
            </p>
          </div>

          <div className="mt-6 md:mt-0 flex flex-wrap items-center gap-3">
            {isFeatureEnabled('mango_comparison') && (
              <button
                type="button"
                onClick={() => setIsCompareOpen(true)}
                className="inline-flex items-center space-x-2 text-xs font-bold text-[#113824] bg-[#F5EEE2] hover:bg-[#E8DBC5] px-4 py-2.5 rounded-full border border-[#E8DBC5] transition shadow-xs"
              >
                <Scale className="w-4 h-4 text-[#D97706]" />
                <span>Compare Cultivars Side-by-Side</span>
              </button>
            )}

            <div className="flex items-center space-x-2 text-xs font-medium text-[#113824] bg-[#113824]/5 px-4 py-2.5 rounded-full border border-[#113824]/10">
              <Truck className="w-4 h-4 text-[#D97706]" />
              <span>Nationwide Cold-Chain Express</span>
            </div>
          </div>
        </div>

        {/* Advanced Search & Filter Bar */}
        {isFeatureEnabled('advanced_search') && (
          <div className="mb-10 p-4 sm:p-5 rounded-2xl bg-white border border-[#E8DBC5] shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Text Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search Chaunsa, Sindhri, Anwar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#113824] focus:border-[#113824]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Season Filter */}
              <div>
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className="w-full py-2 px-3 text-xs rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#113824]"
                >
                  <option value="ALL">All Harvest Seasons</option>
                  <option value="JUNE">June Harvest</option>
                  <option value="JULY">July Peak</option>
                  <option value="AUGUST">August Harvest</option>
                  <option value="SEPTEMBER">Late September Harvest</option>
                </select>
              </div>

              {/* Grade Filter */}
              <div>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full py-2 px-3 text-xs rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#113824]"
                >
                  <option value="ALL">All Quality Grades</option>
                  <option value="EXPORT">Export Grade AAA</option>
                  <option value="PREMIUM">Premium Grade AA</option>
                  <option value="STANDARD">Select Grade A</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full py-2 px-3 text-xs rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#113824]"
                >
                  <option value="FEATURED">Sort: Featured Picks</option>
                  <option value="BRIX_HIGH">Sort: Highest Sweetness (°Brix)</option>
                  <option value="PRICE_LOW">Sort: Price (Low to High)</option>
                  <option value="PRICE_HIGH">Sort: Price (High to Low)</option>
                </select>
              </div>
            </div>

            {(searchQuery || selectedSeason !== 'ALL' || selectedGrade !== 'ALL' || sortBy !== 'FEATURED') && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px] text-gray-500">
                <span>Showing {filteredProducts.length} of {products.length} harvest cultivars</span>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedSeason('ALL');
                    setSelectedGrade('ALL');
                    setSortBy('FEATURED');
                  }}
                  className="inline-flex items-center space-x-1 text-[#D97706] hover:underline font-medium"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Filters</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="p-16 rounded-3xl bg-white border border-[#E8DBC5] text-center space-y-3">
            <span className="text-4xl">🥭</span>
            <h3 className="text-base font-serif font-bold text-[#113824]">No matching harvest crates found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Try adjusting your search terms or filter selections to view our available heirloom mango varieties.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((product) => {
              const currentPkg = getSelectedPackage(product);
              const isAdded = addedAnimation[product.id];
              const stockRemaining = currentPkg?.available_stock ?? 0;
              const heroImage = activeImages[product.id] || product.primary_image || '/images/placeholder-mango.svg';
              const galleryList = Array.from(
                new Set([product.primary_image, ...(product.gallery || [])].filter(Boolean) as string[])
              );
              const isSaved = wishlistIds.has(product.id);
              const isWishlistBusy = wishlistLoading[product.id];

              return (
                <div
                  key={product.id}
                  className="card-luxury rounded-3xl overflow-hidden flex flex-col bg-white border border-[#E8DBC5]"
                >
                  {/* Product Image & Badges */}
                  <div className="relative h-64 overflow-hidden bg-gray-100 group">
                    <img
                      src={heroImage}
                      alt={product.name}
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src !== window.location.origin + '/images/placeholder-mango.svg') {
                          target.src = '/images/placeholder-mango.svg';
                        }
                      }}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />

                    {/* Wishlist Heart Button */}
                    {isFeatureEnabled('wishlist') && (
                      <button
                        type="button"
                        onClick={(e) => handleToggleWishlist(product.id, e)}
                        disabled={isWishlistBusy}
                        aria-label={isSaved ? 'Remove from Patron Wishlist' : 'Add to Patron Wishlist'}
                        className={`absolute top-4 right-4 p-2.5 rounded-full backdrop-blur-md transition-transform duration-200 z-10 shadow-md ${
                          isSaved
                            ? 'bg-red-50 text-red-600 scale-110'
                            : 'bg-white/80 hover:bg-white text-gray-600 hover:text-red-500'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                      </button>
                    )}

                    {/* Multiple Images Thumbnail Strip */}
                    {galleryList.length > 1 && (
                      <div className="absolute bottom-3 left-3 flex items-center space-x-1.5 z-10 bg-black/50 backdrop-blur-xs p-1 rounded-xl shadow-md">
                        {galleryList.map((imgUrl, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setActiveImages((prev) => ({ ...prev, [product.id]: imgUrl }));
                            }}
                            className={`w-7 h-7 rounded-lg overflow-hidden border-2 transition ${
                              heroImage === imgUrl
                                ? 'border-[#F59E0B] scale-105 shadow'
                                : 'border-white/60 opacity-70 hover:opacity-100 hover:border-white'
                            }`}
                            title={`View image ${i + 1}`}
                          >
                            <img src={imgUrl} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Badges Left */}
                    <div className="absolute top-4 left-4 flex flex-col space-y-1.5">
                      <span className="bg-[#113824] text-[#FDFBF7] text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow">
                        {product.grade}
                      </span>
                      <span className="bg-[#F59E0B] text-[#092115] text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow">
                        {product.sweetness_brix}° Brix
                      </span>
                      {isFeatureEnabled('seasonal_availability') && product.harvest_season && (
                        <span className="bg-emerald-900/90 text-[#F5EEE2] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow backdrop-blur-xs">
                          {product.harvest_season}
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-[#113824] shadow border border-[#E8DBC5]">
                      {product.origin_city}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-bold text-[#D97706] uppercase tracking-wider">
                          {product.harvest_season}
                        </div>
                        {isFeatureEnabled('product_reviews') && (
                          <div className="flex items-center space-x-1 text-xs text-amber-600 font-bold">
                            <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
                            <span>5.0</span>
                            <span className="text-[10px] text-gray-400">(Patron Verified)</span>
                          </div>
                        )}
                      </div>

                      <h3 className="text-xl font-serif font-bold text-[#113824] mt-1">
                        {product.name}
                      </h3>
                      <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                        {product.tagline}
                      </p>
                    </div>

                    {/* Dynamic Package Size Selector */}
                    <div className="space-y-2 pt-2 border-t border-[#F5EEE2]">
                      <div className="flex justify-between text-xs font-bold text-[#113824]">
                        <span>Select Package Size:</span>
                        <span className="text-[#D97706]">{currentPkg?.weight_kg} KG Box</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {product.packages.map((pkg) => {
                          const isSelected = currentPkg?.id === pkg.id;
                          return (
                            <button
                              key={pkg.id}
                              onClick={() => handlePackageSelect(product.id, pkg.id)}
                              className={`py-2 px-1 rounded-xl text-center transition-all ${
                                isSelected
                                  ? 'bg-[#113824] text-white font-bold border-2 border-[#113824] shadow-sm'
                                  : 'bg-[#FDFBF7] text-[#113824] hover:bg-gray-100 border border-[#E8DBC5]'
                              }`}
                            >
                              <div className="text-xs font-black">{pkg.weight_kg} KG</div>
                              <div className="text-[10px] opacity-80 truncate">
                                {formatPKR(pkg.effective_price)}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Pricing & Stock Meter */}
                    <div className="pt-2 border-t border-[#F5EEE2] flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-gray-500">Price for {currentPkg?.name}:</div>
                        <div className="flex items-baseline space-x-2">
                          <span className="text-2xl font-black text-[#113824]">
                            {formatPKR(currentPkg?.effective_price)}
                          </span>
                          {currentPkg?.sale_price != null && (
                            <span className="text-xs text-gray-400 line-through">
                              {formatPKR(currentPkg.base_price)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        {stockRemaining > 0 ? (
                          <div className="inline-block bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full text-[11px] font-bold">
                            {stockRemaining} boxes in stock
                          </div>
                        ) : (
                          <div className="inline-block bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full text-[11px] font-bold">
                            Sold Out
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Add to Cart CTA or Back in Stock Trigger */}
                    {stockRemaining > 0 ? (
                      <button
                        onClick={() => handleAddToCart(product)}
                        className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wider uppercase flex items-center justify-center space-x-2 transition-all shadow-md ${
                          isAdded
                            ? 'bg-emerald-700 text-white'
                            : 'bg-[#113824] hover:bg-[#195235] text-[#FDFBF7]'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Added to Cart!</span>
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="w-4 h-4" />
                            <span>Add {currentPkg?.weight_kg} KG to Cart</span>
                          </>
                        )}
                      </button>
                    ) : isFeatureEnabled('back_in_stock') ? (
                      <button
                        onClick={() =>
                          setBackInStockTarget({
                            productId: product.id,
                            productName: product.name,
                            packageSizeId: currentPkg?.id,
                            packageName: currentPkg?.name
                          })
                        }
                        className="w-full py-3.5 rounded-xl font-bold text-xs tracking-wider uppercase flex items-center justify-center space-x-2 bg-[#F5EEE2] hover:bg-[#E8DBC5] text-[#113824] border border-[#D97706] transition-all shadow-xs"
                      >
                        <Bell className="w-4 h-4 text-[#D97706]" />
                        <span>Notify When Harvested</span>
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full py-3.5 rounded-xl font-bold text-xs tracking-wider uppercase flex items-center justify-center space-x-2 bg-gray-200 text-gray-400 cursor-not-allowed"
                      >
                        <span>Sold Out for Season</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Side-by-Side Cultivar Comparison Modal */}
      {isFeatureEnabled('mango_comparison') && (
        <VarietyComparisonModal
          isOpen={isCompareOpen}
          onClose={() => setIsCompareOpen(false)}
        />
      )}

      {/* Back In Stock Notification Modal */}
      {isFeatureEnabled('back_in_stock') && backInStockTarget && (
        <BackInStockModal
          isOpen={Boolean(backInStockTarget)}
          onClose={() => setBackInStockTarget(null)}
          productId={backInStockTarget.productId}
          productName={backInStockTarget.productName}
          packageSizeId={backInStockTarget.packageSizeId}
          packageName={backInStockTarget.packageName}
        />
      )}
    </section>
  );
}
