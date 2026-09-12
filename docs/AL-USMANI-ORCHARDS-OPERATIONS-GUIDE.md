# AL USMANI ORCHARDS — OFFICIAL OPERATIONS MANUAL & RUNBOOK
**Brand Identity:** Al Usmani Orchards  
**Positioning:** Fresh from Our Orchards • Premium Pakistani Mangoes • Naturally Grown • Delivered with Care  
**Primary Tagline:** *“From Our Orchards to Your Door.”*  
**Heritage:** Estd. 1934 • Shujabad Road, Multan, Punjab, Pakistan & Mirpur Khas, Sindh  

---

## 1. BRAND IDENTITY & ETHOS

Al Usmani Orchards is Pakistan’s premier direct-to-consumer (D2C) heritage mango brand and farm ERP platform. Founded in 1934 along the fertile canal silt of the Chenab river basin in Multan, our estate cultivates export-grade, carbide-free mangoes.

### Strict Brand Guidelines
* **Exact Brand Name:** `Al Usmani Orchards` (strictly capitalized; never "Al Usmani Farm", "Al Usmani Farms", "Al Usmani Orchard", or "Shahi Orchards").
* **Tagline:** *"From Our Orchards to Your Door."*
* **Visual Standards:** Deep Royal Emerald (`#113824`), Warm Harvest Amber (`#F59E0B`), Gold Sand (`#D97706`), Warm Ivory background (`#FDFBF7`).
* **Purity Guarantee:** 100% Tree-Ripened, Zero Calcium Carbide, 24°+ Brix Sweetness.

---

## 2. HERITAGE MANGO VARIETIES MATRIX

| Cultivar | Lineage / Origin | Brix Sweetness | Peak Season | Flavor Profile & Texture |
| :--- | :--- | :--- | :--- | :--- |
| **Multani Chaunsa** | Multan / Rahim Yar Khan | 26° - 28° Brix | July – August | Rich golden honey, floral nectar, velvety fiberless pulp. The undisputed king of mangoes. |
| **Sindhri** | Mirpur Khas, Sindh | 20° - 22° Brix | Late May – June | Distinct aromatic lemon-apricot sweetness with a refreshing citrus finish. Large oblong fruit. |
| **Anwar Ratol** | Multan heirloom | 27° - 29° Brix | Mid June – July | Miniature powerhouse with an explosive, intoxicating perfume and butter-soft texture. |
| **Dussehri** | Multan / Khanewal | 21° - 23° Brix | June – July | Long-slender heritage variety with a silky melt-in-the-mouth texture and delicate musky sweetness. |
| **White Chaunsa** | Multan late harvest | 25° - 27° Brix | August – September | Pale golden-white skin, ultra-clean sweetness, and prolonged shelf life for late-season connoisseurs. |

---

## 3. HARVEST & POST-HARVEST PROTOCOL

1. **Dawn Plucking (5:00 AM – 8:30 AM):** Picking occurs exclusively at daybreak before ambient heat warms the orchard canopy. Fruit is harvested with 1-inch stalks to prevent sap-burn on the fruit skin.
2. **Spring Water Desapping & Washing:** Fruit stalks are trimmed under running warm spring water to eliminate acidic latex and preserve rind integrity.
3. **Physiological Grading:** Each fruit is weighed and optically inspected. Only Grade A+ export fruit with zero blemish or mechanical abrasion is allocated for customer consignments.
4. **Foam Nesting & 5-Ply Packaging:** Each mango is individually sleeved in breathable food-grade foam netting and cushioned in 5-ply export corrugated cartons with lateral ventilation eyelets.

---

## 4. ORDER STATE MACHINE & COLD-CHAIN DISPATCH

Orders follow an automated, sequential pipeline with strict audit logging:

```
[CONFIRMED]
    ↓ (Dawn picking schedule queued)
[PROCESSING]
    ↓ (Graded, cleaned & foam-sleeved)
[PACKED]
    ↓ (Thermal carton staging at cold-hub)
[READY_FOR_DISPATCH]
    ↓ (Handover to courier partner)
[SHIPPED]
    ↓ (Temperature-controlled reefer transit)
[OUT_FOR_DELIVERY]
    ↓ (Doorstep delivery verification)
[DELIVERED]
```

### State Specifications:
* **CONFIRMED:** Generated immediately upon customer checkout (e.g. `AUO-10245`). No manual approval delays. Order confirmation email dispatched to customer and alert sent to admin.
* **PROCESSING:** Batch assigned to harvest team. Allocation subtracted from available inventory.
* **PACKED:** Crate assembled, weight verified, and packing slip printed.
* **READY_FOR_DISPATCH:** Staged in cold storage (13°C) awaiting courier vehicle arrival.
* **SHIPPED:** Consignment number assigned (e.g. `TCS-88392011`). Customer receives automated dispatch email with direct live carrier tracking hyperlink.
* **OUT_FOR_DELIVERY:** Carrier delivery van scans package into regional destination territory.
* **DELIVERED:** Courier marks delivery complete; COD collections recorded in Accounts Receivable.

---

## 5. COURIER PARTNER INTEGRATION

Al Usmani Orchards works with four national carriers:

1. **TCS Express Cold-Chain (`cour-tcs`):** Overnight air and temperature-monitored ground reefer for Karachi, Islamabad, Lahore, and Peshawar. Tracking format: `TCS-XXXXXXXX`.
2. **Leopards Courier Overland (`cour-leo`):** Heavy cargo overland logistics for bulk multi-crate consignments. Tracking format: `LEO-XXXXXXXX`.
3. **M&P Express Logistics (`cour-mnp`):** Commercial distribution and corporate gift hampers. Tracking format: `MNP-XXXXXXXX`.
4. **Pakistan Post UMS (`cour-pakpost`):** Rural and remote district coverage across Sindh, Balochistan, and KPK. Tracking format: `PAK-XXXXXXXX`.

---

## 6. FINANCIAL RECONCILIATION & COD SETTLEMENT

* **Online Card & Bank Transfers:** Auto-verified or reconciled by finance staff in `/admin/finance`.
* **Cash on Delivery (COD):** Upon order placement, an automated entry is created in `accounts_receivable` under debtor `COURIER_COD`.
* **Courier Remittance Reconciliation:** When the carrier deposits COD funds into Al Usmani Orchards' corporate bank account, staff marks the receivable `SETTLED`.

---

## 7. DISASTER RECOVERY & SYSTEM RESILIENCE

* **Email Fallback:** If SMTP host is unconfigured or temporarily unreachable, orders never fail. The system logs attempts to `notification_logs` with status `SIMULATED` or `FAILED`.
* **Image Fallback:** If any remote variety image fails to load, `VarietyGuide`, `ProductSection`, `PreorderSection`, and `TrackOrder` fall back to `/images/placeholder-mango.svg`.
* **Database WAL Mode:** The SQLite engine operates with `PRAGMA journal_mode = WAL;`, `PRAGMA foreign_keys = ON;`, and a 5000ms busy timeout for high-concurrency ACID transactions.

---

© 2026 Al Usmani Orchards (Private) Limited. All Rights Reserved.  
Shujabad Road, Multan, Punjab, Pakistan.
