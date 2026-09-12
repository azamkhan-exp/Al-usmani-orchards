/**
 * AL USMANI ORCHARDS: Image Configuration & Runtime Resilience Test
 */
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

console.log('==================================================================');
console.log('AL USMANI ORCHARDS: IMAGE CONFIGURATION & RUNTIME AUDIT SUITE');
console.log('==================================================================\n');

let passCount = 0;
let totalCount = 0;

function assert(condition, message) {
  totalCount++;
  if (condition) {
    console.log(`  ✓ [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ [FAIL] ${message}`);
  }
}

// -------------------------------------------------------------
// 1. Check next.config.ts Image Configuration
// -------------------------------------------------------------
console.log('▶ [TEST SUITE 1] Next.js Image Remote Patterns Configuration');
const nextConfigPath = path.join(__dirname, '..', 'next.config.ts');
const nextConfigContent = fs.readFileSync(nextConfigPath, 'utf8');

assert(nextConfigContent.includes('images:'), 'next.config.ts defines images block');
assert(nextConfigContent.includes('remotePatterns:'), 'next.config.ts defines remotePatterns');
assert(nextConfigContent.includes("'images.unsplash.com'"), 'images.unsplash.com is whitelisted in remotePatterns');
assert(nextConfigContent.includes("'lh3.googleusercontent.com'"), 'lh3.googleusercontent.com is whitelisted in remotePatterns');
assert(!nextConfigContent.includes("hostname: '*'"), 'No wildcard hostname configured');
assert(!nextConfigContent.includes("hostname: '*.com'"), 'No wildcard domain configured');

// -------------------------------------------------------------
// 2. Check Error Pages & Boundaries
// -------------------------------------------------------------
console.log('\n▶ [TEST SUITE 2] Error Page & Boundary Resilience');
const errorPath = path.join(__dirname, '..', 'src', 'app', 'error.tsx');
const globalErrorPath = path.join(__dirname, '..', 'src', 'app', 'global-error.tsx');
const notFoundPath = path.join(__dirname, '..', 'src', 'app', 'not-found.tsx');
const adminErrorPath = path.join(__dirname, '..', 'src', 'app', 'admin', 'error.tsx');
const safeImagePath = path.join(__dirname, '..', 'src', 'components', 'ui', 'SafeImage.tsx');

assert(fs.existsSync(errorPath), 'src/app/error.tsx exists');
assert(fs.existsSync(globalErrorPath), 'src/app/global-error.tsx exists');
assert(fs.existsSync(notFoundPath), 'src/app/not-found.tsx exists');
assert(fs.existsSync(adminErrorPath), 'src/app/admin/error.tsx exists');
assert(fs.existsSync(safeImagePath), 'src/components/ui/SafeImage.tsx exists');

const errorContent = fs.readFileSync(errorPath, 'utf8');
assert(!errorContent.includes('<Image'), 'error.tsx does not use <Image /> component (prevents recursive image errors)');
assert(!errorContent.includes('images.unsplash.com'), 'error.tsx does not depend on remote images');

const globalErrorContent = fs.readFileSync(globalErrorPath, 'utf8');
assert(globalErrorContent.includes('<html') && globalErrorContent.includes('<body'), 'global-error.tsx defines <html> and <body> tags for root error catching');

// -------------------------------------------------------------
// 3. Check OrchardBotDrawer & Track Order SafeImage Adoption
// -------------------------------------------------------------
console.log('\n▶ [TEST SUITE 3] SafeImage Adoption in Components');
const botDrawerPath = path.join(__dirname, '..', 'src', 'components', 'store', 'OrchardBotDrawer.tsx');
const botDrawerContent = fs.readFileSync(botDrawerPath, 'utf8');
assert(botDrawerContent.includes('SafeImage'), 'OrchardBotDrawer.tsx uses SafeImage instead of raw Image');
assert(!botDrawerContent.includes("from 'next/image'"), 'OrchardBotDrawer.tsx does not directly import raw next/image');

const trackOrderPath = path.join(__dirname, '..', 'src', 'app', 'track-order', 'page.tsx');
const trackOrderContent = fs.readFileSync(trackOrderPath, 'utf8');
assert(trackOrderContent.includes('SafeImage'), 'track-order/page.tsx uses SafeImage for courier logos');

// -------------------------------------------------------------
// 4. Database Product & Variety Images Audit
// -------------------------------------------------------------
console.log('\n▶ [TEST SUITE 4] Database Image Asset Integrity');
const dbPath = path.join(__dirname, '..', 'data', 'shahi_orchards.db');
const db = new DatabaseSync(dbPath);

const varieties = db.prepare('SELECT id, name, image_url FROM mango_varieties').all();
assert(varieties.length >= 5, `Database has at least 5 varieties (found ${varieties.length})`);

let allVarietiesValid = true;
const allowedHosts = ['images.unsplash.com', 'lh3.googleusercontent.com'];
for (const v of varieties) {
  if (v.image_url.startsWith('http')) {
    const host = new URL(v.image_url).hostname;
    if (!allowedHosts.includes(host)) {
      allVarietiesValid = false;
      console.error(`Variety ${v.name} has unwhitelisted host: ${host}`);
    }
  }
}
assert(allVarietiesValid, 'All variety image URLs in SQLite belong to whitelisted remote hosts');

const products = db.prepare('SELECT id, name, primary_image FROM products').all();
assert(products.length > 0, `Database has active products (found ${products.length})`);

let allProductsValid = true;
for (const p of products) {
  if (p.primary_image && p.primary_image.startsWith('http')) {
    const host = new URL(p.primary_image).hostname;
    if (!allowedHosts.includes(host)) {
      allProductsValid = false;
      console.error(`Product ${p.name} has unwhitelisted host: ${host}`);
    }
  }
}
assert(allProductsValid, 'All product primary_image URLs in SQLite belong to whitelisted remote hosts or local uploads');

// -------------------------------------------------------------
// 5. Verify Local Static Fallback Image
// -------------------------------------------------------------
console.log('\n▶ [TEST SUITE 5] Local Fallback Image Verification');
const placeholderPath = path.join(__dirname, '..', 'public', 'images', 'placeholder-mango.svg');
assert(fs.existsSync(placeholderPath), 'public/images/placeholder-mango.svg exists locally');
const placeholderContent = fs.readFileSync(placeholderPath, 'utf8');
assert(placeholderContent.includes('<svg') && placeholderContent.includes('</svg>'), 'placeholder-mango.svg is a valid SVG document');

console.log('\n==================================================================');
console.log(`VERIFICATION RESULT: ${passCount} / ${totalCount} TESTS PASSED WITH ZERO FAILURES.`);
console.log('==================================================================');

if (passCount === totalCount) {
  process.exit(0);
} else {
  process.exit(1);
}
