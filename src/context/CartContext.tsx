'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  packageSizeId: string;
  productId: string;
  productName: string;
  varietyName: string;
  packageName: string;
  weightKg: number;
  unitPrice: number;
  quantity: number;
  image: string;
}

export interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeItem: (packageSizeId: string) => void;
  updateQuantity: (packageSizeId: string, quantity: number) => void;
  clearCart: () => void;
  totalBoxes: number;
  totalWeightKg: number;
  subtotal: number;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  appliedCoupon: string | null;
  setAppliedCoupon: (code: string | null) => void;
  isGift: boolean;
  setIsGift: (isGift: boolean) => void;
  giftRecipient: string;
  setGiftRecipient: (name: string) => void;
  giftMessage: string;
  setGiftMessage: (msg: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [isGift, setIsGift] = useState(false);
  const [giftRecipient, setGiftRecipient] = useState('');
  const [giftMessage, setGiftMessage] = useState('');

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('auo_cart') || localStorage.getItem('shahi_cart');
      if (saved) {
        setItems(JSON.parse(saved));
      }
      const savedCoupon = localStorage.getItem('auo_coupon') || localStorage.getItem('shahi_coupon');
      if (savedCoupon) setAppliedCoupon(savedCoupon);
    } catch (e) {
      console.error('Failed to load cart from storage', e);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('auo_cart', JSON.stringify(items));
      if (appliedCoupon) {
        localStorage.setItem('auo_coupon', appliedCoupon);
      } else {
        localStorage.removeItem('auo_coupon');
        localStorage.removeItem('shahi_coupon');
      }
    } catch (e) {
      console.error('Failed to save cart to storage', e);
    }
  }, [items, appliedCoupon]);

  const addItem = (itemData: Omit<CartItem, 'quantity'>, qty = 1) => {
    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.packageSizeId === itemData.packageSizeId);
      if (existingIdx > -1) {
        const next = [...prev];
        next[existingIdx].quantity += qty;
        return next;
      }
      return [...prev, { ...itemData, quantity: qty }];
    });
    setIsCartOpen(true);
  };

  const removeItem = (packageSizeId: string) => {
    setItems((prev) => prev.filter((i) => i.packageSizeId !== packageSizeId));
  };

  const updateQuantity = (packageSizeId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(packageSizeId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.packageSizeId === packageSizeId ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
    setIsGift(false);
    setGiftRecipient('');
    setGiftMessage('');
  };

  const totalBoxes = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalWeightKg = items.reduce((sum, item) => sum + item.weightKg * item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalBoxes,
        totalWeightKg,
        subtotal,
        isCartOpen,
        openCart: () => setIsCartOpen(true),
        closeCart: () => setIsCartOpen(false),
        appliedCoupon,
        setAppliedCoupon,
        isGift,
        setIsGift,
        giftRecipient,
        setGiftRecipient,
        giftMessage,
        setGiftMessage
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
