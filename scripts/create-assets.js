const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const imgDir = path.join(publicDir, 'images');
const courierDir = path.join(imgDir, 'couriers');

if (!fs.existsSync(courierDir)) {
  fs.mkdirSync(courierDir, { recursive: true });
}

// 1. PLACEHOLDER SVG
const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#092115" />
      <stop offset="50%" stop-color="#113824" />
      <stop offset="100%" stop-color="#06170E" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE68A" />
      <stop offset="50%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#B45309" />
    </linearGradient>
    <linearGradient id="mangoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FBBF24" />
      <stop offset="60%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>
    <pattern id="orchardGrid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#F59E0B" stroke-width="0.5" stroke-opacity="0.08" />
    </pattern>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.5" />
    </filter>
  </defs>

  <rect width="800" height="600" fill="url(#bgGrad)" />
  <rect width="800" height="600" fill="url(#orchardGrid)" />

  <rect x="30" y="30" width="740" height="540" rx="16" fill="none" stroke="url(#goldGrad)" stroke-width="1.5" stroke-opacity="0.4" />
  <rect x="40" y="40" width="720" height="520" rx="12" fill="none" stroke="#F59E0B" stroke-width="0.5" stroke-opacity="0.2" stroke-dasharray="6,4" />

  <path d="M 30 60 L 60 30" stroke="url(#goldGrad)" stroke-width="2" />
  <path d="M 770 60 L 740 30" stroke="url(#goldGrad)" stroke-width="2" />
  <path d="M 30 540 L 60 570" stroke="url(#goldGrad)" stroke-width="2" />
  <path d="M 770 540 L 740 570" stroke="url(#goldGrad)" stroke-width="2" />

  <g filter="url(#shadow)">
    <circle cx="400" cy="220" r="85" fill="#0D2E1D" stroke="url(#goldGrad)" stroke-width="2.5" />
    <circle cx="400" cy="220" r="76" fill="none" stroke="#F59E0B" stroke-width="1" stroke-dasharray="3,3" stroke-opacity="0.6" />

    <path d="M 405 160 C 420 145 440 148 442 165 C 425 168 412 165 405 160 Z" fill="#34D399" />
    <path d="M 405 160 Q 425 158 442 165" stroke="#065F46" stroke-width="1.2" fill="none" />
    <path d="M 398 168 Q 403 162 405 160" stroke="#78350F" stroke-width="2.5" stroke-linecap="round" />

    <path d="M 395 168 C 365 175 345 205 348 238 C 352 270 382 288 412 285 C 445 280 462 250 458 220 C 452 185 415 165 395 168 Z" fill="url(#mangoGrad)" stroke="#B45309" stroke-width="1.5" />
    <path d="M 368 200 C 362 215 365 240 375 255" fill="none" stroke="#FEF3C7" stroke-width="3" stroke-linecap="round" stroke-opacity="0.6" />
  </g>

  <g text-anchor="middle">
    <text x="400" y="360" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="800" fill="#F59E0B" letter-spacing="4">
      ESTD. 1934 • MULTAN
    </text>

    <text x="400" y="400" font-family="Georgia, serif" font-size="34" font-weight="900" fill="#FFFFFF" letter-spacing="2">
      AL USMANI ORCHARDS
    </text>

    <line x1="260" y1="422" x2="380" y2="422" stroke="url(#goldGrad)" stroke-width="1.5" stroke-opacity="0.7" />
    <polygon points="400,417 405,422 400,427 395,422" fill="#F59E0B" />
    <line x1="420" y1="422" x2="540" y2="422" stroke="url(#goldGrad)" stroke-width="1.5" stroke-opacity="0.7" />

    <text x="400" y="460" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" fill="#FDE68A" letter-spacing="3">
      IMAGE COMING SOON
    </text>

    <text x="400" y="495" font-family="Georgia, serif" font-size="15" font-style="italic" fill="#E2E8F0" fill-opacity="0.8">
      "From Our Orchards to Your Door."
    </text>

    <text x="400" y="525" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="500" fill="#94A3B8">
      Fresh from Our Orchards • Premium Pakistani Mangoes • Delivered with Care
    </text>
  </g>
</svg>`;

fs.writeFileSync(path.join(imgDir, 'placeholder-mango.svg'), placeholderSvg);

// 2. TCS SVG
const tcsSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" width="100%" height="100%">
  <rect width="200" height="60" rx="8" fill="#E11D48" />
  <text x="100" y="40" font-family="Impact, Arial Black, sans-serif" font-size="32" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="3">TCS</text>
  <text x="100" y="52" font-family="sans-serif" font-size="8" font-weight="700" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">EXPRESS COLD-CHAIN</text>
</svg>`;
fs.writeFileSync(path.join(courierDir, 'tcs.svg'), tcsSvg);

// 3. LEOPARDS SVG
const leopardsSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" width="100%" height="100%">
  <rect width="200" height="60" rx="8" fill="#F59E0B" />
  <text x="100" y="38" font-family="Arial Black, Impact, sans-serif" font-size="24" font-weight="900" fill="#111827" text-anchor="middle" letter-spacing="1">LEOPARDS</text>
  <text x="100" y="50" font-family="sans-serif" font-size="8" font-weight="800" fill="#111827" text-anchor="middle" letter-spacing="1">COURIER SERVICES</text>
</svg>`;
fs.writeFileSync(path.join(courierDir, 'leopards.svg'), leopardsSvg);

// 4. M&P SVG
const mpSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" width="100%" height="100%">
  <rect width="200" height="60" rx="8" fill="#1E3A8A" />
  <text x="100" y="39" font-family="Impact, Arial Black, sans-serif" font-size="28" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="2">M &amp; P</text>
  <text x="100" y="52" font-family="sans-serif" font-size="8" font-weight="700" fill="#93C5FD" text-anchor="middle" letter-spacing="1">EXPRESS LOGISTICS</text>
</svg>`;
fs.writeFileSync(path.join(courierDir, 'mp.svg'), mpSvg);

// 5. PAKPOST SVG
const pakpostSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" width="100%" height="100%">
  <rect width="200" height="60" rx="8" fill="#047857" />
  <text x="100" y="38" font-family="Arial Black, Impact, sans-serif" font-size="22" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">PAK POST</text>
  <text x="100" y="50" font-family="sans-serif" font-size="8" font-weight="700" fill="#A7F3D0" text-anchor="middle" letter-spacing="1">UMS URGENT MAIL</text>
</svg>`;
fs.writeFileSync(path.join(courierDir, 'pakpost.svg'), pakpostSvg);

console.log('All vector assets created successfully.');
