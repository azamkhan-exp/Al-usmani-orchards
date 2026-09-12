'use client';

import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  Package,
  Layers,
  Plus,
  Sparkles,
  Edit2,
  Trash2,
  CheckCircle,
  X,
  MapPin,
  Search,
  Filter,
  ArrowUpDown,
  Tag,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  Star,
  ArrowUp,
  ArrowDown,
  Check,
  Loader2
} from 'lucide-react';
import { ProductDTO, ProductPackageDTO, VarietyDTO, ProductStatus } from '@/types/dtos';
import { formatPKR, formatStock, formatWeight, formatNumber } from '@/lib/formatters';

const STATUS_OPTIONS: Array<{ value: ProductStatus | 'ALL'; label: string; color: string }> = [
  { value: 'ALL', label: 'All Statuses', color: 'bg-gray-100 text-gray-800' },
  { value: 'ACTIVE', label: 'Active', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { value: 'SEASONAL', label: 'Seasonal', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { value: 'PREORDER', label: 'Pre-Order', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  { value: 'OUT_OF_STOCK', label: 'Out of Stock', color: 'bg-red-100 text-red-800 border-red-300' },
  { value: 'DRAFT', label: 'Draft', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  { value: 'INACTIVE', label: 'Inactive', color: 'bg-zinc-100 text-zinc-600 border-zinc-300' }
];

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [varieties, setVarieties] = useState<VarietyDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'VARIETIES' | 'PACKAGES'>('PRODUCTS');

  // Search, Filter & Pagination States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'ALL'>('ALL');
  const [varietyFilter, setVarietyFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'NAME' | 'PACKAGES' | 'STATUS'>('NAME');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Add Product Modal
  const [addProductModal, setAddProductModal] = useState(false);
  const [newProdVarietyId, setNewProdVarietyId] = useState('');
  const [newProdName, setNewProdName] = useState('');
  const [newProdTagline, setNewProdTagline] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdGrade, setNewProdGrade] = useState('Export Grade A+');
  const [newProdSeason, setNewProdSeason] = useState('June - August');
  const [newProdStatus, setNewProdStatus] = useState<ProductStatus>('ACTIVE');
  const [newProdFeatured, setNewProdFeatured] = useState(false);
  const [newProdPreorder, setNewProdPreorder] = useState(false);
  const [newProdImage, setNewProdImage] = useState('https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=1000&q=80');
  const [newProdPkgName, setNewProdPkgName] = useState('5 KG Royal Crate');
  const [newProdPkgWeight, setNewProdPkgWeight] = useState('5');
  const [newProdPkgPrice, setNewProdPkgPrice] = useState('2800');
  const [newProdPkgStock, setNewProdPkgStock] = useState('50');

  // Edit Product Modal
  const [editProductModal, setEditProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDTO | null>(null);

  // Product Image Manager States
  const [productImages, setProductImages] = useState<any[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [uploadAltText, setUploadAltText] = useState('');
  const [uploadSetPrimary, setUploadSetPrimary] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  // Add Package Modal
  const [addPackageModal, setAddPackageModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [packageName, setPackageName] = useState('');
  const [packageWeight, setPackageWeight] = useState('5');
  const [basePrice, setBasePrice] = useState('2800');
  const [salePrice, setSalePrice] = useState('');
  const [preorderPrice, setPreorderPrice] = useState('');
  const [initialStock, setInitialStock] = useState('50');

  // Edit Package Modal
  const [editPackageModal, setEditPackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ProductPackageDTO | null>(null);
  const [editBasePrice, setEditBasePrice] = useState('');
  const [editSalePrice, setEditSalePrice] = useState('');
  const [editPreorderPrice, setEditPreorderPrice] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

  // Add Variety Modal
  const [addVarietyModal, setAddVarietyModal] = useState(false);
  const [varietyName, setVarietyName] = useState('');
  const [originCity, setOriginCity] = useState('Multan');
  const [sweetnessBrix, setSweetnessBrix] = useState('24.0');
  const [aromaLevel, setAromaLevel] = useState('9');
  const [varietyDesc, setVarietyDesc] = useState('');
  // Edit Variety & Image Modal
  const [editVarietyModal, setEditVarietyModal] = useState(false);
  const [editingVariety, setEditingVariety] = useState<any | null>(null);
  const [varietyImgUrl, setVarietyImgUrl] = useState('');
  const [varietyBrix, setVarietyBrix] = useState('');
  const [varietyAroma, setVarietyAroma] = useState('');
  const [varietyDescText, setVarietyDescText] = useState('');
  const [varietyNotes, setVarietyNotes] = useState('');
  const [varietyOrigin, setVarietyOrigin] = useState('');
  const [varietySaving, setVarietySaving] = useState(false);

  const openEditVariety = (v: any) => {
    setEditingVariety(v);
    setVarietyImgUrl(v.image_url || '');
    setVarietyBrix(String(v.sweetness_brix || '24'));
    setVarietyAroma(String(v.aroma_level || '9'));
    setVarietyDescText(v.description || '');
    setVarietyNotes(v.flavor_notes || '');
    setVarietyOrigin(v.origin_city || 'Multan');
    setEditVarietyModal(true);
  };

  const handleSaveVariety = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVariety) return;
    setVarietySaving(true);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_VARIETY',
          id: editingVariety.id,
          name: editingVariety.name,
          imageUrl: varietyImgUrl,
          originCity: varietyOrigin,
          sweetnessBrix: Number(varietyBrix),
          aromaLevel: Number(varietyAroma),
          description: varietyDescText,
          flavorNotes: varietyNotes
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditVarietyModal(false);
        fetchData();
      } else {
        alert(data.error || 'Failed to update variety');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating variety');
    } finally {
      setVarietySaving(false);
    }
  };

  const fetchData = () => {
    setLoading(true);
    setError(null);
    fetch('/api/admin/products')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProducts(data.products || []);
          setVarieties(data.varieties || []);
          if (data.products && data.products.length > 0) {
            setSelectedProductId(data.products[0].id);
          }
          if (data.varieties && data.varieties.length > 0) {
            setNewProdVarietyId(data.varieties[0].id);
          }
        } else {
          setError(data.error || 'Failed to fetch products');
        }
      })
      .catch((e) => {
        console.error('Fetch error:', e);
        setError('Network error: Unable to load products');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products
      .filter((prod) => {
        const matchesSearch =
          !searchQuery ||
          prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          prod.variety_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          prod.packages?.some((p) => p.sku?.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesStatus = statusFilter === 'ALL' || prod.status === statusFilter;
        const matchesVariety = varietyFilter === 'ALL' || prod.variety_id === varietyFilter;

        return matchesSearch && matchesStatus && matchesVariety;
      })
      .sort((a, b) => {
        if (sortBy === 'NAME') return a.name.localeCompare(b.name);
        if (sortBy === 'PACKAGES') return (b.packages?.length || 0) - (a.packages?.length || 0);
        if (sortBy === 'STATUS') return a.status.localeCompare(b.status);
        return 0;
      });
  }, [products, searchQuery, statusFilter, varietyFilter, sortBy]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_PRODUCT',
          varietyId: newProdVarietyId,
          name: newProdName,
          tagline: newProdTagline,
          description: newProdDesc,
          grade: newProdGrade,
          harvestSeason: newProdSeason,
          status: newProdStatus,
          isFeatured: newProdFeatured,
          isPreorderActive: newProdPreorder,
          primaryImage: newProdImage,
          initialPackageName: newProdPkgName,
          initialWeightKg: Number(newProdPkgWeight),
          initialBasePrice: Number(newProdPkgPrice),
          initialStock: Number(newProdPkgStock)
        })
      });
      const data = await res.json();
      if (data.success) {
        setAddProductModal(false);
        setNewProdName('');
        setNewProdTagline('');
        setNewProdDesc('');
        fetchData();
      } else {
        alert(data.error || 'Failed to create product');
      }
    } catch (e) {
      console.error(e);
      alert('Network error creating product');
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      const res = await fetch('/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_PRODUCT',
          id: editingProduct.id,
          name: editingProduct.name,
          tagline: editingProduct.tagline,
          description: editingProduct.description,
          grade: editingProduct.grade,
          harvestSeason: editingProduct.harvest_season,
          status: editingProduct.status,
          isFeatured: editingProduct.is_featured,
          isPreorderActive: editingProduct.is_preorder_active,
          primaryImage: editingProduct.primary_image
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditProductModal(false);
        fetchData();
      } else {
        alert(data.error || 'Failed to update product');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openEditProduct = (prod: ProductDTO) => {
    setEditingProduct(prod);
    setEditProductModal(true);
    setImageUploadError(null);
    setUploadFile(null);
    setUploadPreview(null);
    setUploadAltText('');
    setUploadSetPrimary(false);
    fetchProductImages(prod.id);
  };

  const fetchProductImages = async (productId: string) => {
    try {
      const res = await fetch(`/api/admin/products/images?productId=${productId}`);
      const data = await res.json();
      if (data.success) {
        setProductImages(data.images || []);
      }
    } catch (err) {
      console.error('Error fetching images:', err);
    }
  };

  const handleUploadProductImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !editingProduct) return;
    setUploadingImage(true);
    setImageUploadError(null);
    try {
      const fd = new FormData();
      fd.append('productId', editingProduct.id);
      fd.append('file', uploadFile);
      fd.append('altText', uploadAltText);
      fd.append('setAsPrimary', String(uploadSetPrimary));

      const res = await fetch('/api/admin/products/images', {
        method: 'POST',
        body: fd
      });
      const data = await res.json();
      if (data.success) {
        setUploadFile(null);
        setUploadPreview(null);
        setUploadAltText('');
        setUploadSetPrimary(false);
        fetchProductImages(editingProduct.id);
        fetchData();
      } else {
        setImageUploadError(data.error || 'Failed to upload image');
      }
    } catch (err: any) {
      setImageUploadError(err.message || 'Error uploading image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSetPrimaryImage = async (imageId: string) => {
    if (!editingProduct) return;
    try {
      const res = await fetch('/api/admin/products/images', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SET_PRIMARY',
          imageId,
          productId: editingProduct.id
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditingProduct({ ...editingProduct, primary_image: data.primaryImage });
        fetchProductImages(editingProduct.id);
        fetchData();
      }
    } catch (err) {
      console.error('Set primary failed:', err);
    }
  };

  const handleDeleteProductImage = async (imageId: string) => {
    if (!editingProduct) return;
    if (!confirm('Are you sure you want to delete this photo?')) return;
    try {
      const res = await fetch(`/api/admin/products/images?imageId=${imageId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        fetchProductImages(editingProduct.id);
        fetchData();
      } else {
        alert(data.error || 'Failed to delete image');
      }
    } catch (err) {
      console.error('Delete image failed:', err);
    }
  };

  const handleReorderImages = async (index: number, direction: 'UP' | 'DOWN') => {
    if (!editingProduct || productImages.length < 2) return;
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= productImages.length) return;

    const newImages = [...productImages];
    const [moved] = newImages.splice(index, 1);
    newImages.splice(targetIndex, 0, moved);

    const items = newImages.map((img, i) => ({ id: img.id, sort_order: i }));
    setProductImages(newImages);

    try {
      await fetch('/api/admin/products/images', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REORDER',
          productId: editingProduct.id,
          items
        })
      });
      fetchData();
    } catch (err) {
      console.error('Error reordering images:', err);
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!confirm(`Are you sure you want to archive product "${productName}"?`)) return;
    try {
      const res = await fetch(`/api/admin/products?productId=${productId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_PACKAGE_SIZE',
          productId: selectedProductId,
          name: packageName,
          weightKg: Number(packageWeight),
          basePrice: Number(basePrice),
          salePrice: salePrice ? Number(salePrice) : null,
          preorderPrice: preorderPrice ? Number(preorderPrice) : null,
          initialStock: Number(initialStock)
        })
      });
      const data = await res.json();
      if (data.success) {
        setAddPackageModal(false);
        setPackageName('');
        setSalePrice('');
        setPreorderPrice('');
        fetchData();
      } else {
        alert(data.error || 'Failed to create package size');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPackage) return;

    try {
      const res = await fetch('/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: editingPackage.id,
          basePrice: Number(editBasePrice),
          salePrice: editSalePrice ? Number(editSalePrice) : null,
          preorderPrice: editPreorderPrice ? Number(editPreorderPrice) : null,
          isActive: editIsActive
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditPackageModal(false);
        fetchData();
      } else {
        alert(data.error || 'Failed to update package');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateVariety = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_VARIETY',
          name: varietyName,
          originCity,
          sweetnessBrix: Number(sweetnessBrix),
          aromaLevel: Number(aromaLevel),
          description: varietyDesc
        })
      });
      const data = await res.json();
      if (data.success) {
        setAddVarietyModal(false);
        setVarietyName('');
        setVarietyDesc('');
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openEditPackage = (pkg: ProductPackageDTO) => {
    setEditingPackage(pkg);
    setEditBasePrice(String(pkg.base_price || ''));
    setEditSalePrice(pkg.sale_price !== null ? String(pkg.sale_price) : '');
    setEditPreorderPrice(pkg.preorder_price !== null ? String(pkg.preorder_price) : '');
    setEditIsActive(pkg.is_active);
    setEditPackageModal(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif font-black text-[#113824]">
              Products, Varieties & Sizing
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Authoritative catalog management, dynamic box sizing, Brix sugar calibrations, and live stock tracking.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setAddVarietyModal(true)}
              className="px-3.5 py-2 rounded-xl bg-white border border-gray-300 text-xs font-bold text-[#113824] hover:bg-gray-50 transition shadow-xs flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Add Variety</span>
            </button>
            <button
              onClick={() => setAddPackageModal(true)}
              className="px-3.5 py-2 rounded-xl bg-white border border-gray-300 text-xs font-bold text-[#113824] hover:bg-gray-50 transition shadow-xs flex items-center space-x-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Add Package Size</span>
            </button>
            <button
              onClick={() => setAddProductModal(true)}
              className="px-4 py-2 rounded-xl bg-[#113824] hover:bg-[#195235] text-white text-xs font-bold transition shadow flex items-center space-x-1.5"
            >
              <Package className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>+ Create Product</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center space-x-3 text-red-800 text-xs font-medium">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Main Tab Navigation */}
        <div className="flex space-x-2 border-b border-gray-200 pb-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('PRODUCTS')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'PRODUCTS'
                ? 'bg-[#113824] text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-900 bg-gray-100'
            }`}
          >
            Catalog Products ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('PACKAGES')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'PACKAGES'
                ? 'bg-[#113824] text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-900 bg-gray-100'
            }`}
          >
            Dynamic Package Sizing ({products.flatMap((p) => p.packages || []).length})
          </button>
          <button
            onClick={() => setActiveTab('VARIETIES')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'VARIETIES'
                ? 'bg-[#113824] text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-900 bg-gray-100'
            }`}
          >
            Heritage Mango Varieties ({varieties.length})
          </button>
        </div>

        {/* TAB 1: PRODUCTS */}
        {activeTab === 'PRODUCTS' && (
          <div className="space-y-6">
            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products, varieties, SKUs..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#113824]/20"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="flex items-center space-x-1">
                  <Filter className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-gray-500 font-medium">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value as any);
                      setCurrentPage(1);
                    }}
                    className="p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-1">
                  <span className="text-gray-500 font-medium">Variety:</span>
                  <select
                    value={varietyFilter}
                    onChange={(e) => {
                      setVarietyFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700"
                  >
                    <option value="ALL">All Varieties</option>
                    {varieties.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-1">
                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700"
                  >
                    <option value="NAME">Sort by Name</option>
                    <option value="PACKAGES">Sort by Packages Count</option>
                    <option value="STATUS">Sort by Status</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="p-12 text-center text-gray-400 font-medium">
                Loading products catalog...
              </div>
            ) : paginatedProducts.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-gray-300">
                <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <div className="text-sm font-bold text-gray-700">No products found</div>
                <div className="text-xs text-gray-500 mt-1">
                  Try adjusting your search criteria or create a new product.
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedProducts.map((prod) => {
                  const statusOpt = STATUS_OPTIONS.find((s) => s.value === prod.status) || STATUS_OPTIONS[1];

                  return (
                    <div
                      key={prod.id}
                      className="card-luxury rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-xs flex flex-col justify-between"
                    >
                      {/* Card Top / Details */}
                      <div className="p-5 space-y-4">
                        <div className="flex space-x-3.5">
                          <img
                            src={prod.primary_image}
                            alt={prod.name}
                            className="w-20 h-20 rounded-xl object-cover border border-gray-200 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-[#D97706] uppercase tracking-wider truncate">
                                {prod.variety_name}
                              </span>
                              <span
                                className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider ${statusOpt.color}`}
                              >
                                {prod.status}
                              </span>
                            </div>
                            <h3 className="text-sm font-bold text-[#113824] truncate mt-0.5">
                              {prod.name}
                            </h3>
                            <div className="text-[11px] text-gray-500">{prod.grade}</div>
                            <div className="text-[10px] text-emerald-700 font-bold mt-1 flex items-center space-x-1">
                              <span>{prod.packages?.length || 0} package sizes configured</span>
                              {prod.is_featured && (
                                <span className="bg-[#F59E0B]/20 text-[#D97706] px-1.5 py-0.2 rounded text-[9px]">
                                  Featured
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Configured Packages List (Defense against undefined) */}
                        <div className="p-3 bg-gray-50 rounded-xl space-y-2 text-xs border border-gray-100">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-gray-700 text-[11px]">Configured Packages:</span>
                            <button
                              onClick={() => {
                                setSelectedProductId(prod.id);
                                setAddPackageModal(true);
                              }}
                              className="text-[10px] text-[#D97706] hover:underline font-bold"
                            >
                              + Add Size
                            </button>
                          </div>

                          {(!prod.packages || prod.packages.length === 0) ? (
                            <div className="text-[11px] text-gray-400 italic py-1">
                              No package sizes attached yet.
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {prod.packages.map((pkg) => (
                                <div
                                  key={pkg.id}
                                  className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-white border border-gray-100 hover:border-gray-300 transition"
                                >
                                  <div>
                                    <div className="font-bold text-gray-800">
                                      {pkg.name} ({formatWeight(pkg.weight_kg)})
                                    </div>
                                    <div className="text-[10px] text-gray-400">
                                      Stock: {formatStock(pkg.available_stock)}
                                      {pkg.reserved_stock > 0 && ` (${pkg.reserved_stock} reserved)`}
                                    </div>
                                  </div>

                                  <div className="text-right flex items-center space-x-2">
                                    <div>
                                      <div className="font-bold text-[#113824]">
                                        {formatPKR(pkg.effective_price)}
                                      </div>
                                      {pkg.sale_price !== null && pkg.sale_price < pkg.base_price && (
                                        <div className="text-[9px] text-gray-400 line-through">
                                          {formatPKR(pkg.base_price)}
                                        </div>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => openEditPackage(pkg)}
                                      className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700"
                                      title="Edit package price/stock"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs">
                        <span className="text-[10px] text-gray-500 font-mono">
                          Brix: {prod.sweetness_brix}°
                        </span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openEditProduct(prod)}
                            className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-700 hover:text-[#113824] text-[11px] font-bold flex items-center space-x-1 shadow-2xs"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod.id, prod.name)}
                            className="px-2 py-1 rounded-lg hover:bg-red-50 text-red-500 hover:text-red-700 text-[11px] font-bold"
                            title="Archive Product"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 pt-4 text-xs font-bold">
                <div className="text-gray-500">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                  {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} products
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="p-2 rounded-lg border border-gray-300 bg-white disabled:opacity-40"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-3 py-1 bg-gray-100 rounded-lg text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="p-2 rounded-lg border border-gray-300 bg-white disabled:opacity-40"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PACKAGES */}
        {activeTab === 'PACKAGES' && (
          <div className="card-luxury rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <span className="text-xs font-bold text-gray-700">
                All Dynamic Package Sizes Across Products & Varieties
              </span>
              <button
                onClick={() => setAddPackageModal(true)}
                className="text-xs font-bold text-[#D97706] hover:underline flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Package Size</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b text-gray-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Package Name</th>
                    <th className="p-3">Product</th>
                    <th className="p-3">Weight</th>
                    <th className="p-3">Base Price</th>
                    <th className="p-3">Sale Price</th>
                    <th className="p-3">Effective Price</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Available Stock</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.flatMap((p) => (p.packages || []).map((pkg) => ({ ...pkg, productName: p.name }))).map((pkg: any) => (
                    <tr key={pkg.id} className="hover:bg-gray-50">
                      <td className="p-3 font-bold text-[#113824]">{pkg.name}</td>
                      <td className="p-3 text-gray-600">{pkg.productName}</td>
                      <td className="p-3 font-medium">{formatWeight(pkg.weight_kg)}</td>
                      <td className="p-3 font-medium">{formatPKR(pkg.base_price)}</td>
                      <td className="p-3 font-medium text-emerald-800">
                        {pkg.sale_price !== null ? formatPKR(pkg.sale_price) : '---'}
                      </td>
                      <td className="p-3 font-bold text-[#113824]">
                        {formatPKR(pkg.effective_price)}
                      </td>
                      <td className="p-3 font-mono text-gray-500">{pkg.sku}</td>
                      <td className="p-3">
                        <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded text-[11px]">
                          {formatStock(pkg.available_stock)}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pkg.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                          {pkg.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => openEditPackage(pkg)}
                          className="px-2.5 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: VARIETIES */}
        {activeTab === 'VARIETIES' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <div>
                <h3 className="text-sm font-serif font-bold text-[#113824]">
                  Mango Cultivars & High-Resolution Imagery
                </h3>
                <p className="text-xs text-gray-500">
                  Manage authentic variety photography, brix ratings, and terroir descriptions.
                </p>
              </div>
              <button
                onClick={() => setAddVarietyModal(true)}
                className="inline-flex items-center space-x-1 px-4 py-2 rounded-xl bg-[#113824] text-white text-xs font-bold uppercase tracking-wider"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Variety</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {varieties.map((v) => (
                <div key={v.id} className="card-luxury rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="relative h-48 w-full bg-gray-100 overflow-hidden">
                      <img
                        src={v.image_url || '/images/placeholder-mango.svg'}
                        alt={v.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/images/placeholder-mango.svg';
                        }}
                      />
                      <div className="absolute top-3 left-3 bg-[#113824]/90 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {v.origin_city}
                      </div>
                      <div className="absolute top-3 right-3 bg-[#F59E0B] text-[#092115] text-[10px] font-black px-2.5 py-1 rounded-full shadow-xs">
                        {v.sweetness_brix}° Brix
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      <div className="flex justify-between items-start">
                        <h3 className="text-base font-serif font-bold text-[#113824]">{v.name}</h3>
                        <span className="text-[10px] font-bold text-gray-400">Aroma: {v.aroma_level}/10</span>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-3">{v.description}</p>
                      {v.flavor_notes && (
                        <div className="p-2 bg-amber-50/60 rounded-xl border border-amber-100 text-[11px] text-[#D97706] italic font-serif">
                          &ldquo;{v.flavor_notes}&rdquo;
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 pt-0 border-t border-gray-100 mt-2 flex justify-end">
                    <button
                      onClick={() => openEditVariety(v)}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-[#113824] hover:text-white text-gray-700 text-xs font-bold transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Photo & Details</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODAL 1: ADD NEW PRODUCT */}
        {addProductModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 my-8">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-serif font-bold text-base text-[#113824]">
                  Create New Catalog Product
                </h3>
                <button onClick={() => setAddProductModal(false)}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Mango Cultivar / Variety:</label>
                  <select
                    value={newProdVarietyId}
                    onChange={(e) => setNewProdVarietyId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300"
                    required
                  >
                    {varieties.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.origin_city})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Product Title:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Multani Chaunsa - Emperor Select"
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Tagline:</label>
                  <input
                    type="text"
                    placeholder="e.g. Hand-picked at dawn from our 70-year old heirloom trees."
                    value={newProdTagline}
                    onChange={(e) => setNewProdTagline(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Grade:</label>
                    <select
                      value={newProdGrade}
                      onChange={(e) => setNewProdGrade(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-300"
                    >
                      <option value="Export Grade A+">Export Grade A+</option>
                      <option value="Connoisseur Reserve">Connoisseur Reserve</option>
                      <option value="Grade A Premium">Grade A Premium</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Status:</label>
                    <select
                      value={newProdStatus}
                      onChange={(e) => setNewProdStatus(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border border-gray-300"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="SEASONAL">SEASONAL</option>
                      <option value="PREORDER">PREORDER</option>
                      <option value="DRAFT">DRAFT</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Product Description:</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Flavor profile, skin color, and harvest details..."
                    value={newProdDesc}
                    onChange={(e) => setNewProdDesc(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300"
                  />
                </div>

                <div className="p-3 bg-gray-50 rounded-xl space-y-2 border border-gray-200">
                  <div className="font-bold text-gray-800 text-[11px]">Initial Dynamic Package Size:</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-500 block">Name:</label>
                      <input
                        type="text"
                        value={newProdPkgName}
                        onChange={(e) => setNewProdPkgName(e.target.value)}
                        className="w-full p-1.5 rounded-lg border border-gray-300 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 block">Weight (KG):</label>
                      <input
                        type="number"
                        value={newProdPkgWeight}
                        onChange={(e) => setNewProdPkgWeight(e.target.value)}
                        className="w-full p-1.5 rounded-lg border border-gray-300 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 block">Price (PKR):</label>
                      <input
                        type="number"
                        value={newProdPkgPrice}
                        onChange={(e) => setNewProdPkgPrice(e.target.value)}
                        className="w-full p-1.5 rounded-lg border border-gray-300 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4 pt-1">
                  <label className="flex items-center space-x-2 text-xs font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={newProdFeatured}
                      onChange={(e) => setNewProdFeatured(e.target.checked)}
                      className="rounded text-[#113824]"
                    />
                    <span>Featured on Home</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={newProdPreorder}
                      onChange={(e) => setNewProdPreorder(e.target.checked)}
                      className="rounded text-[#113824]"
                    />
                    <span>Pre-Order Eligible</span>
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-[#113824] hover:bg-[#195235] text-white font-bold tracking-wider uppercase text-xs shadow"
                  >
                    Save & Publish Product
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: EDIT PRODUCT & IMAGE GALLERY */}
        {editProductModal && editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-gray-200 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#113824]">
                    Edit Product & Media: {editingProduct.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Update harvest details, pricing rules, and authentic high-resolution fruit photography.
                  </p>
                </div>
                <button
                  onClick={() => setEditProductModal(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Column 1: Product Specifications Form */}
                <div className="lg:col-span-6 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#D97706] flex items-center space-x-1">
                    <Package className="w-3.5 h-3.5" />
                    <span>Catalog Specifications</span>
                  </h4>

                  <form onSubmit={handleUpdateProduct} className="space-y-3 text-xs">
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Product Name:</label>
                      <input
                        type="text"
                        value={editingProduct.name}
                        onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-gray-300 focus:border-[#113824] outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Tagline:</label>
                      <input
                        type="text"
                        value={editingProduct.tagline || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, tagline: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-gray-300 focus:border-[#113824] outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-gray-700 block mb-1">Grade:</label>
                        <input
                          type="text"
                          value={editingProduct.grade}
                          onChange={(e) => setEditingProduct({ ...editingProduct, grade: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-gray-300 focus:border-[#113824] outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-gray-700 block mb-1">Status:</label>
                        <select
                          value={editingProduct.status}
                          onChange={(e) => setEditingProduct({ ...editingProduct, status: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-gray-300 font-bold focus:border-[#113824] outline-none"
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="SEASONAL">SEASONAL</option>
                          <option value="PREORDER">PREORDER</option>
                          <option value="OUT_OF_STOCK">OUT OF STOCK</option>
                          <option value="DRAFT">DRAFT</option>
                          <option value="INACTIVE">INACTIVE</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Harvest Season:</label>
                      <input
                        type="text"
                        value={editingProduct.harvest_season || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, harvest_season: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-gray-300 focus:border-[#113824] outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Description:</label>
                      <textarea
                        rows={3}
                        value={editingProduct.description}
                        onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-gray-300 focus:border-[#113824] outline-none"
                      />
                    </div>

                    <div className="flex items-center space-x-4 pt-1">
                      <label className="flex items-center space-x-2 text-xs font-bold text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingProduct.is_featured}
                          onChange={(e) => setEditingProduct({ ...editingProduct, is_featured: e.target.checked })}
                          className="rounded text-[#113824]"
                        />
                        <span>Featured on Home</span>
                      </label>
                      <label className="flex items-center space-x-2 text-xs font-bold text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingProduct.is_preorder_active}
                          onChange={(e) => setEditingProduct({ ...editingProduct, is_preorder_active: e.target.checked })}
                          className="rounded text-[#113824]"
                        />
                        <span>Pre-Order Active</span>
                      </label>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        className="w-full py-3 rounded-xl bg-[#113824] hover:bg-[#195235] text-white font-bold tracking-wider uppercase text-xs shadow"
                      >
                        Save Product Details
                      </button>
                    </div>
                  </form>
                </div>

                {/* Column 2: High-Resolution Mango Photography & Gallery */}
                <div className="lg:col-span-6 space-y-4 border-t lg:border-t-0 lg:border-l lg:pl-6 border-gray-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#113824] flex items-center space-x-1">
                      <ImageIcon className="w-3.5 h-3.5 text-[#F59E0B]" />
                      <span>Product Photography ({productImages.length})</span>
                    </h4>
                    <span className="text-[10px] text-gray-400">JPG, PNG, WebP • Max 5MB</span>
                  </div>

                  {/* Upload Dropzone */}
                  <form onSubmit={handleUploadProductImage} className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/60 space-y-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        id="product-photo-input"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setUploadFile(file);
                          if (file) {
                            setUploadPreview(URL.createObjectURL(file));
                          } else {
                            setUploadPreview(null);
                          }
                        }}
                        className="hidden"
                      />
                      <label
                        htmlFor="product-photo-input"
                        className="cursor-pointer inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white border border-gray-300 hover:border-[#113824] text-gray-700 text-xs font-bold shadow-2xs transition"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#113824]" />
                        <span>{uploadFile ? 'Change File' : 'Choose Photo...'}</span>
                      </label>

                      {uploadFile && (
                        <span className="text-xs text-gray-600 truncate max-w-[160px] font-medium">
                          {uploadFile.name}
                        </span>
                      )}
                    </div>

                    {uploadPreview && (
                      <div className="relative w-full h-28 rounded-xl overflow-hidden border border-amber-300 bg-black/5">
                        <img src={uploadPreview} alt="Preview" className="w-full h-full object-cover" />
                        <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded font-mono">
                          Ready to upload
                        </span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Alt text (e.g. Tree-ripened Sindhri in export carton)"
                        value={uploadAltText}
                        onChange={(e) => setUploadAltText(e.target.value)}
                        className="w-full p-2 text-xs rounded-lg border border-gray-200 bg-white"
                      />

                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center space-x-1.5 text-xs text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={uploadSetPrimary}
                            onChange={(e) => setUploadSetPrimary(e.target.checked)}
                            className="rounded text-[#113824]"
                          />
                          <span className="font-bold text-[11px]">Set as Primary Cover</span>
                        </label>

                        <button
                          type="submit"
                          disabled={!uploadFile || uploadingImage}
                          className="px-4 py-1.5 rounded-xl bg-[#113824] hover:bg-[#195235] text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50 flex items-center space-x-1"
                        >
                          {uploadingImage ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-3 h-3" />
                              <span>Upload</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {imageUploadError && (
                      <div className="text-[11px] text-red-600 bg-red-50 p-2 rounded-lg border border-red-200 flex items-center space-x-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{imageUploadError}</span>
                      </div>
                    )}
                  </form>

                  {/* Existing Images Gallery List */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Current Gallery Photos ({productImages.length})
                    </div>

                    {productImages.length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl text-gray-400 text-xs">
                        No photos uploaded yet for this mango cultivar.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {productImages.map((img, idx) => (
                          <div
                            key={img.id}
                            className={`flex items-center justify-between p-2 rounded-xl border transition ${
                              img.is_primary
                                ? 'bg-amber-50/60 border-amber-300 ring-1 ring-amber-300'
                                : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <img
                                src={img.image_url}
                                alt={img.alt_text || 'Mango'}
                                className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center space-x-1.5">
                                  {img.is_primary ? (
                                    <span className="inline-flex items-center space-x-1 bg-[#F59E0B] text-[#092115] text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                                      <Star className="w-2.5 h-2.5 fill-current" />
                                      <span>Primary Cover</span>
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-mono text-gray-400">
                                      #{idx + 1}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-gray-600 truncate max-w-[180px] mt-0.5">
                                  {img.alt_text || 'Al Usmani Fresh Harvest'}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-1">
                              {/* Reorder Buttons */}
                              <button
                                onClick={() => handleReorderImages(idx, 'UP')}
                                disabled={idx === 0}
                                className="p-1 rounded hover:bg-gray-200 text-gray-500 disabled:opacity-30"
                                title="Move up"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleReorderImages(idx, 'DOWN')}
                                disabled={idx === productImages.length - 1}
                                className="p-1 rounded hover:bg-gray-200 text-gray-500 disabled:opacity-30"
                                title="Move down"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>

                              {/* Set Primary Button */}
                              {!img.is_primary && (
                                <button
                                  onClick={() => handleSetPrimaryImage(img.id)}
                                  className="px-2 py-1 rounded bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold"
                                  title="Make this the primary cover image"
                                >
                                  Make Primary
                                </button>
                              )}

                              {/* Delete Button */}
                              <button
                                onClick={() => handleDeleteProductImage(img.id)}
                                className="p-1.5 rounded hover:bg-red-100 text-red-500 hover:text-red-700"
                                title="Delete image"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: ADD PACKAGE SIZE */}
        {addPackageModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-serif font-bold text-base text-[#113824]">
                  Create Dynamic Package Size
                </h3>
                <button onClick={() => setAddPackageModal(false)}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleCreatePackage} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Select Product:</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.variety_name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Package Name:</label>
                    <input
                      type="text"
                      placeholder="e.g. 8 KG Family Crate"
                      value={packageName}
                      onChange={(e) => setPackageName(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-300"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Weight (KG):</label>
                    <input
                      type="number"
                      value={packageWeight}
                      onChange={(e) => setPackageWeight(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-300"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Regular Base Price (PKR):</label>
                    <input
                      type="number"
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-300"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Sale Price (Optional):</label>
                    <input
                      type="number"
                      placeholder="Discounted price"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Pre-order Price (Optional):</label>
                    <input
                      type="number"
                      placeholder="Early-bird rate"
                      value={preorderPrice}
                      onChange={(e) => setPreorderPrice(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Initial Stock (Boxes):</label>
                    <input
                      type="number"
                      value={initialStock}
                      onChange={(e) => setInitialStock(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-300"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-[#113824] hover:bg-[#195235] text-white font-bold tracking-wider uppercase text-xs"
                  >
                    Save Package Size & Stock
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 4: EDIT PACKAGE PRICE & STATUS */}
        {editPackageModal && editingPackage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-serif font-bold text-base text-[#113824]">
                  Edit Package: {editingPackage.name}
                </h3>
                <button onClick={() => setEditPackageModal(false)}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleUpdatePackage} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Base Price (PKR):</label>
                  <input
                    type="number"
                    value={editBasePrice}
                    onChange={(e) => setEditBasePrice(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Sale Price (PKR):</label>
                  <input
                    type="number"
                    placeholder="Leave empty if regular price"
                    value={editSalePrice}
                    onChange={(e) => setEditSalePrice(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Pre-order Price (PKR):</label>
                  <input
                    type="number"
                    placeholder="Leave empty if none"
                    value={editPreorderPrice}
                    onChange={(e) => setEditPreorderPrice(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300"
                  />
                </div>

                <div className="pt-1">
                  <label className="flex items-center space-x-2 text-xs font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={editIsActive}
                      onChange={(e) => setEditIsActive(e.target.checked)}
                    />
                    <span>Package Active in Storefront</span>
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-[#113824] hover:bg-[#195235] text-white font-bold tracking-wider uppercase text-xs"
                  >
                    Update Pricing
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 5: ADD VARIETY */}
        {addVarietyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-serif font-bold text-base text-[#113824]">
                  Add Heritage Cultivar / Variety
                </h3>
                <button onClick={() => setAddVarietyModal(false)}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleCreateVariety} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Cultivar Name:</label>
                  <input
                    type="text"
                    placeholder="e.g. Dusehri"
                    value={varietyName}
                    onChange={(e) => setVarietyName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Origin City:</label>
                    <input
                      type="text"
                      value={originCity}
                      onChange={(e) => setOriginCity(e.target.value)}
                      className="w-full p-2 rounded-xl border border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Brix Sweetness:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={sweetnessBrix}
                      onChange={(e) => setSweetnessBrix(e.target.value)}
                      className="w-full p-2 rounded-xl border border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Aroma (1-10):</label>
                    <input
                      type="number"
                      value={aromaLevel}
                      onChange={(e) => setAromaLevel(e.target.value)}
                      className="w-full p-2 rounded-xl border border-gray-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Description:</label>
                  <textarea
                    rows={3}
                    placeholder="Historical lineage and palate notes..."
                    value={varietyDesc}
                    onChange={(e) => setVarietyDesc(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-[#113824] hover:bg-[#195235] text-white font-bold tracking-wider uppercase text-xs"
                  >
                    Save Heritage Cultivar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 5: EDIT VARIETY & PHOTO */}
        {editVarietyModal && editingVariety && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 my-8">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-serif font-bold text-base text-[#113824]">
                  Edit Variety & Photo — {editingVariety.name}
                </h3>
                <button onClick={() => setEditVarietyModal(false)}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSaveVariety} className="space-y-4 text-xs">
                {/* Image Live Preview & Input */}
                <div className="space-y-2">
                  <label className="font-bold text-gray-700 block">Variety Photo (Authentic Mango Photography):</label>
                  <div className="relative h-44 w-full rounded-2xl overflow-hidden border border-gray-200 bg-gray-50">
                    <img
                      src={varietyImgUrl || '/images/placeholder-mango.svg'}
                      alt="Variety preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/images/placeholder-mango.svg';
                      }}
                    />
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={varietyImgUrl}
                      onChange={(e) => setVarietyImgUrl(e.target.value)}
                      className="flex-1 p-2.5 rounded-xl border border-gray-300 font-mono text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={() => setVarietyImgUrl('/images/placeholder-mango.svg')}
                      className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold whitespace-nowrap"
                    >
                      Use SVG Placeholder
                    </button>
                  </div>
                  <span className="text-[10px] text-gray-400">
                    Saving this image will also sync to primary_image of catalog products under this variety.
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Origin City:</label>
                    <input
                      type="text"
                      value={varietyOrigin}
                      onChange={(e) => setVarietyOrigin(e.target.value)}
                      className="w-full p-2 rounded-xl border border-gray-300 font-medium"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Sweetness (°Brix):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={varietyBrix}
                      onChange={(e) => setVarietyBrix(e.target.value)}
                      className="w-full p-2 rounded-xl border border-gray-300 font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Aroma (1-10):</label>
                    <input
                      type="number"
                      value={varietyAroma}
                      onChange={(e) => setVarietyAroma(e.target.value)}
                      className="w-full p-2 rounded-xl border border-gray-300 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Flavor Notes / Terroir:</label>
                  <input
                    type="text"
                    value={varietyNotes}
                    onChange={(e) => setVarietyNotes(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Description:</label>
                  <textarea
                    rows={3}
                    value={varietyDescText}
                    onChange={(e) => setVarietyDescText(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300"
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditVarietyModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 font-bold text-xs uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={varietySaving}
                    className="px-5 py-2.5 rounded-xl bg-[#113824] hover:bg-[#195235] text-white font-bold text-xs uppercase tracking-wider disabled:opacity-40"
                  >
                    {varietySaving ? 'Saving Changes...' : 'Save Variety & Photo'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
