# Al Usmani Orchards — Security Engineering & Hardening

**Brand:** Al Usmani Orchards  
**Scope:** Vulnerability Mitigations, Single-Owner Policy, IDOR Prevention, and Edge Defense.

---

## 1. Single-Owner Administrative Model

To prevent unauthorized privilege escalation and ensure complete organizational isolation:

1. **Owner Authority**: The single owner is designated by the server environment variable `ADMIN_OWNER_EMAIL` (defaulting to `admin@alusmaniorchards.pk`).
2. **Strict Public Registration Defense**: The public customer registration endpoint (`POST /api/auth/register`) strictly sets `role = 'CUSTOMER'`. Any registration attempt targeting `ADMIN_OWNER_EMAIL` is explicitly rejected with `400 Bad Request` to prevent account hijacking.
3. **No Public Admin Links for Visitors**: The storefront header, footer, and navigation menus display no administrative ERP links or indicators to unauthenticated guests or customer users.
4. **Removal of Public Demo Logins**: Cleartext demonstration credentials and 1-click login buttons have been completely eradicated from the public login screen (`/login`). All administrative access occurs through standard authenticated credentials.

---

## 2. Insecure Direct Object Reference (IDOR) Defenses

### Customer Address Isolation
* **Vulnerability Mitigated**: Previously, `DELETE /api/account/addresses?id=...` executed deletion without scoping to customer ownership. An authenticated attacker could enumerate address IDs and delete arbitrary addresses.
* **Production Fix**: All address operations (`GET`, `POST`, `PUT`, `DELETE`) resolve the customer profile from the verified server session and strictly enforce customer identity:
  ```sql
  -- Deletion
  DELETE FROM customer_addresses WHERE id = ? AND customer_id = ?;
  
  -- Update
  UPDATE customer_addresses SET ... WHERE id = ? AND customer_id = ?;
  ```
  If zero rows are affected, the API responds with `403 Forbidden` or `404 Not Found`.

### Customer Order Isolation
* Customer order queries (`GET /api/account/orders`) query strictly by the authenticated customer ID or verified patron email:
  ```sql
  WHERE (o.customer_id = ? OR LOWER(o.guest_email) = ?)
  ```
* Individual order queries by `orderNumber` append customer ownership conditions to ensure cross-account order inspection is impossible.

### Public Tracking Sanitization
* The public tracking lookup endpoint (`GET /api/orders/track?q=...`) exposes only non-sensitive consignment milestones, courier tracking IDs, and destination city. It omits full residential addresses, recipient telephone numbers, and customer notes.

---

## 3. Server & Edge Route Protection (`src/middleware.ts`)

Edge Middleware intercepts requests before they hit page rendering or API routes:

| Route Path | Security Requirement | Unauthorized Behavior | Edge Response Headers |
|---|---|---|---|
| `/admin/:path*` | Active session with `role === 'SUPER_ADMIN'` (or authorized staff role) | Redirects to `/login?redirect=/admin` (guests) or `/account?error=Access+Restricted` (customers) | `X-Robots-Tag: noindex, nofollow, noarchive`<br>`X-Frame-Options: DENY`<br>`X-Content-Type-Options: nosniff` |
| `/account/:path*` | Active session with any authenticated role | Redirects to `/login?redirect=/account` | `X-Robots-Tag: noindex, nofollow` |
| `/login` | Public | Allows authentication | Default |
| Storefront routes | Public | Served cleanly | Default |

---

## 4. Role-Based Access Control (RBAC) Matrix

| Resource | SUPER_ADMIN | FINANCE_MANAGER | INVENTORY_MANAGER | CUSTOMER |
|---|:---:|:---:|:---:|:---:|
| **Executive Overview** | Full Access | No | No | No |
| **Orders & Fulfillment** | Full Access | Read-Only | Read-Only | Own Orders |
| **Courier Tracking** | Full Access | Read-Only | Read-Only | Public/Own |
| **Orchard Products & Varieties** | Full Access | Read-Only | Full Access | Read-Only Catalog |
| **Inventory & Batches** | Full Access | No | Full Access | No |
| **P&L / Finance** | Full Access | Full Access | No | No |
| **Store Settings** | Full Access | No | No | No |
| **Audit Logs** | Full Access | Read-Only | No | No |

---

## 5. Audit Logging (`admin_audit_logs`)

All administrative actions (order status changes, dispatch assignments, inventory adjustments, variety photo updates, store settings modifications) record an immutable entry into `admin_audit_logs`:
- `user_id`, `user_email`
- `action` (e.g., `ORDER_DISPATCH_ASSIGNED`, `STORE_SETTINGS_UPDATED`)
- `resource_type`, `resource_id`
- `ip_address`
- `created_at` timestamp
