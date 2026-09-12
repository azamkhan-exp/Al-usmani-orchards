import { formatPKR } from '../formatters';

interface EmailSettings {
  storeName?: string;
  supportEmail?: string;
  phone?: string;
}

export function generateOrderConfirmationHtml(params: {
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  city: string;
  address: string;
  items: Array<{
    varietyName: string;
    packageName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  paymentMethod: string;
  isGift?: boolean;
  giftRecipient?: string;
  giftMessage?: string;
  settings?: EmailSettings;
}): string {
  const storeName = params.settings?.storeName || 'Al Usmani Orchards';
  const supportEmail = params.settings?.supportEmail || 'harvest@alusmaniorchards.pk';
  const phone = params.settings?.phone || '+92 300 8472910';

  const itemRows = params.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #E8DBC5; font-size: 14px; color: #111827;">
          <strong style="color: #113824;">${item.varietyName}</strong><br/>
          <span style="font-size: 12px; color: #6B7280;">${item.packageName} × ${item.quantity}</span>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #E8DBC5; text-align: right; font-size: 14px; font-weight: bold; color: #113824;">
          ${formatPKR(item.subtotal)}
        </td>
      </tr>
    `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Order Confirmed — ${storeName}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #FDFBF7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FDFBF7; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E8DBC5; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #092115; padding: 40px 30px; text-align: center; border-bottom: 3px solid #F59E0B;">
              <div style="font-size: 32px; margin-bottom: 10px;">🥭</div>
              <div style="font-size: 11px; letter-spacing: 3px; color: #F59E0B; font-weight: bold; text-transform: uppercase;">
                ESTD. 1934 • MULTAN
              </div>
              <h1 style="color: #FFFFFF; margin: 8px 0 4px 0; font-size: 26px; font-family: Georgia, serif; font-weight: 900; letter-spacing: 1px;">
                ${storeName}
              </h1>
              <p style="color: #F5EEE2; margin: 0; font-size: 13px; font-style: italic; opacity: 0.9;">
                &ldquo;From Our Orchards to Your Door.&rdquo;
              </p>
            </td>
          </tr>

          <!-- Confirmation Title -->
          <tr>
            <td style="padding: 35px 30px 20px 30px; text-align: center;">
              <div style="display: inline-block; padding: 6px 16px; background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 50px; color: #065F46; font-size: 12px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 16px;">
                ✓ Allocation Confirmed
              </div>
              <h2 style="margin: 0 0 10px 0; color: #113824; font-family: Georgia, serif; font-size: 24px;">
                Shukriya, ${params.customerName}!
              </h2>
              <p style="margin: 0; color: #4B5563; font-size: 14px; line-height: 1.6;">
                Your harvest consignment has been securely queued in our orchard allocation schedule.
                Our master pickers will dawn-pluck your crates at peak 24°+ Brix sweetness for cold-chain dispatch.
              </p>
            </td>
          </tr>

          <!-- Order Summary Card -->
          <tr>
            <td style="padding: 10px 30px 20px 30px;">
              <div style="background-color: #FDFBF7; border: 1px solid #E8DBC5; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size: 13px; color: #6B7280;">Consignment Number:</td>
                    <td style="font-size: 15px; font-weight: bold; color: #113824; text-align: right; font-family: monospace;">
                      ${params.orderNumber}
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size: 13px; color: #6B7280; padding-top: 6px;">Payment Method:</td>
                    <td style="font-size: 13px; font-weight: bold; color: #D97706; text-align: right; padding-top: 6px;">
                      ${params.paymentMethod}
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size: 13px; color: #6B7280; padding-top: 6px;">Delivery City:</td>
                    <td style="font-size: 13px; font-weight: bold; color: #113824; text-align: right; padding-top: 6px;">
                      ${params.city}
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Line Items Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <thead>
                  <tr style="background-color: #F3F4F6;">
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #4B5563; font-weight: bold; text-transform: uppercase;">
                      Harvest Variety
                    </th>
                    <th style="padding: 10px 12px; text-align: right; font-size: 12px; color: #4B5563; font-weight: bold; text-transform: uppercase;">
                      Price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRows}
                </tbody>
                <tfoot>
                  <tr>
                    <td style="padding: 10px 12px 4px 12px; font-size: 13px; color: #6B7280;">Subtotal</td>
                    <td style="padding: 10px 12px 4px 12px; text-align: right; font-size: 13px; color: #111827;">${formatPKR(params.subtotal)}</td>
                  </tr>
                  ${
                    params.discount > 0
                      ? `<tr>
                    <td style="padding: 4px 12px; font-size: 13px; color: #059669;">Discounts</td>
                    <td style="padding: 4px 12px; text-align: right; font-size: 13px; color: #059669; font-weight: bold;">-${formatPKR(params.discount)}</td>
                  </tr>`
                      : ''
                  }
                  <tr>
                    <td style="padding: 4px 12px; font-size: 13px; color: #6B7280;">Cold-Chain Freight</td>
                    <td style="padding: 4px 12px; text-align: right; font-size: 13px; color: #111827;">${formatPKR(params.shipping)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; font-size: 16px; font-weight: 900; color: #113824; border-top: 2px solid #E8DBC5;">Total Due</td>
                    <td style="padding: 12px; text-align: right; font-size: 18px; font-weight: 900; color: #D97706; border-top: 2px solid #E8DBC5;">
                      ${formatPKR(params.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              ${
                params.isGift
                  ? `
                <div style="background-color: #FEF3C7; border: 1px solid #FCD34D; border-radius: 12px; padding: 14px; margin-bottom: 20px;">
                  <strong style="color: #92400E; font-size: 13px; display: block; margin-bottom: 4px;">🎁 Royal Gift Presentation:</strong>
                  <div style="font-size: 12px; color: #78350F;">
                    Recipient: <strong>${params.giftRecipient || 'Honored Recipient'}</strong><br/>
                    <em>&ldquo;${params.giftMessage || ''}&rdquo;</em>
                  </div>
                </div>
              `
                  : ''
              }

              <!-- Track Button CTA -->
              <div style="text-align: center; padding: 15px 0 25px 0;">
                <a href="https://alusmaniorchards.pk/track-order?ref=${params.orderNumber}" style="background-color: #113824; color: #FFFFFF; font-size: 14px; font-weight: bold; padding: 14px 32px; border-radius: 10px; text-decoration: none; display: inline-block; letter-spacing: 1px;">
                  TRACK LIVE SHIPMENT →
                </a>
              </div>
            </td>
          </tr>

          <!-- Quality Footer -->
          <tr>
            <td style="background-color: #F5EEE2; padding: 25px 30px; border-top: 1px solid #E8DBC5; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; color: #113824;">
                The Al Usmani Zero-Carbide Quality Guarantee
              </p>
              <p style="margin: 0; font-size: 11px; color: #6B7280; line-height: 1.5;">
                Every mango is tree-ripened and washed in warm spring water before packing. If fruit arrives damaged, WhatsApp us within 12 hours at ${phone} for immediate replacement.
              </p>
              <div style="margin-top: 14px; font-size: 11px; color: #9CA3AF;">
                ${storeName} • Shujabad Road, Multan, Punjab, Pakistan • <a href="mailto:${supportEmail}" style="color: #D97706; text-decoration: none;">${supportEmail}</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export function generateOrderDispatchedHtml(params: {
  orderNumber: string;
  customerName: string;
  courierName: string;
  trackingNumber: string;
  trackingUrl: string;
  settings?: EmailSettings;
}): string {
  const storeName = params.settings?.storeName || 'Al Usmani Orchards';
  const supportEmail = params.settings?.supportEmail || 'harvest@alusmaniorchards.pk';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Consignment Has Dispatched — ${storeName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FDFBF7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FDFBF7; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E8DBC5;">
          <tr>
            <td style="background-color: #092115; padding: 35px 30px; text-align: center; border-bottom: 3px solid #F59E0B;">
              <div style="font-size: 30px; margin-bottom: 6px;">🚚</div>
              <h1 style="color: #FFFFFF; margin: 0; font-size: 22px; font-family: Georgia, serif; font-weight: 900;">
                Your Harvest Crate is On Its Way!
              </h1>
              <p style="color: #F5EEE2; margin: 6px 0 0 0; font-size: 13px;">
                ${storeName} • Live Cold-Chain Dispatch
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 16px 0; color: #113824; font-size: 15px;">
                Dear <strong>${params.customerName}</strong>,
              </p>
              <p style="margin: 0 0 20px 0; color: #4B5563; font-size: 14px; line-height: 1.6;">
                Your order <strong>${params.orderNumber}</strong> has been hand-inspected, nested in protective ventilated crates, and transferred to our carrier partner <strong>${params.courierName}</strong>.
              </p>

              <div style="background-color: #FDFBF7; border: 1px solid #E8DBC5; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <div style="font-size: 12px; color: #6B7280; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">
                  Consignment Tracking Number
                </div>
                <div style="font-size: 22px; font-weight: bold; color: #113824; font-family: monospace; margin: 8px 0;">
                  ${params.trackingNumber}
                </div>
                <div style="font-size: 12px; color: #D97706; font-weight: bold;">
                  Carrier: ${params.courierName}
                </div>
              </div>

              <div style="text-align: center; margin-bottom: 25px;">
                <a href="${params.trackingUrl}" style="background-color: #F59E0B; color: #092115; font-size: 14px; font-weight: 900; padding: 14px 32px; border-radius: 10px; text-decoration: none; display: inline-block; letter-spacing: 1px;">
                  TRACK CONSIGNMENT LIVE →
                </a>
              </div>

              <p style="margin: 0; font-size: 12px; color: #6B7280; line-height: 1.5; text-align: center;">
                Need assistance? Contact our concierge at <a href="mailto:${supportEmail}" style="color: #D97706;">${supportEmail}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export function generateAdminOrderAlertHtml(params: {
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  city: string;
  total: number;
  paymentMethod: string;
  itemsCount: number;
  settings?: EmailSettings;
}): string {
  const storeName = params.settings?.storeName || 'Al Usmani Orchards';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Order Alert — ${params.orderNumber}</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #F3F4F6; font-family: sans-serif;">
  <div style="max-width: 500px; margin: auto; background: #FFFFFF; border-radius: 12px; padding: 25px; border: 1px solid #E5E7EB;">
    <h2 style="color: #113824; margin: 0 0 12px 0;">🥭 New Harvest Order Placed</h2>
    <p style="color: #4B5563; font-size: 14px; margin: 0 0 16px 0;">
      A new order has been automatically confirmed on <strong>${storeName}</strong>.
    </p>
    <table width="100%" style="font-size: 13px; line-height: 1.8; color: #111827;">
      <tr><td><strong>Order ID:</strong></td><td>${params.orderNumber}</td></tr>
      <tr><td><strong>Customer:</strong></td><td>${params.customerName}</td></tr>
      <tr><td><strong>Phone:</strong></td><td>${params.customerPhone || 'N/A'}</td></tr>
      <tr><td><strong>Destination:</strong></td><td>${params.city}</td></tr>
      <tr><td><strong>Total:</strong></td><td style="color: #D97706; font-weight: bold;">${formatPKR(params.total)}</td></tr>
      <tr><td><strong>Payment:</strong></td><td>${params.paymentMethod}</td></tr>
    </table>
    <div style="margin-top: 20px; text-align: center;">
      <a href="https://alusmaniorchards.pk/admin/orders" style="background-color: #113824; color: #FFFFFF; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: bold; display: inline-block;">
        Open Admin Fulfillment
      </a>
    </div>
  </div>
</body>
</html>
  `;
}

export function generateTestEmailHtml(storeName = 'Al Usmani Orchards'): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Test Email</title></head>
<body style="font-family: sans-serif; padding: 30px; background-color: #FDFBF7;">
  <div style="max-width: 500px; margin: auto; background: #FFFFFF; padding: 30px; border-radius: 12px; border: 1px solid #E8DBC5; text-align: center;">
    <div style="font-size: 36px; margin-bottom: 10px;">🥭</div>
    <h2 style="color: #113824; margin: 0 0 10px 0;">SMTP Test Successful!</h2>
    <p style="color: #4B5563; font-size: 14px; line-height: 1.6;">
      This test message confirms that the email dispatch system for <strong>${storeName}</strong> is properly configured and operational.
    </p>
    <div style="font-size: 12px; color: #9CA3AF; margin-top: 20px;">
      Sent from Al Usmani Orchards Centralized Settings Portal.
    </div>
  </div>
</body>
</html>
  `;
}

export function generatePasswordResetOtpHtml(params: {
  otp: string;
  name?: string;
  expiresMinutes?: number;
  storeName?: string;
  supportEmail?: string;
}): string {
  const storeName = params.storeName || 'Al Usmani Orchards';
  const name = params.name || 'Honored Patron';
  const expires = params.expiresMinutes || 10;
  const supportEmail = params.supportEmail || 'harvest@alusmaniorchards.pk';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Password Reset Code — ${storeName}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #FDFBF7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FDFBF7; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E8DBC5; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #092115; padding: 35px 30px; text-align: center; border-bottom: 3px solid #F59E0B;">
              <div style="font-size: 32px; margin-bottom: 8px;">🥭</div>
              <div style="font-size: 11px; letter-spacing: 3px; color: #F59E0B; font-weight: bold; text-transform: uppercase;">
                ESTD. 1934 • MULTAN
              </div>
              <h1 style="color: #FFFFFF; margin: 8px 0 4px 0; font-size: 22px; font-family: Georgia, serif; font-weight: 900; letter-spacing: 1px;">
                ${storeName}
              </h1>
              <p style="color: #F5EEE2; margin: 0; font-size: 12px; font-style: italic; opacity: 0.9;">
                &ldquo;From Our Orchards to Your Door.&rdquo;
              </p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 35px 30px;">
              <h2 style="color: #113824; font-size: 18px; margin: 0 0 12px 0; font-family: Georgia, serif;">
                Password Reset Verification
              </h2>
              <p style="color: #4B5563; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                Assalam-o-Alaikum ${name},<br/>
                We received a request to reset the password for your Al Usmani Orchards patron account. Please use the single-use verification code below:
              </p>

              <!-- OTP Code Display Card -->
              <div style="text-align: center; margin: 25px 0; padding: 22px; background-color: #FDFBF7; border: 2px dashed #D97706; border-radius: 14px;">
                <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: bold; color: #D97706; margin-bottom: 8px;">
                  Your 6-Digit Security Code
                </div>
                <div style="font-size: 34px; font-weight: 900; letter-spacing: 10px; color: #113824; font-family: 'Courier New', monospace;">
                  ${params.otp}
                </div>
                <div style="font-size: 12px; color: #6B7280; margin-top: 8px;">
                  Valid for <strong>${expires} minutes</strong> • Single-use security token
                </div>
              </div>

              <!-- Warning & Security Note -->
              <div style="background-color: #FEF3C7; border: 1px solid #FCD34D; border-radius: 10px; padding: 14px 16px; margin: 25px 0; font-size: 12px; color: #92400E; line-height: 1.5;">
                <strong>Security Advisory:</strong> If you did not initiate this request, your account password remains safe and unchanged. You can disregard this email.
              </div>

              <p style="color: #4B5563; font-size: 13px; line-height: 1.6; margin: 0;">
                For immediate assistance, please reply to this email or reach our WhatsApp Concierge at <strong>+92 300 8472910</strong>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 20px 30px; text-align: center; border-top: 1px solid #E5E7EB; font-size: 11px; color: #9CA3AF;">
              Al Usmani Orchards (Private) Limited • Multan & Mirpur Khas, Pakistan<br/>
              Support: <a href="mailto:${supportEmail}" style="color: #113824; text-decoration: none; font-weight: bold;">${supportEmail}</a> • Web: <a href="https://alusmaniorchards.pk" style="color: #113824; text-decoration: none; font-weight: bold;">alusmaniorchards.pk</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
