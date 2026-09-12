const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const dbPath = path.resolve(__dirname, '..', 'data', 'shahi_orchards.db');
const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA foreign_keys = OFF;
  UPDATE orders SET courier_id = 'cour-tcs' WHERE courier_id = 'cour-fleet';
  UPDATE shipments SET courier_id = 'cour-tcs' WHERE courier_id = 'cour-fleet';
  DELETE FROM couriers WHERE id = 'cour-fleet';

  INSERT OR REPLACE INTO couriers (id, name, code, tracking_url_template, logo_url, cod_supported, is_active)
  VALUES 
    ('cour-tcs', 'TCS Express Cold-Chain', 'TCS', 'https://www.tcsexpress.com/tracking?tracking_number={TRACKING_NO}', '/images/couriers/tcs.svg', 1, 1),
    ('cour-leo', 'Leopards Courier Overland', 'LEO', 'https://www.leopardscourier.com/tracking?track_no={TRACKING_NO}', '/images/couriers/leopards.svg', 1, 1),
    ('cour-mnp', 'M&P Express Logistics', 'MNP', 'https://mulphilog.com/tracking?consignment_no={TRACKING_NO}', '/images/couriers/mp.svg', 1, 1),
    ('cour-pakpost', 'Pakistan Post UMS Urgent Mail', 'PAKPOST', 'https://ep.gov.pk/track?track_id={TRACKING_NO}', '/images/couriers/pakpost.svg', 1, 1);
  PRAGMA foreign_keys = ON;
`);

console.log('Couriers synced successfully:');
console.log(db.prepare('SELECT id, name, logo_url FROM couriers').all());
