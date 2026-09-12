import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { isFeatureEnabled } from '@/lib/services/features.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    ensureDatabaseReady();
    const db = getDatabase();

    // Check if delivery_zones has records, if not seed default zones
    const count = (db.prepare('SELECT count(*) as count FROM delivery_zones').get() as any)?.count || 0;
    if (count === 0) {
      const crypto = require('node:crypto');
      const seedZones = [
        {
          id: `zone_${crypto.randomUUID()}`,
          name: 'Punjab & Federal Capital',
          cities: ['Lahore', 'Multan', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Gujranwala', 'Sialkot', 'Bahawalpur'],
          fee: 350,
          freeThreshold: 10000,
          days: '24 Hours Dawn Dispatch',
          isInternational: 0,
          country: 'PK'
        },
        {
          id: `zone_${crypto.randomUUID()}`,
          name: 'Sindh & Coastal Zone',
          cities: ['Karachi', 'Hyderabad', 'Sukkur', 'Larkana'],
          fee: 450,
          freeThreshold: 12000,
          days: '36 - 48 Hours Cold-Chain Express',
          isInternational: 0,
          country: 'PK'
        },
        {
          id: `zone_${crypto.randomUUID()}`,
          name: 'KPK & Balochistan',
          cities: ['Peshawar', 'Abbottabad', 'Mardan', 'Quetta'],
          fee: 500,
          freeThreshold: 15000,
          days: '48 Hours Express Transit',
          isInternational: 0,
          country: 'PK'
        },
        {
          id: `zone_${crypto.randomUUID()}`,
          name: 'United Arab Emirates (Air Freight)',
          cities: ['Dubai', 'Abu Dhabi', 'Sharjah'],
          fee: 11500,
          freeThreshold: 50000,
          days: '72 Hours Direct Cargo Flight',
          isInternational: 1,
          country: 'AE'
        },
        {
          id: `zone_${crypto.randomUUID()}`,
          name: 'United Kingdom (London Heathrow Cargo)',
          cities: ['London', 'Manchester', 'Birmingham'],
          fee: 16000,
          freeThreshold: 75000,
          days: '3 - 4 Days Express Air Cargo',
          isInternational: 1,
          country: 'GB'
        }
      ];

      for (const z of seedZones) {
        db.prepare(`
          INSERT INTO delivery_zones (
            id, name, cities_json, delivery_fee, free_delivery_threshold, estimated_days, cod_available, is_active, is_international, country_code
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        `).run(z.id, z.name, JSON.stringify(z.cities), z.fee, z.freeThreshold, z.days, z.isInternational ? 0 : 1, z.isInternational, z.country);
      }
    }

    const isIntlEnabled = isFeatureEnabled('international_ordering');

    let query = 'SELECT * FROM delivery_zones WHERE is_active = 1';
    if (!isIntlEnabled) {
      query += ' AND is_international = 0';
    }
    query += ' ORDER BY is_international ASC, delivery_fee ASC';

    const zones = db.prepare(query).all();

    return NextResponse.json({
      success: true,
      zones: zones.map((z: any) => ({
        id: z.id,
        name: z.name,
        cities: JSON.parse(z.cities_json || '[]'),
        deliveryFee: z.delivery_fee,
        freeDeliveryThreshold: z.free_delivery_threshold,
        estimatedDays: z.estimated_days,
        codAvailable: Boolean(z.cod_available),
        isInternational: Boolean(z.is_international),
        countryCode: z.country_code
      }))
    });
  } catch (err: any) {
    console.error('Error loading delivery zones:', err);
    return NextResponse.json({ error: 'Failed to load delivery zones' }, { status: 500 });
  }
}
