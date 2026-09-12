import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { getDatabase } from '../db';
import { ensureDatabaseReady } from '../db/init';
import { formatPKR } from '../formatters';

export async function generateOrderSlipPdf(orderId: string): Promise<Uint8Array> {
  ensureDatabaseReady();
  const db = getDatabase();

  const order = (await db.prepare(`
    SELECT o.*, 
           COALESCE(c.full_name, o.guest_name, 'Guest Customer') as customer_name,
           COALESCE(c.phone, o.guest_phone, 'Unspecified') as customer_phone,
           COALESCE(c.email, o.guest_email, 'Unspecified') as customer_email,
           cr.name as courier_name
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    LEFT JOIN couriers cr ON cr.id = o.courier_id
    WHERE o.id = ? OR o.order_number = ?
  `).get(orderId, orderId)) as any;

  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  const items = (await db.prepare(`
    SELECT oi.*, p.name as product_name
    FROM order_items oi
    LEFT JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ?
  `).all(order.id)) as any[];

  let addressObj: any = {};
  try {
    addressObj = JSON.parse(order.shipping_address_json || '{}');
  } catch {}

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait in points (72 DPI)
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Palette: Luxury Emerald & Amber Gold
  const colorEmerald = rgb(17 / 255, 56 / 255, 36 / 255); // #113824
  const colorGold = rgb(217 / 255, 119 / 255, 6 / 255); // #D97706
  const colorDark = rgb(30 / 255, 41 / 255, 59 / 255); // slate-800
  const colorMuted = rgb(100 / 255, 116 / 255, 139 / 255); // slate-500
  const colorLightBg = rgb(253 / 255, 251 / 255, 247 / 255); // parchment #FDFBF7
  const colorBorder = rgb(229 / 255, 231 / 255, 235 / 255); // gray-200

  // Background tint
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: colorLightBg
  });

  // Top Emerald Accent Bar
  page.drawRectangle({
    x: 0,
    y: height - 12,
    width,
    height: 12,
    color: colorEmerald
  });

  let currentY = height - 40;

  // Header: Brand & Title
  page.drawText('AL USMANI ORCHARDS', {
    x: 40,
    y: currentY,
    size: 18,
    font: fontBold,
    color: colorEmerald
  });

  page.drawText('ROYAL HARVEST CONSIGNMENT SLIP & INVOICE', {
    x: 40,
    y: currentY - 14,
    size: 8.5,
    font: fontBold,
    color: colorGold
  });

  page.drawText('Shujabad Road, Multan & Mirwah Gorchani, Mirpur Khas • Tel: +92 300 8472910', {
    x: 40,
    y: currentY - 26,
    size: 7.5,
    font: fontRegular,
    color: colorMuted
  });

  // Consignment Number Badge (Top Right)
  const orderNumText = `ORDER #${order.order_number}`;
  const badgeWidth = fontBold.widthOfTextAtSize(orderNumText, 12) + 24;
  page.drawRectangle({
    x: width - 40 - badgeWidth,
    y: currentY - 18,
    width: badgeWidth,
    height: 28,
    color: colorEmerald
  });
  page.drawText(orderNumText, {
    x: width - 40 - badgeWidth + 12,
    y: currentY - 9,
    size: 12,
    font: fontBold,
    color: rgb(1, 1, 1)
  });

  currentY -= 45;

  // Divider Line
  page.drawLine({
    start: { x: 40, y: currentY },
    end: { x: width - 40, y: currentY },
    thickness: 1,
    color: colorGold
  });

  currentY -= 20;

  // Metadata Grid: Consignee / Dispatch Details
  const col1X = 40;
  const col2X = width / 2 + 10;
  const boxWidth = width / 2 - 50;
  const boxHeight = 90;

  // Box 1: Consignee Information
  page.drawRectangle({
    x: col1X,
    y: currentY - boxHeight,
    width: boxWidth,
    height: boxHeight,
    color: rgb(1, 1, 1),
    borderColor: colorBorder,
    borderWidth: 1
  });

  page.drawText('CONSIGNEE & DELIVERY DETAILS', {
    x: col1X + 12,
    y: currentY - 16,
    size: 8,
    font: fontBold,
    color: colorGold
  });

  page.drawText(`Name: ${order.customer_name}`, {
    x: col1X + 12,
    y: currentY - 30,
    size: 9,
    font: fontBold,
    color: colorDark
  });

  page.drawText(`Phone: ${order.customer_phone}`, {
    x: col1X + 12,
    y: currentY - 43,
    size: 8.5,
    font: fontRegular,
    color: colorDark
  });

  const rawAddress = addressObj.address || 'Standard Delivery Address';
  const truncatedAddress = rawAddress.length > 38 ? rawAddress.substring(0, 38) + '...' : rawAddress;
  page.drawText(`Address: ${truncatedAddress}`, {
    x: col1X + 12,
    y: currentY - 56,
    size: 8,
    font: fontRegular,
    color: colorDark
  });

  page.drawText(`Destination: ${addressObj.city || 'Pakistan'}`, {
    x: col1X + 12,
    y: currentY - 69,
    size: 8.5,
    font: fontBold,
    color: colorEmerald
  });

  // Box 2: Consignment Status & Courier
  page.drawRectangle({
    x: col2X,
    y: currentY - boxHeight,
    width: boxWidth,
    height: boxHeight,
    color: rgb(1, 1, 1),
    borderColor: colorBorder,
    borderWidth: 1
  });

  page.drawText('DISPATCH & PAYMENT SUMMARY', {
    x: col2X + 12,
    y: currentY - 16,
    size: 8,
    font: fontBold,
    color: colorGold
  });

  const orderDate = order.created_at ? order.created_at.substring(0, 10) : '2026-06-15';
  page.drawText(`Booking Date: ${orderDate}`, {
    x: col2X + 12,
    y: currentY - 30,
    size: 8.5,
    font: fontRegular,
    color: colorDark
  });

  page.drawText(`Status: ${order.status.replace(/_/g, ' ')}`, {
    x: col2X + 12,
    y: currentY - 43,
    size: 8.5,
    font: fontBold,
    color: colorEmerald
  });

  const paymentMethodLabel = order.payment_method === 'COD' ? 'Cash on Delivery (COD)' : order.payment_method.replace(/_/g, ' ');
  page.drawText(`Payment: ${paymentMethodLabel} [${order.payment_status}]`, {
    x: col2X + 12,
    y: currentY - 56,
    size: 8.5,
    font: fontRegular,
    color: colorDark
  });

  const courierLabel = order.courier_name || 'Al Usmani Express Cold-Chain';
  const trackingLabel = order.tracking_number ? `Tracking #: ${order.tracking_number}` : 'Courier Allocation: En Route to Cold-Hub';
  page.drawText(`Carrier: ${courierLabel}`, {
    x: col2X + 12,
    y: currentY - 69,
    size: 8,
    font: fontRegular,
    color: colorDark
  });
  page.drawText(trackingLabel, {
    x: col2X + 12,
    y: currentY - 80,
    size: 7.5,
    font: fontOblique,
    color: colorMuted
  });

  currentY -= boxHeight + 25;

  // Gift Message Banner (If applicable)
  if (order.is_gift) {
    page.drawRectangle({
      x: 40,
      y: currentY - 28,
      width: width - 80,
      height: 28,
      color: rgb(254 / 255, 243 / 255, 199 / 255), // amber-100
      borderColor: rgb(245 / 255, 158 / 255, 11 / 255),
      borderWidth: 1
    });

    page.drawText(`GIFT CONSIGNMENT FOR: ${order.gift_recipient || order.customer_name}`, {
      x: 52,
      y: currentY - 14,
      size: 8,
      font: fontBold,
      color: colorGold
    });

    if (order.gift_message) {
      page.drawText(`"${order.gift_message.substring(0, 75)}"`, {
        x: 52,
        y: currentY - 24,
        size: 7.5,
        font: fontOblique,
        color: colorDark
      });
    }

    currentY -= 36;
  }

  // Itemized Harvest Table Header
  const tableX = 40;
  const tableWidth = width - 80;
  const headerHeight = 22;

  page.drawRectangle({
    x: tableX,
    y: currentY - headerHeight,
    width: tableWidth,
    height: headerHeight,
    color: colorEmerald
  });

  page.drawText('HARVEST CULTIVAR', { x: tableX + 10, y: currentY - 15, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('PACKAGE SIZE', { x: tableX + 180, y: currentY - 15, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('UNIT PRICE', { x: tableX + 310, y: currentY - 15, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('QTY', { x: tableX + 390, y: currentY - 15, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('TOTAL (PKR)', { x: tableX + 440, y: currentY - 15, size: 8, font: fontBold, color: rgb(1, 1, 1) });

  currentY -= headerHeight;

  // Itemized Table Rows
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rowHeight = 22;
    const rowBg = i % 2 === 0 ? rgb(1, 1, 1) : rgb(248 / 255, 250 / 255, 252 / 255);

    page.drawRectangle({
      x: tableX,
      y: currentY - rowHeight,
      width: tableWidth,
      height: rowHeight,
      color: rowBg,
      borderColor: colorBorder,
      borderWidth: 0.5
    });

    page.drawText(item.variety_name || 'Fresh Mango Cultivar', {
      x: tableX + 10,
      y: currentY - 15,
      size: 8.5,
      font: fontBold,
      color: colorDark
    });

    page.drawText(item.package_name || `${item.unit_weight_kg || 5} KG Crate`, {
      x: tableX + 180,
      y: currentY - 15,
      size: 8,
      font: fontRegular,
      color: colorDark
    });

    page.drawText(formatPKR(item.unit_price), {
      x: tableX + 310,
      y: currentY - 15,
      size: 8,
      font: fontRegular,
      color: colorDark
    });

    page.drawText(`${item.quantity} crate${item.quantity > 1 ? 's' : ''}`, {
      x: tableX + 390,
      y: currentY - 15,
      size: 8,
      font: fontRegular,
      color: colorDark
    });

    page.drawText(formatPKR(item.subtotal), {
      x: tableX + 440,
      y: currentY - 15,
      size: 8.5,
      font: fontBold,
      color: colorEmerald
    });

    currentY -= rowHeight;
  }

  currentY -= 15;

  // Financial Totals Summary (Right-aligned card)
  const summaryWidth = 220;
  const summaryX = width - 40 - summaryWidth;

  page.drawText(`Subtotal:`, { x: summaryX, y: currentY, size: 8.5, font: fontRegular, color: colorMuted });
  page.drawText(formatPKR(order.subtotal), { x: width - 40 - fontRegular.widthOfTextAtSize(formatPKR(order.subtotal), 8.5), y: currentY, size: 8.5, font: fontRegular, color: colorDark });
  currentY -= 14;

  if (order.discount_amount > 0) {
    const discountText = `- ${formatPKR(order.discount_amount)}`;
    page.drawText(`Discounts & Offers:`, { x: summaryX, y: currentY, size: 8.5, font: fontRegular, color: colorGold });
    page.drawText(discountText, { x: width - 40 - fontRegular.widthOfTextAtSize(discountText, 8.5), y: currentY, size: 8.5, font: fontBold, color: colorGold });
    currentY -= 14;
  }

  const shippingText = order.shipping_fee === 0 ? 'FREE' : formatPKR(order.shipping_fee);
  page.drawText(`Cold-Chain Dispatch Fee:`, { x: summaryX, y: currentY, size: 8.5, font: fontRegular, color: colorMuted });
  page.drawText(shippingText, { x: width - 40 - fontRegular.widthOfTextAtSize(shippingText, 8.5), y: currentY, size: 8.5, font: fontRegular, color: colorDark });
  currentY -= 18;

  // Total Payable Banner
  page.drawRectangle({
    x: summaryX - 8,
    y: currentY - 18,
    width: summaryWidth + 8,
    height: 26,
    color: colorEmerald
  });

  page.drawText('TOTAL AMOUNT DUE:', {
    x: summaryX,
    y: currentY - 10,
    size: 9,
    font: fontBold,
    color: rgb(1, 1, 1)
  });

  const totalStr = formatPKR(order.total_amount);
  page.drawText(totalStr, {
    x: width - 40 - fontBold.widthOfTextAtSize(totalStr, 11) - 4,
    y: currentY - 10,
    size: 11,
    font: fontBold,
    color: rgb(245 / 255, 158 / 255, 11 / 255) // gold
  });

  currentY -= 50;

  // Quality & Origin Assurance Seal
  page.drawRectangle({
    x: 40,
    y: currentY - 48,
    width: width - 80,
    height: 48,
    color: rgb(240 / 255, 253 / 255, 244 / 255), // emerald-50
    borderColor: rgb(167 / 255, 243 / 255, 208 / 255),
    borderWidth: 1
  });

  page.drawText('OFFICIAL ORCHARD INTEGRITY & CARRIER SEAL', {
    x: 52,
    y: currentY - 16,
    size: 8,
    font: fontBold,
    color: colorEmerald
  });

  page.drawText(
    'Certified 100% Tree-Ripened • Zero Calcium Carbide Chemicals • Dawn-Plucked with Stalks Intact',
    {
      x: 52,
      y: currentY - 28,
      size: 7.5,
      font: fontRegular,
      color: colorDark
    }
  );

  page.drawText(
    'Temperature-stabilized ventilated cartons. Inspect crate seal upon doorstep handover.',
    {
      x: 52,
      y: currentY - 40,
      size: 7,
      font: fontOblique,
      color: colorMuted
    }
  );

  // Footer (Bottom of page)
  page.drawText('Al Usmani Orchards (Private) Limited — Pakistan National Tax No: 8492048-2', {
    x: 40,
    y: 28,
    size: 7,
    font: fontRegular,
    color: colorMuted
  });

  page.drawText('Helpline & WhatsApp: +92 300 8472910 • Web: https://alusmaniorchards.pk', {
    x: 40,
    y: 18,
    size: 7,
    font: fontBold,
    color: colorEmerald
  });

  return await pdfDoc.save();
}
