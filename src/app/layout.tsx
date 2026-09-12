import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/context/CartContext';
import { AuthProvider } from '@/context/AuthContext';
import { FeaturesProvider } from '@/context/FeaturesContext';

export const metadata: Metadata = {
  title: 'Al Usmani Orchards (باغات آل عثمانی) | Fresh from Our Orchards • Premium Pakistani Mangoes',
  description:
    'From Our Orchards to Your Door. Fresh from Our Orchards • Premium Pakistani Mangoes • Naturally Grown • Delivered with Care. Hand-picked Multani Chaunsa, Sindhri, Anwar Ratol, and Dussehri with 24h nationwide cold-chain delivery.',
  keywords: [
    'Al Usmani Orchards',
    'Buy Chaunsa Mango Online',
    'Premium Pakistani Mangoes',
    'Farm Fresh Mangoes Pakistan',
    'Naturally Grown Mangoes',
    'Multan Mango Delivery',
    'Sindhri Mango Mirpur Khas',
    'Anwar Ratol',
    'Dussehri Mango'
  ],
  openGraph: {
    title: 'Al Usmani Orchards | Premium Pakistani Mangoes',
    description: 'From Our Orchards to Your Door. Fresh from Our Orchards • Premium Pakistani Mangoes • Naturally Grown • Delivered with Care.',
    url: 'https://alusmaniorchards.pk',
    siteName: 'Al Usmani Orchards',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=1200&q=80',
        width: 1200,
        height: 630
      }
    ],
    locale: 'en_US',
    type: 'website'
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#FDFBF7] text-[#111827]">
        <AuthProvider>
          <FeaturesProvider>
            <CartProvider>
              {children}
            </CartProvider>
          </FeaturesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
