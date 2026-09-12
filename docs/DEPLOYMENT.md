# Al Usmani Orchards — Production Deployment Guide

**Brand:** Al Usmani Orchards  
**Scope:** Vercel Hosting, Google Cloud Console OAuth Setup, Environment Variables, and Maintenance.

---

## 1. Environment Configuration

Copy `.env.example` to `.env.local` for local development or set the variables in the Vercel project settings dashboard.

| Variable Name | Required | Default / Description |
|---|:---:|---|
| `SESSION_SECRET` | **Yes** | Minimum 32-character random key for HMAC-SHA256 session token signatures. |
| `ADMIN_OWNER_EMAIL` | **Yes** | `admin@alusmaniorchards.pk` — The authoritative single owner receiving `SUPER_ADMIN` privileges. |
| `NEXT_PUBLIC_APP_URL` | **Yes** | `https://alusmaniorchards.pk` (or `http://localhost:3000` in dev). |
| `GOOGLE_CLIENT_ID` | Optional* | OAuth 2.0 Client ID from Google Cloud Console. |
| `GOOGLE_CLIENT_SECRET` | Optional* | OAuth 2.0 Client Secret from Google Cloud Console. |
| `SMTP_HOST` | Optional | SMTP host for transactional emails (e.g. `smtp.resend.com` or `smtp.gmail.com`). |
| `SMTP_PORT` | Optional | `587` or `465`. |
| `SMTP_USER` | Optional | SMTP username. |
| `SMTP_PASSWORD` | Optional | SMTP password or App Password. |
| `SMTP_FROM_EMAIL` | Optional | `orders@alusmaniorchards.pk`. |

*\*Note: If Google credentials are not set, password authentication continues to work normally and Google Sign-In displays an informative configuration notice.*

---

## 2. Google Cloud Console OAuth Setup

To enable Google Sign-In for patrons and the owner:

1. Visit [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project: `al-usmani-orchards`.
3. Navigate to **APIs & Services** → **OAuth consent screen**:
   - User Type: **External**.
   - App Name: **Al Usmani Orchards**.
   - User Support Email: `harvest@alusmaniorchards.pk`.
   - Authorized Domains: Add your root domain (e.g. `alusmaniorchards.pk` or `vercel.app`).
   - Scopes: `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`.
4. Navigate to **APIs & Services** → **Credentials**:
   - Click **Create Credentials** → **OAuth client ID**.
   - Application type: **Web application**.
   - Name: `Al Usmani Orchards Web Client`.
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (development)
     - `https://alusmaniorchards.pk` (production)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/google/callback`
     - `https://alusmaniorchards.pk/api/auth/google/callback`
5. Copy the generated **Client ID** and **Client Secret** into your Vercel Environment Variables.

---

## 3. Vercel Deployment Instructions

1. Push your repository to GitHub / GitLab:
   ```bash
   git add .
   git commit -m "feat: production architecture, Google OIDC, and security hardening"
   git push origin main
   ```
2. In the Vercel Dashboard, import the repository.
3. Framework Preset: **Next.js**.
4. Configure Environment Variables:
   - `SESSION_SECRET`: Generate with `openssl rand -hex 32`.
   - `ADMIN_OWNER_EMAIL`: `admin@alusmaniorchards.pk`.
   - `NEXT_PUBLIC_APP_URL`: Your Vercel deployment URL or custom domain.
   - `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`.
5. Deploy. Turbopack will automatically build and optimize the 37+ routes.

---

## 4. Production Verification Checklist

- [ ] Run `npx tsc --noEmit` locally to confirm 0 TypeScript compile errors.
- [ ] Run `npm run build` locally to confirm a clean build with Turbopack.
- [ ] Confirm `/admin` automatically redirects to `/login` when visited in an Incognito window.
- [ ] Verify that `/login` has no cleartext passwords or demo account buttons.
- [ ] Sign in with the administrator account and verify full ERP access.
- [ ] Sign in with a customer account and verify access to `/account` with strict denial from `/admin`.
- [ ] Test placing an order and verify sequential numbering starting at `AUO-10245+`.
- [ ] Test tracking the order at `/track-order?q=AUO-10245` and ensure personal customer information is protected.
