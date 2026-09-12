import { getDatabase, runTransaction } from '../db';
import { sendOrderDispatchedEmail } from '../email';
import { getShippingSettings } from './settings.service';
import crypto from 'node:crypto';

export interface CreateShipmentParams {
  orderId: string;
  courierId: string;
  shippingCost: number;
  codAmount: number;
  notes?: string;
  createdBy?: string;
}

export async function calculateShippingFee(totalWeightKg: number, destinationCity: string, subtotal?: number): Promise<number> {
  const city = (destinationCity || 'Lahore').toLowerCase().trim();
  const shippingSettings = await getShippingSettings();

  // 1. Check for Free Shipping threshold
  if (
    subtotal !== undefined &&
    shippingSettings.free_shipping_threshold > 0 &&
    subtotal >= shippingSettings.free_shipping_threshold
  ) {
    return 0;
  }

  // 2. Query location-specific rate from pakistan_locations if configured
  try {
    const db = getDatabase();
    const loc = await db.prepare(`
      SELECT delivery_fee 
      FROM pakistan_locations 
      WHERE is_active = 1 AND LOWER(city) = ?
      ORDER BY is_serviceable DESC, sort_order ASC 
      LIMIT 1
    `).get(city) as { delivery_fee: number } | undefined;

    if (loc && typeof loc.delivery_fee !== 'undefined') {
      const additionalWeight = Math.max(0, totalWeightKg - 5);
      const weightCharge = Math.ceil(additionalWeight / 5) * 150;
      return Number(loc.delivery_fee) + weightCharge;
    }
  } catch (err) {
    // Fall back to matrix if table not ready
  }

  // 3. Standard regional rate matrix scaled by configured standard_shipping_fee
  const standardFee = shippingSettings.standard_shipping_fee || 350;
  let baseRate = standardFee;

  if (city.includes('multan') || city.includes('bahawalpur') || city.includes('rahim yar khan')) {
    baseRate = Math.max(100, standardFee - 100);
  } else if (city.includes('lahore') || city.includes('faisalabad') || city.includes('sahiwal')) {
    baseRate = standardFee;
  } else if (city.includes('islamabad') || city.includes('rawalpindi') || city.includes('peshawar')) {
    baseRate = standardFee + 100;
  } else if (city.includes('karachi') || city.includes('hyderabad') || city.includes('quetta')) {
    baseRate = standardFee + 150;
  }

  // Weight surcharge for luxury heavy crates (every 5 KG over 5 KG adds PKR 150)
  const additionalWeight = Math.max(0, totalWeightKg - 5);
  const weightCharge = Math.ceil(additionalWeight / 5) * 150;

  return baseRate + weightCharge;
}

export async function assignCourierAndDispatch(params: CreateShipmentParams): Promise<{
  shipmentId: string;
  trackingNumber: string;
}> {
  const result = await runTransaction(async (db) => {
    const courier = await db.prepare('SELECT id, name, code, tracking_url_template FROM couriers WHERE id = ?').get(params.courierId) as any;
    if (!courier) {
      throw new Error(`Courier with ID ${params.courierId} not found`);
    }

    const order = await db.prepare('SELECT id, order_number, status, shipping_address_json FROM orders WHERE id = ?').get(params.orderId) as any;
    if (!order) {
      throw new Error(`Order with ID ${params.orderId} not found`);
    }

    const invalidStatuses = ['CANCELLED', 'REFUNDED', 'RETURNED'];
    if (invalidStatuses.includes(order.status)) {
      throw new Error(`Cannot dispatch order ${order.order_number || params.orderId} because it is currently ${order.status}`);
    }

    // Idempotency: Prevent duplicate dispatch bookings for the same order
    const existingShipment = await db.prepare('SELECT id, tracking_number FROM shipments WHERE order_id = ?').get(params.orderId) as any;
    if (existingShipment) {
      throw new Error(`Order ${order.order_number || params.orderId} is already dispatched with tracking # ${existingShipment.tracking_number}`);
    }

    const shipmentId = crypto.randomUUID();
    // Human-readable tracking number, e.g. TCS-78492019 or LEO-9082341
    const randomDigits = Math.floor(10000000 + Math.random() * 90000000);
    const trackingNumber = `${courier.code}-${randomDigits}`;

    const pickupDate = new Date().toISOString().split('T')[0];
    const estimatedDelivery = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Explicit 9 columns and 9 parameter placeholders
    await db.prepare(`
      INSERT INTO shipments (
        id, order_id, courier_id, tracking_number, shipment_status,
        shipping_cost, cod_amount, pickup_date, estimated_delivery_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      shipmentId,
      params.orderId,
      params.courierId,
      trackingNumber,
      'BOOKED',
      params.shippingCost,
      params.codAmount,
      pickupDate,
      estimatedDelivery
    );

    // Update order status to READY_TO_SHIP or SHIPPED
    await db.prepare(`
      UPDATE orders 
      SET status = 'SHIPPED', courier_id = ?, tracking_number = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(params.courierId, trackingNumber, params.orderId);

    // Create Initial Tracking Event
    const eventId = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO shipment_tracking_events (
        id, shipment_id, event_time, status, location, description
      ) VALUES (?, ?, CURRENT_TIMESTAMP, 'BOOKED', 'Multan Hub', 'Consignment booked and scheduled for cold-chain pickup')
    `).run(eventId, shipmentId);

    // Record in order timeline
    const timelineId = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO order_timeline (
        id, order_id, status, title, description, created_at
      ) VALUES (?, ?, 'SHIPPED', 'Dispatched with Courier', ?, CURRENT_TIMESTAMP)
    `).run(
      timelineId,
      params.orderId,
      `Handed over to ${courier.name} with Tracking # ${trackingNumber}`
    );

    return { shipmentId, trackingNumber, courierName: courier.name, trackingUrlTemplate: courier.tracking_url_template };
  });

  // Asynchronously trigger customer dispatch notification
  const trackingUrl = (result.trackingUrlTemplate || 'https://alusmaniorchards.pk/track-order?ref={tracking_number}')
    .replace('{tracking_number}', result.trackingNumber);

  sendOrderDispatchedEmail(params.orderId, result.courierName, result.trackingNumber, trackingUrl).catch((err) =>
    console.error('Non-blocking dispatch email error:', err)
  );

  return {
    shipmentId: result.shipmentId,
    trackingNumber: result.trackingNumber
  };
}

export async function addTrackingEvent(params: {
  shipmentId: string;
  status: 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'RETURNED_TO_ORIGIN';
  location: string;
  description: string;
}): Promise<void> {
  await runTransaction(async (db) => {
    const shipment = await db.prepare('SELECT id, order_id FROM shipments WHERE id = ?').get(params.shipmentId) as any;
    if (!shipment) {
      throw new Error(`Shipment ${params.shipmentId} not found`);
    }

    const eventId = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO shipment_tracking_events (
        id, shipment_id, event_time, status, location, description
      ) VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, ?)
    `).run(eventId, params.shipmentId, params.status, params.location, params.description);

    await db.prepare(`
      UPDATE shipments 
      SET shipment_status = ?, actual_delivery_date = CASE WHEN ? = 'DELIVERED' THEN CURRENT_TIMESTAMP ELSE actual_delivery_date END
      WHERE id = ?
    `).run(params.status, params.status, params.shipmentId);

    // Map shipment status to order status
    let newOrderStatus: string | null = null;
    if (params.status === 'IN_TRANSIT') newOrderStatus = 'IN_TRANSIT';
    else if (params.status === 'OUT_FOR_DELIVERY') newOrderStatus = 'OUT_FOR_DELIVERY';
    else if (params.status === 'DELIVERED') newOrderStatus = 'DELIVERED';

    if (newOrderStatus) {
      await db.prepare(`UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(newOrderStatus, shipment.order_id);

      await db.prepare(`
        INSERT INTO order_timeline (id, order_id, status, title, description, created_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        crypto.randomUUID(),
        shipment.order_id,
        newOrderStatus,
        params.status.replace(/_/g, ' '),
        params.description
      );
    }
  });
}
