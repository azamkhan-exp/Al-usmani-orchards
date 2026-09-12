# Al Usmani Orchards — System Architecture & Data Engineering

**Brand:** Al Usmani Orchards (Estd. 1934 • Multan & Mirpur Khas)  
**Positioning:** *Fresh from Our Orchards • Premium Pakistani Mangoes • Naturally Grown • Delivered with Care*  
**Tagline:** *“From Our Orchards to Your Door.”*  

---

## 1. High-Level System Architecture

Al Usmani Orchards is architected as an enterprise-grade direct-to-consumer (D2C) e-commerce and orchard ERP operations engine built on modern full-stack web standards:

* **Framework:** Next.js 16.3.4 with Turbopack compilation.
* **Execution Boundary:** Edge Runtime for route interception and security headers (`src/middleware.ts`), Node.js Serverless runtime for authoritative API transactions.
* **Database Layer:** SQLite with Write-Ahead Logging (`WAL`) enabled for high-concurrency read/write transactions (`node:sqlite`).
* **Session Engine:** Cryptographically signed HMAC-SHA256 session tokens with dual-layer verification (Edge signature validation + server-side revocation tracking).
* **Identity Architecture:** OpenID Connect (OIDC) with multi-provider `accounts` linking and single-owner administrative authorization.
* **Email Pipeline:** Non-blocking asynchronous transactional email dispatch with audit logging.

```mermaid
graph TD
    Client[Web Browser / Mobile Client] --> Edge[Next.js Edge Middleware]
    Edge -->|Valid Admin HMAC| AdminApp[/admin ERP Command Center]
    Edge -->|Valid Patron HMAC| AccountApp[/account Patron Portal]
    Edge -->|Public Traffic| StoreApp[/ Public Storefront & Catalog]
    Edge -->|Invalid / Unauthorized| LoginRedirect[/login?redirect=...]

    AdminApp --> APILayer[Authoritative API Handlers]
    AccountApp --> APILayer
    StoreApp --> APILayer

    APILayer --> DB[(SQLite Database Engine - WAL Mode)]
    APILayer --> EmailService[Resilient Email Dispatcher]
    APILayer --> GoogleOIDC[Google OAuth 2.0 / OIDC API]
    EmailService --> NotificationLogs[(notification_logs)]
```

---

## 2. Entity-Relationship Schema

The database schema models the agricultural harvest lifecycle, customer identity, multi-provider accounts, and logistics tracking:

```mermaid
erDiagram
    users ||--o{ accounts : "authenticates via"
    users ||--o{ user_sessions : "maintains"
    users ||--o| customers : "owns profile"
    customers ||--o{ customer_addresses : "maintains"
    customers ||--o{ orders : "places"
    mango_varieties ||--o{ products : "classified into"
    products ||--o{ package_sizes : "packaged into"
    orders ||--o{ order_items : "contains"
    orders ||--o{ order_timeline : "logs progress"
    couriers ||--o{ orders : "dispatches"
    couriers ||--o{ shipments : "carries"

    users {
        text id PK
        text name
        text email UK
        text password_hash
        text role
        text phone
        text avatar_url
        int email_verified
        text last_login_at
        text status
    }

    accounts {
        text id PK
        text user_id FK
        text provider
        text provider_account_id
        text access_token
        text refresh_token
        int expires_at
        text created_at
    }

    customers {
        text id PK
        text user_id FK
        text full_name
        text email UK
        text phone
        text city
        text segment
        real total_spent
        int orders_count
        text referral_code UK
    }

    customer_addresses {
        text id PK
        text customer_id FK
        text label
        text recipient_name
        text phone
        text street_address
        text area
        text city
        text province
        text postal_code
        int is_default
    }

    orders {
        text id PK
        text order_number UK
        text customer_id FK
        text guest_email
        text status
        real subtotal
        real discount_amount
        real shipping_fee
        real total_amount
        text payment_method
        text payment_status
        text courier_id FK
        text tracking_number
    }
```

---

## 3. Order Lifecycle & State Machine

Every order placed via `/checkout` is authoritatively computed and validated on the server. Pricing, discount promotions, and delivery tariffs cannot be manipulated on the client.

```mermaid
stateDiagram-v2
    [*] --> CONFIRMED: Checkout Placement (AUO-10245+)
    CONFIRMED --> PROCESSING: Dawn-Harvest Allocation Queued
    PROCESSING --> PACKED: Graded & Foam-Padded
    PACKED --> READY_FOR_DISPATCH: Cold-Hub Pre-cooling
    READY_FOR_DISPATCH --> SHIPPED: Courier Handover (TCS / Leopards / M&P)
    SHIPPED --> OUT_FOR_DELIVERY: Local Delivery Van
    OUT_FOR_DELIVERY --> DELIVERED: Handed to Patron
    DELIVERED --> [*]
```

### State Definitions & Trigger Events
1. **`CONFIRMED`**: Initial status generated immediately upon order submission. Eliminates administrative bottlenecks while guaranteeing sequence numbering (`AUO-XXXXX`). Triggers asynchronous order confirmation email.
2. **`PROCESSING`**: Assigned orchard crew schedules harvest for optimum fruit Brix sweetness.
3. **`PACKED`**: Mangos are hydro-cooled, individually foam-sleeved, and nested into corrugated gift boxes.
4. **`READY_FOR_DISPATCH`**: Boxes staged at climate-controlled hub.
5. **`SHIPPED`**: Consignment handed over to courier partner. Courier assigned (`TCS`, `Leopards`, `M&P`, `Pakistan Post`), tracking number issued, and automated dispatch email sent to customer.
6. **`OUT_FOR_DELIVERY`**: Courier vehicle is en route to recipient.
7. **`DELIVERED`**: Order received. Cash-on-delivery (COD) reconciled into accounts receivable.

---

## 4. Cold-Chain Courier Integration

Four major Pakistani logistics networks are integrated with custom vector emblems and standardized tracking URLs:

| Courier Partner | Code | Logo Asset | Tracking URL Template |
|---|---|---|---|
| **TCS Express** | `tcs` | `/images/couriers/tcs.svg` | `https://www.tcsexpress.com/tracking?consignmentNo={tracking}` |
| **Leopards Courier** | `leopards` | `/images/couriers/leopards.svg` | `https://www.leopardscourier.com/leopards-tracking?track={tracking}` |
| **M&P Express Logistics** | `mp` | `/images/couriers/mp.svg` | `https://mulphilog.com/tracking?cn={tracking}` |
| **Pakistan Post UMS** | `pakpost` | `/images/couriers/pakpost.svg` | `https://ep.gov.pk/tracking?track={tracking}` |

The public tracking page (`/track-order`) sanitizes sensitive recipient PII (phone number and complete residential address remain private) while presenting real-time milestone progress, courier details, and direct carrier portal navigation.

---

## 5. Resilient Transactional Notifications

Customer checkout operations are isolated from third-party email latency or SMTP downtime:
- All emails are dispatched asynchronously after database transaction commit.
- In environments where SMTP credentials are not yet configured, the system logs a `SIMULATED` record to `notification_logs`.
- If an SMTP connection times out or fails, the failure is logged and the customer checkout completes successfully without interruption.
