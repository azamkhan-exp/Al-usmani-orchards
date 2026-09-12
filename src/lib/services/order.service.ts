import { getDatabase, runTransaction } from '../db';
import { reserveInventory, releaseReservedInventory, commitOrderInventory } from './inventory.service';
import { evaluateOrderDiscounts, CartItemToEvaluate } from './discount.service';
import { calculateShippingFee } from './courier.service';
import { sendOrderConfirmationEmail, sendAdminAlertEmail } from '../email';
import { sendAdminNewOrderWhatsAppAlert, sendCustomerOrderWhatsAppConfirmation } from './whatsapp.service';
import { determineAvailablePaymentMethods, recordPaymentTransaction } from './payment.service';
import crypto from 'node:crypto';

export interface CheckoutRequest {
  items: Array<{
    packageSizeId: string;
    quantity: number;
  }>;
  customer?: {
    name: string;
    email: string;
    phone: string;
    city: string;
    address: string;
  };
  couponCode?: string;
  paymentMethod: string;
  paymentReference?: string;
  isGift?: boolean;
  giftRecipient?: string;
  giftMessage?: string;
  customerNotes?: string;
  userId?: string;
}

export function generateOrderNumber(database?: any): string {
  try {
    const db = database || getDatabase();
    const row = db.prepare(`SELECT value_json FROM store_settings WHERE key = 'orders'`).get() as any;
    if (row && row.value_json) {
      const parsed = JSON.parse(row.value_json);
      const prefix = parsed.order_prefix || 'AUO-';
      const currentNum = Number(parsed.next_order_number) || 10245;
      const orderNumber = `${prefix}${currentNum}`;

      parsed.next_order_number = currentNum + 1;
      db.prepare(`UPDATE store_settings SET value_json = ?, updated_at = datetime('now') WHERE key = 'orders'`)
        .run(JSON.stringify(parsed));

      return orderNumber;
    }
  } catch (e) {
    console.error('Error generating sequential order number:', e);
  }
  const fallbackNum = Math.floor(10000 + Math.random() * 90000);
  return `AUO-${fallbackNum}`;
}

export function createOrder(request: CheckoutRequest): {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  totalAmount?: number;
  error?: string;
} {
  const orderResult = runTransaction((db) => {
    if (!request.items || request.items.length === 0) {
      return { success: false, error: 'Cart cannot be empty.' };
    }

    // 1. Fetch package size details and calculate item pricing
    const evaluatedItems: CartItemToEvaluate[] = [];
    const itemDetails: Array<{
      packageSizeId: string;
      productId: string;
      varietyId: string;
      varietyName: string;
      packageName: string;
      weightKg: number;
      unitPrice: number;
      quantity: number;
      subtotal: number;
    }> = [];

    let totalWeightKg = 0;

    for (const item of request.items) {
      const pkg = db.prepare(`
        SELECT 
          ps.id as package_id, ps.name as package_name, ps.weight_kg, 
          COALESCE(ps.sale_price, ps.base_price) as effective_price,
          p.id as product_id, p.name as product_name,
          v.id as variety_id, v.name as variety_name
        FROM package_sizes ps
        JOIN products p ON p.id = ps.product_id
        JOIN mango_varieties v ON v.id = p.variety_id
        WHERE ps.id = ? AND ps.is_active = 1
      `).get(item.packageSizeId) as any;

      if (!pkg) {
        return { success: false, error: `Invalid or inactive package size: ${item.packageSizeId}` };
      }

      const unitPrice = pkg.effective_price;
      const subtotal = unitPrice * item.quantity;
      totalWeightKg += pkg.weight_kg * item.quantity;

      evaluatedItems.push({
        packageSizeId: pkg.package_id,
        productId: pkg.product_id,
        varietyId: pkg.variety_id,
        quantity: item.quantity,
        unitPrice
      });

      itemDetails.push({
        packageSizeId: pkg.package_id,
        productId: pkg.product_id,
        varietyId: pkg.variety_id,
        varietyName: pkg.variety_name,
        packageName: pkg.package_name,
        weightKg: pkg.weight_kg,
        unitPrice,
        quantity: item.quantity,
        subtotal
      });
    }

    // 2. Evaluate Discounts & Promo Engine
    const discountResult = evaluateOrderDiscounts(
      evaluatedItems,
      request.couponCode,
      request.customer?.email
    );

    if (request.couponCode && discountResult.errors.length > 0) {
      return { success: false, error: discountResult.errors.join(' ') };
    }

    // 3. Shipping fee based on destination city, weight, and subtotal threshold
    const destinationCity = request.customer?.city || 'Lahore';
    const netSubtotal = Math.max(0, discountResult.subtotal - discountResult.totalDiscount);
    const shippingFee = calculateShippingFee(totalWeightKg, destinationCity, netSubtotal);

    // 4. Calculate final total
    const subtotal = discountResult.subtotal;
    const discountAmount = discountResult.totalDiscount;
    const taxAmount = 0; // Tax included or exempt on fresh agricultural harvest
    const totalAmount = Math.max(0, netSubtotal + shippingFee + taxAmount);

    // 4b. Authoritative Payment Method Availability Validation
    const productIds = Array.from(new Set(itemDetails.map((i) => i.productId)));
    const allowedPaymentMethods = determineAvailablePaymentMethods(productIds);
    let requestedMethod = (request.paymentMethod || 'COD').toUpperCase();
    if (requestedMethod === 'BANK_TRANSFER') requestedMethod = 'EASYPAISA';
    if (requestedMethod === 'ONLINE_CARD') requestedMethod = 'CARD';

    const isAllowed = allowedPaymentMethods.some((m) => m.code.toUpperCase() === requestedMethod);
    if (!isAllowed) {
      return {
        success: false,
        error: `The payment method "${request.paymentMethod}" is currently unavailable for one or more items in your cart. Please select an available payment method.`
      };
    }

    // 5. Reserve Inventory
    const orderId = crypto.randomUUID();
    const orderNumber = generateOrderNumber(db);

    const reservation = reserveInventory(
      request.items.map((i) => ({ packageSizeId: i.packageSizeId, quantity: i.quantity })),
      orderNumber,
      request.userId
    );

    if (!reservation.success) {
      return { success: false, error: reservation.error };
    }

    // 6. Resolve Customer Profile
    let customerId: string | null = null;
    const customerEmail = request.customer?.email?.trim().toLowerCase() || null;
    const customerName = request.customer?.name?.trim() || 'Valued Patron';
    const customerPhone = request.customer?.phone?.trim() || null;
    const customerCity = request.customer?.city?.trim() || null;

    if (request.userId) {
      // Authenticated checkout: Primary anchor is user_id
      const cust = db.prepare('SELECT id, user_id, email FROM customers WHERE user_id = ?').get(request.userId) as any;

      if (cust) {
        customerId = cust.id;
        db.prepare(`
          UPDATE customers 
          SET phone = COALESCE(phone, ?), city = COALESCE(city, ?)
          WHERE id = ?
        `).run(customerPhone, customerCity, cust.id);
      } else {
        // Check if an unlinked guest record exists with this email
        if (customerEmail) {
          const guestCust = db.prepare('SELECT id, user_id FROM customers WHERE LOWER(email) = ?').get(customerEmail) as any;
          if (guestCust && !guestCust.user_id) {
            customerId = guestCust.id;
            db.prepare('UPDATE customers SET user_id = ?, phone = COALESCE(phone, ?), city = COALESCE(city, ?) WHERE id = ?')
              .run(request.userId, customerPhone, customerCity, guestCust.id);
          }
        }

        // If still no customer record linked, insert new one
        if (!customerId) {
          customerId = crypto.randomUUID();
          const referralCode = `AUO-${Math.floor(1000 + Math.random() * 9000)}`;
          const userAccount = db.prepare('SELECT email, name FROM users WHERE id = ?').get(request.userId) as any;
          const emailToUse = (customerEmail && !db.prepare('SELECT id FROM customers WHERE LOWER(email) = ?').get(customerEmail))
            ? customerEmail
            : (userAccount?.email?.toLowerCase() || `${request.userId}@alusmaniorchards.pk`);

          db.prepare(`
            INSERT INTO customers (id, user_id, full_name, email, phone, city, segment, total_spent, orders_count, referral_code, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'NEW', 0, 0, ?, datetime('now'))
          `).run(
            customerId,
            request.userId,
            customerName || userAccount?.name || 'Valued Patron',
            emailToUse,
            customerPhone,
            customerCity,
            referralCode
          );
        }
      }
    } else if (customerEmail) {
      // Guest checkout: Lookup by email
      const cust = db.prepare('SELECT id FROM customers WHERE LOWER(email) = ?').get(customerEmail) as any;

      if (cust) {
        customerId = cust.id;
      } else {
        customerId = crypto.randomUUID();
        const referralCode = `AUO-${Math.floor(1000 + Math.random() * 9000)}`;
        db.prepare(`
          INSERT INTO customers (id, user_id, full_name, email, phone, city, segment, total_spent, orders_count, referral_code, created_at)
          VALUES (?, NULL, ?, ?, ?, ?, 'NEW', 0, 0, ?, datetime('now'))
        `).run(
          customerId,
          customerName,
          customerEmail,
          customerPhone,
          customerCity,
          referralCode
        );
      }
    }

    // 7. Insert Order Record - Immediately CONFIRMED upon checkout
    const initialStatus = 'CONFIRMED';
    let initialPaymentStatus = 'PENDING';
    if (requestedMethod === 'EASYPAISA' || requestedMethod === 'JAZZCASH') {
      initialPaymentStatus = 'AWAITING_VERIFICATION';
    } else if (requestedMethod === 'CARD') {
      initialPaymentStatus = 'PENDING';
    } else {
      initialPaymentStatus = 'PENDING';
    }

    db.prepare(`
      INSERT INTO orders (
        id, order_number, customer_id, guest_email, guest_name, guest_phone,
        status, subtotal, discount_amount, shipping_fee, tax_amount, total_amount,
        payment_method, payment_status, coupon_code, shipping_address_json,
        is_gift, gift_recipient, gift_message, customer_notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      orderId,
      orderNumber,
      customerId,
      request.customer?.email || null,
      request.customer?.name || null,
      request.customer?.phone || null,
      initialStatus,
      subtotal,
      discountAmount,
      shippingFee,
      taxAmount,
      totalAmount,
      requestedMethod,
      initialPaymentStatus,
      request.couponCode || null,
      JSON.stringify({
        name: request.customer?.name,
        phone: request.customer?.phone,
        address: request.customer?.address,
        province: (request.customer as any)?.province || 'Punjab',
        district: (request.customer as any)?.district || request.customer?.city,
        city: request.customer?.city,
        area: (request.customer as any)?.area || null
      }),
      request.isGift ? 1 : 0,
      request.giftRecipient || null,
      request.giftMessage || null,
      request.customerNotes || null
    );

    // 8. Insert Order Items
    for (const item of itemDetails) {
      db.prepare(`
        INSERT INTO order_items (
          id, order_id, product_id, package_size_id, variety_name,
          package_name, unit_weight_kg, unit_price, quantity, subtotal
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        orderId,
        item.productId,
        item.packageSizeId,
        item.varietyName,
        item.packageName,
        item.weightKg,
        item.unitPrice,
        item.quantity,
        item.subtotal
      );
    }

    // 8b. Record Authoritative Payment Transaction Ledger Entry
    recordPaymentTransaction(orderId, requestedMethod, totalAmount, {
      transaction_reference: request.paymentReference,
      status: initialPaymentStatus as any
    });

    // 9. Order Timeline Entry
    db.prepare(`
      INSERT INTO order_timeline (id, order_id, status, title, description, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(
      crypto.randomUUID(),
      orderId,
      'CONFIRMED',
      'Order Confirmed',
      'Harvest allocation confirmed — Hand-picked allocation queued in orchard schedule.'
    );

    // 10. If Coupon used, increment usage count
    if (request.couponCode) {
      db.prepare(`
        UPDATE promotions 
        SET times_used = times_used + 1
        WHERE UPPER(code) = ?
      `).run(request.couponCode.trim().toUpperCase());
    }

    // 11. If COD, create Accounts Receivable entry
    if (requestedMethod === 'COD') {
      db.prepare(`
        INSERT INTO accounts_receivable (
          id, order_id, debtor_type, debtor_name, amount_due, amount_collected,
          status, due_date
        ) VALUES (?, ?, 'COURIER_COD', ?, ?, 0, 'PENDING', date('now', '+5 days'))
      `).run(
        crypto.randomUUID(),
        orderId,
        `COD Collection for ${orderNumber} (${request.customer?.city || 'Pakistan'})`,
        totalAmount
      );
    }

    // 12. If customer exists, update total spent and orders count
    if (customerId) {
      db.prepare(`
        UPDATE customers
        SET total_spent = total_spent + ?, orders_count = orders_count + 1
        WHERE id = ?
      `).run(totalAmount, customerId);
    }

    return {
      success: true,
      orderId,
      orderNumber,
      totalAmount
    };
  });

  // Trigger non-blocking asynchronous email & WhatsApp notifications
  if (orderResult.success && orderResult.orderId) {
    // 1. Customer notifications
    sendOrderConfirmationEmail(orderResult.orderId).catch((err) =>
      console.error('Non-blocking order confirmation email error:', err)
    );
    sendCustomerOrderWhatsAppConfirmation(orderResult.orderId).catch((err) =>
      console.error('Non-blocking customer WhatsApp confirmation error:', err)
    );

    // 2. Admin alerts (Email + WhatsApp)
    sendAdminAlertEmail(orderResult.orderId).catch((err) =>
      console.error('Non-blocking admin alert email error:', err)
    );
    sendAdminNewOrderWhatsAppAlert(orderResult.orderId).catch((err) =>
      console.error('Non-blocking admin WhatsApp alert error:', err)
    );
  }

  return orderResult;
}

export function updateOrderStatus(
  orderId: string,
  newStatus: string,
  notes?: string,
  userId?: string
): void {
  runTransaction((db) => {
    const order = db.prepare('SELECT id, order_number, status, payment_status FROM orders WHERE id = ?').get(orderId) as any;
    if (!order) throw new Error(`Order ${orderId} not found`);

    db.prepare(`UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(newStatus, orderId);

    // If order is cancelled, release reserved stock
    if (newStatus === 'CANCELLED') {
      releaseReservedInventory(orderId, notes || 'Cancelled by admin/customer', userId);
    }

    // If order is paid/packing/shipped, commit inventory
    if (['PACKING', 'PACKED', 'READY_FOR_DISPATCH', 'READY_TO_SHIP', 'SHIPPED'].includes(newStatus)) {
      commitOrderInventory(orderId, userId);
    }

    // Timeline event
    db.prepare(`
      INSERT INTO order_timeline (id, order_id, status, title, description, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(
      crypto.randomUUID(),
      orderId,
      newStatus,
      `Status updated to ${newStatus.replace(/_/g, ' ')}`,
      notes || `Order transitioned from ${order.status} to ${newStatus}`
    );
  });
}
