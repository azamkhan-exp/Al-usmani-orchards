import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { formatPKR } from '@/lib/formatters';

export interface ProductSearchResult {
  id: string;
  name: string;
  variety: string;
  package_size_id: string;
  package_name: string;
  weight_kg: number;
  base_price: number;
  sale_price: number | null;
  effective_price: number;
  available_stock: number;
  in_stock: boolean;
  image_url: string;
  sweetness_brix: number;
  aroma_level: number;
  flavor_notes: string;
}

/**
 * 1. searchProducts
 * Searches active mango products and package sizes by variety name, package size, and maximum price.
 * Uses the canonical schema: p.status = 'ACTIVE', ps.is_active = 1, v.is_active = 1
 */
export function searchProducts(params: {
  variety?: string;
  packageSize?: string;
  maxPrice?: number;
  inStockOnly?: boolean;
} = {}): ProductSearchResult[] {
  try {
    ensureDatabaseReady();
    const db = getDatabase();

    let query = `
      SELECT 
        p.id,
        p.name,
        v.name as variety,
        v.sweetness_brix,
        v.aroma_level,
        v.flavor_notes,
        ps.id as package_size_id,
        ps.name as package_name,
        ps.weight_kg,
        ps.base_price,
        ps.sale_price,
        COALESCE(ps.sale_price, ps.base_price) as effective_price,
        COALESCE(inv.available_stock, 0) as available_stock,
        COALESCE(pi.image_url, p.primary_image) as image_url
      FROM products p
      JOIN mango_varieties v ON v.id = p.variety_id
      JOIN package_sizes ps ON ps.product_id = p.id
      LEFT JOIN inventory inv ON inv.package_size_id = ps.id
      LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = 1
      WHERE p.status = 'ACTIVE' AND ps.is_active = 1 AND v.is_active = 1
    `;

    const sqlParams: any[] = [];

    if (params.variety && params.variety.trim()) {
      query += ` AND (LOWER(v.name) LIKE ? OR LOWER(p.name) LIKE ?)`;
      const vMatch = `%${params.variety.trim().toLowerCase()}%`;
      sqlParams.push(vMatch, vMatch);
    }

    if (params.packageSize && params.packageSize.trim()) {
      query += ` AND (LOWER(ps.name) LIKE ? OR ps.weight_kg = ?)`;
      const sMatch = `%${params.packageSize.trim().toLowerCase()}%`;
      const weightNum = parseFloat(params.packageSize.replace(/[^\d.]/g, '')) || 0;
      sqlParams.push(sMatch, weightNum);
    }

    if (params.maxPrice && params.maxPrice > 0) {
      query += ` AND COALESCE(ps.sale_price, ps.base_price) <= ?`;
      sqlParams.push(params.maxPrice);
    }

    if (params.inStockOnly) {
      query += ` AND COALESCE(inv.available_stock, 0) > 0`;
    }

    query += ` ORDER BY v.sweetness_brix DESC, ps.weight_kg ASC`;

    const rows = db.prepare(query).all(...sqlParams) as any[];

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      variety: r.variety,
      package_size_id: r.package_size_id,
      package_name: r.package_name,
      weight_kg: r.weight_kg,
      base_price: r.base_price,
      sale_price: r.sale_price,
      effective_price: r.effective_price,
      available_stock: r.available_stock,
      in_stock: r.available_stock > 0,
      image_url: r.image_url || '/images/products/chaunsa.jpg',
      sweetness_brix: r.sweetness_brix || 24,
      aroma_level: r.aroma_level || 9,
      flavor_notes: r.flavor_notes || 'Rich, sweet, and aromatic'
    }));
  } catch (err) {
    console.warn('[AI_TOOLS] searchProducts query error handled safely:', err);
    return [];
  }
}

/**
 * 2. checkProductAvailability
 * Returns live cold-storage inventory levels and harvest status for varieties.
 * Uses the canonical schema: v.is_active = 1, p.status = 'ACTIVE', ps.is_active = 1
 */
export function checkProductAvailability(variety?: string): {
  variety: string;
  inStock: boolean;
  totalAvailableBoxes: number;
  packageBreakdown: Array<{ packageName: string; weightKg: number; stock: number; price: number }>;
}[] {
  try {
    ensureDatabaseReady();
    const db = getDatabase();

    let query = `
      SELECT 
        v.name as variety,
        ps.name as package_name,
        ps.weight_kg,
        COALESCE(ps.sale_price, ps.base_price) as price,
        COALESCE(inv.available_stock, 0) as available_stock
      FROM mango_varieties v
      JOIN products p ON p.variety_id = v.id
      JOIN package_sizes ps ON ps.product_id = p.id
      LEFT JOIN inventory inv ON inv.package_size_id = ps.id
      WHERE v.is_active = 1 AND p.status = 'ACTIVE' AND ps.is_active = 1
    `;

    const sqlParams: any[] = [];
    if (variety && variety.trim()) {
      query += ` AND LOWER(v.name) LIKE ?`;
      sqlParams.push(`%${variety.trim().toLowerCase()}%`);
    }

    query += ` ORDER BY v.name ASC, ps.weight_kg ASC`;

    const rows = db.prepare(query).all(...sqlParams) as any[];
    const grouped: Record<string, any> = {};

    for (const row of rows) {
      if (!grouped[row.variety]) {
        grouped[row.variety] = {
          variety: row.variety,
          inStock: false,
          totalAvailableBoxes: 0,
          packageBreakdown: []
        };
      }
      grouped[row.variety].totalAvailableBoxes += row.available_stock;
      if (row.available_stock > 0) grouped[row.variety].inStock = true;
      grouped[row.variety].packageBreakdown.push({
        packageName: row.package_name,
        weightKg: row.weight_kg,
        stock: row.available_stock,
        price: row.price
      });
    }

    return Object.values(grouped);
  } catch (err) {
    console.warn('[AI_TOOLS] checkProductAvailability error handled safely:', err);
    return [];
  }
}

/**
 * 3. getCurrentPrice
 * Returns current pricing including sale discounts and packaging for varieties.
 */
export function getCurrentPrice(variety?: string, packageSize?: string) {
  try {
    const products = searchProducts({ variety, packageSize });
    return products.map((p) => ({
      variety: p.variety,
      package: `${p.package_name} (${p.weight_kg} KG)`,
      regularPrice: formatPKR(p.base_price),
      currentPrice: formatPKR(p.effective_price),
      onSale: p.sale_price !== null && p.sale_price < p.base_price,
      savings: p.sale_price !== null && p.sale_price < p.base_price ? formatPKR(p.base_price - p.sale_price) : null,
      inStock: p.in_stock
    }));
  } catch (err) {
    console.warn('[AI_TOOLS] getCurrentPrice error handled safely:', err);
    return [];
  }
}

/**
 * 4. getActiveOffers
 * Returns active seasonal discounts, promotional coupon codes, and volume tier savings.
 */
export function getActiveOffers(): {
  coupons: Array<{ name: string; code: string; discount: string; minOrder: string; expiry: string }>;
  volumeDiscounts: Array<{ tier: string; discount: string; note: string }>;
} {
  const volumeDiscounts = [
    { tier: '5 – 9 Export Crates', discount: '5% Automatic Crate Rebate', note: 'Family & Gifting Package' },
    { tier: '10 – 19 Export Crates', discount: '10% Automatic Crate Rebate', note: 'Corporate & Celebration' },
    { tier: '20+ Export Crates', discount: '15% Wholesale Estate Discount', note: 'Commercial & Royal Consignments' }
  ];

  try {
    ensureDatabaseReady();
    const db = getDatabase();

    const promos = db.prepare(`
      SELECT name, code, discount_type, discount_value, min_order_value, expires_at
      FROM promotions
      WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > datetime('now'))
    `).all() as any[];

    const coupons = promos.map((p) => ({
      name: p.name,
      code: p.code || 'Automatic',
      discount: p.discount_type === 'PERCENTAGE' ? `${p.discount_value}% OFF` : `PKR ${p.discount_value} OFF`,
      minOrder: formatPKR(p.min_order_value || 0),
      expiry: p.expires_at ? new Date(p.expires_at).toLocaleDateString() : 'Active Season 2026'
    }));

    return { coupons, volumeDiscounts };
  } catch (err) {
    console.warn('[AI_TOOLS] getActiveOffers query error handled safely:', err);
    return { coupons: [], volumeDiscounts };
  }
}

/**
 * 5. getStoreInformation
 * Returns farm heritage, terroir, harvesting ethos, certifications, and customer concierge channels.
 */
export function getStoreInformation() {
  return {
    estateName: 'Al Usmani Orchards (Private) Limited',
    origin: 'Shujabad Road, Multan, Punjab, Pakistan',
    tagline: 'Centuries of Pure Multani Mango Heritage',
    ethics: [
      '100% Tree-Ripened Guarantee — Picked at optimum maturity, never artificially forced.',
      'Zero Calcium Carbide or Toxic Ripening Chemicals.',
      'Signature Single-Layer Export Packaging with Individual Foam Nesting.',
      'Dawn-Picked & Dispatched in Temperature-Managed Logistics within 24 Hours.'
    ],
    customerConcierge: {
      phone: '+92 300 8472910',
      whatsapp: '+92 300 8472910',
      email: 'orders@alusmaniorchards.pk',
      hours: 'Mon – Sun: 8:00 AM – 10:00 PM PKT'
    }
  };
}

/**
 * 6. getDeliveryInformation
 * Returns cold-chain shipping policies, transit times, rates, and coverage cities.
 */
export function getDeliveryInformation(city?: string) {
  const majorCitiesPunjab = ['Lahore', 'Multan', 'Faisalabad', 'Rawalpindi', 'Islamabad', 'Sialkot', 'Gujranwala', 'Bahawalpur'];
  const majorCitiesSindhKPK = ['Karachi', 'Hyderabad', 'Sukkur', 'Peshawar', 'Quetta', 'Abbottabad'];

  const normalizedCity = city?.trim().toLowerCase();
  let specificEstimate = null;

  if (normalizedCity) {
    if (majorCitiesPunjab.some((c) => c.toLowerCase().includes(normalizedCity))) {
      specificEstimate = '24 to 36 hours from dawn harvest dispatch (Overnight Cold-Chain Express)';
    } else if (majorCitiesSindhKPK.some((c) => c.toLowerCase().includes(normalizedCity))) {
      specificEstimate = '36 to 48 hours from dawn harvest dispatch (Express Air/Ground Cold-Chain)';
    }
  }

  return {
    nationwideCoverage: 'All major urban centers and districts across Pakistan',
    carriers: ['TCS Express Cold-Chain', 'Leopards Courier Overland', 'M&P Logistics'],
    deliveryRates: {
      standardRate: 'PKR 350 flat freight per order',
      freeShippingThreshold: 'Free shipping on orders with 4 or more export crates'
    },
    timelines: {
      punjabAndCapital: '24 – 36 Hours',
      sindhAndKPK: '36 – 48 Hours',
      balochistan: '48 – 72 Hours'
    },
    citySpecificEstimate: specificEstimate,
    paymentMethods: [
      'Cash on Delivery (COD) available nationwide',
      'Direct Bank Transfer / Raast Instant Payment',
      'Credit / Debit Card (Mastercard, Visa)'
    ],
    transitCare: 'Cushioned ventilated cartons with thermal inner wrap to preserve branch freshness during transit.'
  };
}

/**
 * 7. getCustomerOrderStatus
 * Protected order tracking with strict IDOR verification.
 * Requires matching customer session ID OR verified matching guest phone/email.
 */
export function getCustomerOrderStatus(
  orderNumber: string,
  verificationInfo?: {
    phoneOrEmail?: string;
    customerId?: string;
  }
): {
  found: boolean;
  authorized: boolean;
  orderNumber?: string;
  status?: string;
  totalAmount?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  courierName?: string;
  trackingNumber?: string;
  city?: string;
  items?: Array<{ variety: string; package: string; quantity: number }>;
  timeline?: Array<{ title: string; description: string; time: string }>;
  error?: string;
} {
  try {
    ensureDatabaseReady();
    const db = getDatabase();

    const cleanOrderNum = orderNumber.trim().toUpperCase();

    const order = db.prepare(`
      SELECT o.*, c.name as courier_name
      FROM orders o
      LEFT JOIN couriers c ON c.id = o.courier_id
      WHERE UPPER(o.order_number) = ? OR o.id = ?
    `).get(cleanOrderNum, cleanOrderNum) as any;

    if (!order) {
      return {
        found: false,
        authorized: false,
        error: `Consignment reference "${cleanOrderNum}" was not found in our orchard fulfillment records.`
      };
    }

    // IDOR Authorization verification
    let isAuthorized = false;

    // 1. Session customer match
    if (verificationInfo?.customerId && order.customer_id && order.customer_id === verificationInfo.customerId) {
      isAuthorized = true;
    }

    // 2. Phone or Email verification match
    if (!isAuthorized && verificationInfo?.phoneOrEmail) {
      const rawInput = verificationInfo.phoneOrEmail.trim().toLowerCase();
      const inputDigits = rawInput.replace(/\D/g, '');

      const dbPhones = [
        order.customer_phone || '',
        order.guest_phone || ''
      ].map((p) => p.replace(/\D/g, ''));

      const dbEmails = [
        (order.guest_email || '').toLowerCase()
      ];

      const phoneMatch = inputDigits.length >= 7 && dbPhones.some((p) => p && (p.includes(inputDigits) || inputDigits.includes(p)));
      const emailMatch = rawInput.includes('@') && dbEmails.includes(rawInput);

      if (phoneMatch || emailMatch) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return {
        found: true,
        authorized: false,
        orderNumber: order.order_number,
        error: `For customer privacy and consignment protection, please provide the registered contact phone number or email address associated with Order ${order.order_number} to view live delivery status.`
      };
    }

    // Load items and timeline
    const items = db.prepare(`
      SELECT oi.quantity, oi.unit_price, oi.subtotal, ps.name as package_name, v.name as variety_name
      FROM order_items oi
      JOIN package_sizes ps ON ps.id = oi.package_size_id
      JOIN products p ON p.id = oi.product_id
      JOIN mango_varieties v ON v.id = p.variety_id
      WHERE oi.order_id = ?
    `).all(order.id) as any[];

    const timeline = db.prepare(`
      SELECT title, description, created_at
      FROM order_timeline
      WHERE order_id = ?
      ORDER BY created_at DESC
    `).all(order.id) as any[];

    return {
      found: true,
      authorized: true,
      orderNumber: order.order_number,
      status: order.status.replace(/_/g, ' '),
      totalAmount: formatPKR(order.total_amount),
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      courierName: order.courier_name || 'Al Usmani Express',
      trackingNumber: order.tracking_number || 'Allocation in progress',
      city: order.city,
      items: items.map((it) => ({
        variety: it.variety_name,
        package: it.package_name,
        quantity: it.quantity
      })),
      timeline: timeline.map((t) => ({
        title: t.title,
        description: t.description,
        time: t.created_at
      }))
    };
  } catch (err) {
    console.warn('[AI_TOOLS] getCustomerOrderStatus error handled safely:', err);
    return {
      found: false,
      authorized: false,
      error: 'Unable to retrieve order details at this moment. Please check your order confirmation SMS or contact our WhatsApp concierge.'
    };
  }
}
