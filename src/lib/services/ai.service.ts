import { getDatabase } from '../db';
import { getFinancialOverview } from './finance.service';
import { formatPKR } from '../formatters';

export interface AssistantResponse {
  answer: string;
  suggestedFollowUps?: string[];
  dataPoints?: Record<string, any>;
}

// 1. Customer AI Assistant ("OrchardBot")
export async function askCustomerAssistant(query: string): Promise<AssistantResponse> {
  const db = getDatabase();
  const q = query.toLowerCase().trim();

  // Match: Sweetness / Brix comparison
  if (q.includes('sweet') || q.includes('brix') || q.includes('sugar') || q.includes('flavor')) {
    const varieties = await db.prepare(`
      SELECT name, sweetness_brix, aroma_level, flavor_notes, origin_city
      FROM mango_varieties
      WHERE is_active = 1
      ORDER BY sweetness_brix DESC
    `).all() as any[];

    const sweetest = varieties[0];
    const summary = varieties
      .map((v) => `• **${v.name}** (${v.origin_city}): Brix ${v.sweetness_brix}°, Aroma ${v.aroma_level}/10 — ${v.flavor_notes}`)
      .join('\n');

    return {
      answer: `The sweetest mango in our orchards is **${sweetest.name}** with an exceptional sugar sweetness rating of **${sweetest.sweetness_brix}° Brix**, known for its rich, honey-nectar fragrance.\n\nHere is how our royal varieties compare:\n${summary}\n\nAll our mangoes are 100% naturally tree-ripened with zero calcium carbide chemicals.`,
      suggestedFollowUps: ['What is available in 10 KG?', 'Can I pre-order Chaunsa?', 'Which offer is active?']
    };
  }

  // Match: Package sizes / 10 KG availability
  if (q.includes('10 kg') || q.includes('5 kg') || q.includes('8 kg') || q.includes('package') || q.includes('size')) {
    const packages = await db.prepare(`
      SELECT 
        v.name as variety, ps.name as package_name, ps.weight_kg, 
        COALESCE(ps.sale_price, ps.base_price) as price,
        inv.available_stock
      FROM package_sizes ps
      JOIN products p ON p.id = ps.product_id
      JOIN mango_varieties v ON v.id = p.variety_id
      JOIN inventory inv ON inv.package_size_id = ps.id
      WHERE ps.is_active = 1
      ORDER BY ps.weight_kg ASC
    `).all() as any[];

    const list = packages
      .map((p) => `• **${p.variety} ${p.package_name}** (${p.weight_kg} KG) — **${formatPKR(p.price)}** (${p.available_stock} crates ready in orchard cold-store)`)
      .join('\n');

    return {
      answer: `Here are our currently available harvest packages and live stock levels directly from our orchard cold storage:\n\n${list}\n\nEach crate is packed in our custom-ventilated, cushioned luxury export cartons to prevent bruising in transit.`,
      suggestedFollowUps: ['Which mango is sweetest?', 'Which offer is active?', 'Do you deliver to Karachi?']
    };
  }

  // Match: Pre-order questions
  if (q.includes('preorder') || q.includes('pre-order') || q.includes('upcoming') || q.includes('reserve')) {
    const campaigns = await db.prepare(`
      SELECT c.*, p.name as product_name, ps.name as package_name
      FROM preorder_campaigns c
      JOIN products p ON p.id = c.product_id
      JOIN package_sizes ps ON ps.id = c.package_size_id
      WHERE c.status = 'ACTIVE'
    `).all() as any[];

    if (campaigns.length === 0) {
      return {
        answer: 'All current harvest varieties are ready for immediate dispatch. Stay tuned for late-season White Chaunsa pre-orders opening next week!',
        suggestedFollowUps: ['What is currently in stock?', 'Which mango is sweetest?']
      };
    }

    const list = campaigns.map((c) => 
      `• **${c.title}** (${c.package_name})\n  - Early Bird Price: **${formatPKR(c.preorder_price)}** (Regular: ${formatPKR(c.regular_price)})\n  - Reserved: **${c.reserved_count} / ${c.total_capacity} boxes**\n  - Expected Dispatch: **${c.expected_dispatch_date}**`
    ).join('\n\n');

    return {
      answer: `Yes! We currently have active pre-order campaigns for upcoming flushes:\n\n${list}\n\nPre-orders receive priority early-morning picking and complimentary gold-seal export packaging.`,
      suggestedFollowUps: ['How do I pre-order?', 'Which offer is active?']
    };
  }

  // Match: Order Tracking (e.g. MF-2026-XXXX)
  const orderMatch = q.match(/mf-\d{4}-\d+/i);
  if (orderMatch || q.includes('track') || q.includes('where is my order')) {
    const orderNum = orderMatch ? orderMatch[0].toUpperCase() : null;
    if (orderNum) {
      const order = await db.prepare(`
        SELECT o.*, c.name as courier_name
        FROM orders o
        LEFT JOIN couriers c ON c.id = o.courier_id
        WHERE UPPER(o.order_number) = ?
      `).get(orderNum) as any;

      if (!order) {
        return {
          answer: `I could not find an order with reference **${orderNum}**. Please check your order confirmation SMS/email or contact our WhatsApp concierge.`,
          suggestedFollowUps: ['Do you deliver to Lahore?', 'Which offer is active?']
        };
      }

      const timeline = await db.prepare(`
        SELECT title, description, created_at
        FROM order_timeline
        WHERE order_id = ?
        ORDER BY created_at DESC
      `).all(order.id) as any[];

      const timelineStr = timeline.map((t) => `• **${t.title}** (${t.created_at}): ${t.description}`).join('\n');

      return {
        answer: `**Order Status for ${order.order_number}:**\n• Status: **${order.status.replace(/_/g, ' ')}**\n• Total: **${formatPKR(order.total_amount)}** (${order.payment_method})\n• Courier: **${order.courier_name || 'Assigned during dispatch'}** (Tracking # ${order.tracking_number || 'Pending'})\n\n**Timeline:**\n${timelineStr}`,
        dataPoints: { orderNumber: order.order_number, status: order.status }
      };
    } else {
      return {
        answer: 'To track your harvest shipment, please share your order number (for example, **MF-2026-1029**), or visit our live Track Order page in the header navigation.',
        suggestedFollowUps: ['Track order MF-2026-0001', 'Do you deliver to Islamabad?']
      };
    }
  }

  // Match: Shipping destinations (Lahore, Karachi, Islamabad, etc.)
  if (q.includes('deliver') || q.includes('ship') || q.includes('city') || q.includes('cities') || q.includes('lahore') || q.includes('karachi') || q.includes('islamabad')) {
    return {
      answer: `Yes, we deliver nationwide across **all major cities in Pakistan** (including Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad, Peshawar, Multan, Sialkot, and Gujranwala).\n\n• **Cold-Chain Transit**: Picked at dawn, packed in thermal protective crates, and dispatched within 24 hours.\n• **Delivery Time**: 24–36 hours for Punjab; 48 hours for Sindh & KPK.\n• **Cash on Delivery (COD)** and Bank Transfer are available across all regions.`,
      suggestedFollowUps: ['What are the shipping rates?', 'What is available in 10 KG?']
    };
  }

  // Match: Offers and Promotions
  if (q.includes('offer') || q.includes('discount') || q.includes('coupon') || q.includes('promo')) {
    const promos = await db.prepare(`
      SELECT name, code, discount_type, discount_value, min_order_value, expires_at
      FROM promotions
      WHERE is_active = 1
    `).all() as any[];

    const promoList = promos.map((p) => {
      const typeStr = p.discount_type === 'PERCENTAGE' ? `${p.discount_value}% OFF` : `PKR ${p.discount_value} OFF`;
      return `• **${p.name}**\n  - Code: \`${p.code || 'Automatic'}\`\n  - Benefit: **${typeStr}** (Min order: ${formatPKR(p.min_order_value)})`;
    }).join('\n\n');

    return {
      answer: `🥭 **Current Season Offers & Discounts:**\n\n${promoList}\n\n✨ **Tiered Volume Savings**: We also automatically apply:\n• 5–9 boxes: **5% OFF**\n• 10–19 boxes: **10% OFF**\n• 20+ boxes: **15% OFF** (Wholesale crate pricing)`,
      suggestedFollowUps: ['What is available in 10 KG?', 'Which mango is sweetest?']
    };
  }

  // Default helpful response
  return {
    answer: `Welcome to **Al Usmani Orchards**! I am your Orchard Concierge. I can assist you with:\n• **Varieties & Taste**: Sweetness (Brix), aroma, and flavor profiles of Chaunsa, Sindhri, Anwar Ratol, and Dussehri.\n• **Available Stock**: Current crates in 5 KG, 8 KG, and 10 KG.\n• **Live Order Tracking**: Check real-time dispatch and courier updates by providing your order number.\n• **Pre-orders & Promotions**: Exclusive harvest flush discounts and coupon codes.\n\nWhat would you like to explore today?`,
    suggestedFollowUps: ['Which mango is sweetest?', 'What is available in 10 KG?', 'Which offer is active?']
  };
}

// 2. Admin Executive AI Assistant ("OrchardIQ")
export async function askAdminAssistant(query: string): Promise<AssistantResponse> {
  const db = getDatabase();
  const q = query.toLowerCase().trim();
  const fin = await getFinancialOverview();

  // Query: Revenue, Profit, Financials
  if (q.includes('profit') || q.includes('revenue') || q.includes('finance') || q.includes('money') || q.includes('sales')) {
    return {
      answer: `📊 **Live Financial Performance (Season 2026):**\n\n• **Gross Revenue**: ${formatPKR(fin.grossSales)}\n• **Total Discounts**: ${formatPKR(fin.totalDiscounts)}\n• **Net Sales**: ${formatPKR(fin.netSales)}\n• **Operating Expenses**: ${formatPKR(fin.totalExpenses)}\n• **Total Refunds**: ${formatPKR(fin.totalRefunds)}\n• **Gross Profit**: ${formatPKR(fin.grossProfit)}\n• **Net Profit**: **${formatPKR(fin.netProfit)}**\n• **Net Profit Margin**: **${fin.profitMarginPercent}%**\n• **Pending COD Receivables**: ${formatPKR(fin.pendingCodRevenue)}`,
      dataPoints: { netProfit: fin.netProfit, margin: fin.profitMarginPercent, grossSales: fin.grossSales },
      suggestedFollowUps: ['Which mango sold the most?', 'How much did we spend on marketing?', 'Which city ordered the most?']
    };
  }

  // Query: Top selling mango variety
  if (q.includes('most') || q.includes('top') || q.includes('best') || q.includes('popular')) {
    const topVarieties = await db.prepare(`
      SELECT 
        v.name as variety, 
        SUM(oi.quantity) as boxes_sold, 
        SUM(oi.subtotal) as total_revenue
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      JOIN mango_varieties v ON v.id = p.variety_id
      JOIN orders o ON o.id = oi.order_id
      WHERE o.status NOT IN ('CANCELLED', 'FAILED')
      GROUP BY v.id, v.name
      ORDER BY total_revenue DESC
    `).all() as any[];

    const list = topVarieties
      .map((v, i) => `${i + 1}. **${v.variety}**: ${v.boxes_sold} boxes sold (Revenue: **${formatPKR(v.total_revenue)}**)`)
      .join('\n');

    return {
      answer: `🏆 **Best-Selling Mango Varieties:**\n\n${list || 'No completed sales yet.'}`,
      dataPoints: topVarieties,
      suggestedFollowUps: ['How much profit did we make?', 'Which package size is most popular?']
    };
  }

  // Query: City analytics
  if (q.includes('city') || q.includes('geographic') || q.includes('location')) {
    const cities = await db.prepare(`
      SELECT 
        COALESCE(c.city, 'Unspecified') as city_name,
        COUNT(o.id) as order_count,
        SUM(o.total_amount) as total_spent
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      WHERE o.status NOT IN ('CANCELLED', 'FAILED')
      GROUP BY city_name
      ORDER BY total_spent DESC
      LIMIT 5
    `).all() as any[];

    const list = cities.map((c, i) => `${i + 1}. **${c.city_name}**: ${c.order_count} orders (${formatPKR(c.total_spent)})`).join('\n');

    return {
      answer: `📍 **Top Ordering Cities by Revenue:**\n\n${list}`,
      dataPoints: cities,
      suggestedFollowUps: ['How much COD is pending?', 'How much profit did we make?']
    };
  }

  // Query: Pending COD
  if (q.includes('cod') || q.includes('receivable') || q.includes('pending payment')) {
    const codOrders = await db.prepare(`
      SELECT COUNT(id) as pending_count, COALESCE(SUM(total_amount), 0) as pending_total
      FROM orders
      WHERE payment_method = 'COD' AND payment_status = 'PENDING' AND status NOT IN ('CANCELLED', 'FAILED')
    `).get() as any;

    return {
      answer: `🚚 **Pending COD Position:**\n\n• Outstanding COD Orders: **${codOrders.pending_count}**\n• Total Pending Remittance: **${formatPKR(codOrders.pending_total)}**\n\nCourier reconciliation is tracking these with TCS and Leopards dispatch manifests.`,
      dataPoints: codOrders,
      suggestedFollowUps: ['How much profit did we make?', 'Which product is low in stock?']
    };
  }

  // Query: Low stock / Inventory risk
  if (q.includes('stock') || q.includes('inventory') || q.includes('low')) {
    const lowStock = await db.prepare(`
      SELECT 
        v.name as variety, ps.name as package_name, 
        inv.available_stock, inv.low_stock_threshold
      FROM inventory inv
      JOIN package_sizes ps ON ps.id = inv.package_size_id
      JOIN products p ON p.id = ps.product_id
      JOIN mango_varieties v ON v.id = p.variety_id
      WHERE inv.available_stock <= inv.low_stock_threshold
      ORDER BY inv.available_stock ASC
    `).all() as any[];

    if (lowStock.length === 0) {
      return {
        answer: '✅ **Inventory Status**: All package sizes are healthy and above their low-stock safety thresholds.',
        suggestedFollowUps: ['How much profit did we make?', 'Which mango sold the most?']
      };
    }

    const list = lowStock
      .map((item) => `⚠️ **${item.variety} - ${item.package_name}**: Only **${item.available_stock} boxes** remaining (Threshold: ${item.low_stock_threshold})`)
      .join('\n');

    return {
      answer: `🚨 **Low Stock Alerts:**\n\n${list}\n\nRecommended Action: Schedule a new harvest batch from Farm Orchard Blocks or adjust online capacity.`,
      dataPoints: lowStock,
      suggestedFollowUps: ['Which mango sold the most?', 'How much profit did we make?']
    };
  }

  // Query: Expenses & Marketing
  if (q.includes('expense') || q.includes('marketing') || q.includes('spend')) {
    const expenses = fin.expensesByCategory
      .map((e) => `• **${e.category}**: ${formatPKR(e.amount)} (${e.percentage}%)`)
      .join('\n');

    return {
      answer: `💸 **Operational Expenses Breakdown:**\n\n${expenses}\n\n• **Total Expenses**: **${formatPKR(fin.totalExpenses)}**`,
      suggestedFollowUps: ['How much profit did we make?', 'How much COD is pending?']
    };
  }

  // Default admin response
  return {
    answer: `I am **OrchardIQ**, your executive analytics assistant. I can synthesize real-time data from our database:\n• **Financials**: P&L, revenue, margins, cash flow, expenses.\n• **Sales Intelligence**: Top mango varieties, package size preference, city rankings.\n• **Logistics & COD**: Pending receivables, courier transit performance.\n• **Inventory Health**: Real-time batch levels, low-stock alerts, and harvest yield.\n\nWhat would you like to analyze?`,
    suggestedFollowUps: [
      'How much profit did we make?',
      'Which mango sold the most?',
      'How much COD is pending?',
      'Which product is low in stock?'
    ]
  };
}
