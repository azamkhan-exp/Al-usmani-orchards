import fs from 'node:fs';
import path from 'node:path';
import { getDatabase } from '../db';
import { ensureDatabaseReady } from '../db/init';
import { getAdminSecuritySettings } from './otp.service';
import { getProductionProtectionSettings } from './data-management.service';
import { getWhatsAppConfig } from './whatsapp.service';

export interface HealthCheckResult {
  timestamp: string;
  system: {
    node_version: string;
    platform: string;
    uptime_seconds: number;
  };
  subsystems: {
    database: {
      status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
      integrity: string;
      size_mb: number;
      journal_mode: string;
      tables_count: number;
      total_orders: number;
    };
    security: {
      status: 'HEALTHY' | 'WARN';
      admin_otp_enabled: boolean;
      verified_security_phone: string;
      active_admin_sessions: number;
      super_admins_count: number;
    };
    whatsapp: {
      status: 'HEALTHY' | 'SIMULATED' | 'DISABLED' | 'MISCONFIGURED';
      provider: string;
      enabled: boolean;
      phone_id_configured: boolean;
      token_configured: boolean;
      admin_phone: string;
    };
    payments: {
      status: 'HEALTHY' | 'WARN';
      active_methods: string[];
      pending_verifications: number;
    };
    ai_service: {
      status: 'HEALTHY' | 'WARN';
      gemini_key_configured: boolean;
      knowledge_docs_count: number;
    };
    storage: {
      status: 'HEALTHY';
      product_images_count: number;
    };
  };
  launch_checklist: {
    score_percentage: number;
    passed_count: number;
    warning_count: number;
    failed_count: number;
    items: Array<{
      id: string;
      title: string;
      category: 'SECURITY' | 'DATABASE' | 'PAYMENTS' | 'CATALOG' | 'COMMUNICATIONS' | 'OPERATIONS';
      status: 'PASS' | 'WARN' | 'FAIL';
      description: string;
      recommendation?: string;
    }>;
  };
}

export function performSystemHealthCheck(): HealthCheckResult {
  ensureDatabaseReady();
  const db = getDatabase();

  // 1. Database Diagnostic
  let integrity = 'ok';
  try {
    const row = db.prepare('PRAGMA integrity_check').get() as { integrity_check: string };
    integrity = row?.integrity_check || 'ok';
  } catch (e: any) {
    integrity = e.message || 'error';
  }

  let journalMode = 'wal';
  try {
    const jRow = db.prepare('PRAGMA journal_mode').get() as { journal_mode: string };
    journalMode = jRow?.journal_mode || 'wal';
  } catch {}

  const dbPath = path.resolve(process.cwd(), 'data', 'shahi_orchards.db');
  let dbSizeMb = 0;
  if (fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    dbSizeMb = Math.round((stats.size / (1024 * 1024)) * 100) / 100;
  }

  const tableCountRow = db.prepare("SELECT count(*) as c FROM sqlite_master WHERE type='table'").get() as any;
  const tableCount = tableCountRow?.c || 0;

  const orderCountRow = db.prepare('SELECT count(*) as c FROM orders').get() as any;
  const totalOrders = orderCountRow?.c || 0;

  // 2. Security Diagnostic
  const secSettings = getAdminSecuritySettings();
  const activeSessionsRow = db.prepare("SELECT count(*) as c FROM user_sessions WHERE expires_at > datetime('now')").get() as any;
  const activeSessions = activeSessionsRow?.c || 0;

  const superAdminsRow = db.prepare("SELECT count(*) as c FROM users WHERE role = 'SUPER_ADMIN' AND status = 'ACTIVE'").get() as any;
  const superAdminCount = superAdminsRow?.c || 0;

  // 3. WhatsApp Diagnostic
  const waConfig = getWhatsAppConfig();
  const waStatus: 'HEALTHY' | 'SIMULATED' | 'DISABLED' | 'MISCONFIGURED' = !waConfig.enabled
    ? 'DISABLED'
    : waConfig.provider === 'SIMULATED'
    ? 'SIMULATED'
    : waConfig.accessToken && waConfig.phoneNumberId
    ? 'HEALTHY'
    : 'MISCONFIGURED';

  // 4. Payments Diagnostic
  const activePmRows = db.prepare("SELECT code FROM payment_methods WHERE is_enabled = 1").all() as Array<{ code: string }>;
  const activeMethods = activePmRows.map(r => r.code);

  const pendingVerificationRow = db.prepare("SELECT count(*) as c FROM orders WHERE payment_status = 'AWAITING_VERIFICATION'").get() as any;
  const pendingVerifications = pendingVerificationRow?.c || 0;

  // 5. AI Service Diagnostic
  const geminiKey = !!process.env.GEMINI_API_KEY;
  const knowledgeDocsRow = db.prepare("SELECT count(*) as c FROM ai_knowledge_documents WHERE is_active = 1").get() as any;
  const knowledgeDocsCount = knowledgeDocsRow?.c || 0;

  // 6. Storage & Catalog Diagnostic
  const imagesRow = db.prepare("SELECT count(*) as c FROM product_images").get() as any;
  const imagesCount = imagesRow?.c || 0;

  const activeProductsRow = db.prepare("SELECT count(*) as c FROM products WHERE status = 'ACTIVE'").get() as any;
  const activeProducts = activeProductsRow?.c || 0;

  const stockRows = db.prepare("SELECT count(*) as c FROM inventory WHERE available_stock > 0").get() as any;
  const inStockVariants = stockRows?.c || 0;

  const prodProtection = getProductionProtectionSettings();

  const demoOrdersRow = db.prepare("SELECT count(*) as c FROM orders WHERE is_demo = 1").get() as any;
  const demoOrdersCount = demoOrdersRow?.c || 0;

  const deliveryZonesRow = db.prepare("SELECT count(*) as c FROM delivery_zones WHERE is_active = 1").get() as any;
  const activeZones = deliveryZonesRow?.c || 0;

  const auditLogsRow = db.prepare("SELECT count(*) as c FROM admin_audit_logs").get() as any;
  const auditLogsCount = auditLogsRow?.c || 0;

  // 16-POINT LAUNCH READINESS CHECKLIST
  const checklistItems: HealthCheckResult['launch_checklist']['items'] = [
    {
      id: 'chk_db_integrity',
      title: 'Database Structural Integrity',
      category: 'DATABASE',
      status: integrity === 'ok' ? 'PASS' : 'FAIL',
      description: 'Verifies zero corruption in SQLite tables, B-trees, and indexes.',
      recommendation: integrity === 'ok' ? undefined : 'Run PRAGMA integrity_check and re-index database.'
    },
    {
      id: 'chk_db_wal',
      title: 'High-Concurrency WAL Journaling',
      category: 'DATABASE',
      status: journalMode.toLowerCase() === 'wal' ? 'PASS' : 'WARN',
      description: 'Write-Ahead Logging provides lock-free concurrency for storefront traffic.',
      recommendation: journalMode.toLowerCase() === 'wal' ? undefined : 'Enable PRAGMA journal_mode = WAL in database configuration.'
    },
    {
      id: 'chk_super_admin',
      title: 'Active Super Administrator Account',
      category: 'SECURITY',
      status: superAdminCount >= 1 ? 'PASS' : 'FAIL',
      description: 'Ensures authoritative access control for store operations.',
      recommendation: superAdminCount >= 1 ? undefined : 'Create at least one active Super Admin account.'
    },
    {
      id: 'chk_security_phone',
      title: 'Verified Security Phone Number',
      category: 'SECURITY',
      status: secSettings.verified_security_phone ? 'PASS' : 'FAIL',
      description: 'Primary channel for out-of-band administrative OTPs and emergency alerts.',
      recommendation: secSettings.verified_security_phone ? undefined : 'Configure a verified administrator mobile phone.'
    },
    {
      id: 'chk_admin_otp',
      title: 'Admin Multi-Factor Authentication (OTP)',
      category: 'SECURITY',
      status: secSettings.admin_otp_enabled ? 'PASS' : 'WARN',
      description: 'Guards admin logins with 6-digit cryptographic verification codes.',
      recommendation: secSettings.admin_otp_enabled ? undefined : 'Enable Admin OTP in Security Settings.'
    },
    {
      id: 'chk_production_lock',
      title: 'Production Mode Safety Lock',
      category: 'OPERATIONS',
      status: prodProtection.enabled ? 'PASS' : 'WARN',
      description: 'Prevents accidental data deletion and destructive operations during live operations.',
      recommendation: prodProtection.enabled ? undefined : 'Enable Production Protection Lock before official launch.'
    },
    {
      id: 'chk_session_security',
      title: 'HMAC Tamper-Proof Sessions',
      category: 'SECURITY',
      status: process.env.SESSION_SECRET ? 'PASS' : 'WARN',
      description: 'Cryptographic SHA-256 HMAC signature on all browser session cookies.',
      recommendation: process.env.SESSION_SECRET ? undefined : 'Define SESSION_SECRET in production environment.'
    },
    {
      id: 'chk_audit_logging',
      title: 'Authoritative Audit Trail Active',
      category: 'SECURITY',
      status: auditLogsCount > 0 ? 'PASS' : 'WARN',
      description: 'Immutable record of logins, order status changes, and administrative actions.',
      recommendation: auditLogsCount > 0 ? undefined : 'Perform administrative action to initialize audit logs.'
    },
    {
      id: 'chk_payment_methods',
      title: 'Payment Gateway Configuration',
      category: 'PAYMENTS',
      status: activeMethods.length >= 2 ? 'PASS' : 'WARN',
      description: 'Customer payment channels (COD, Bank Transfer, EasyPaisa, JazzCash, Card).',
      recommendation: activeMethods.length >= 2 ? undefined : 'Enable at least Cash on Delivery and Direct Bank Transfer.'
    },
    {
      id: 'chk_pending_payments',
      title: 'Payment Verification Queue',
      category: 'PAYMENTS',
      status: pendingVerifications <= 5 ? 'PASS' : 'WARN',
      description: 'Pending manual transfer receipts awaiting administrator verification.',
      recommendation: pendingVerifications > 5 ? `${pendingVerifications} orders awaiting verification in Finance.` : undefined
    },
    {
      id: 'chk_active_products',
      title: 'Published Mango Products',
      category: 'CATALOG',
      status: activeProducts >= 3 ? 'PASS' : 'WARN',
      description: 'Sufficient published mango varieties ready for online purchase.',
      recommendation: activeProducts >= 3 ? undefined : 'Publish at least 3 signature mango varieties before opening.'
    },
    {
      id: 'chk_inventory_levels',
      title: 'Stock Allocation & Inventory Readiness',
      category: 'CATALOG',
      status: inStockVariants >= 3 ? 'PASS' : 'WARN',
      description: 'Inventory variants with available stock ready for dispatch.',
      recommendation: inStockVariants >= 3 ? undefined : 'Update stock counts for seasonal harvest packages.'
    },
    {
      id: 'chk_delivery_zones',
      title: 'Cold-Chain Delivery Zones & Rates',
      category: 'OPERATIONS',
      status: activeZones >= 1 ? 'PASS' : 'FAIL',
      description: 'Nationwide shipping rates and city delivery coverage configured.',
      recommendation: activeZones >= 1 ? undefined : 'Add at least one active delivery zone in Store Settings.'
    },
    {
      id: 'chk_whatsapp_api',
      title: 'WhatsApp Business API Connectivity',
      category: 'COMMUNICATIONS',
      status: waStatus === 'HEALTHY' ? 'PASS' : waStatus === 'SIMULATED' ? 'WARN' : 'FAIL',
      description: 'Automated order confirmation, dispatch alerts, and OTP dispatch via WhatsApp.',
      recommendation: waStatus === 'HEALTHY' ? undefined : 'Supply production Meta WhatsApp Business Cloud credentials.'
    },
    {
      id: 'chk_ai_rag',
      title: 'AI Sommelier Knowledge Base (RAG)',
      category: 'OPERATIONS',
      status: knowledgeDocsCount >= 5 ? 'PASS' : 'WARN',
      description: 'Knowledge documents grounding AI recommendations in orchard terroir.',
      recommendation: knowledgeDocsCount >= 5 ? undefined : 'Seed AI knowledge documents with variety profiles.'
    },
    {
      id: 'chk_demo_data_status',
      title: 'Clean Production Launch Environment',
      category: 'OPERATIONS',
      status: demoOrdersCount === 0 ? 'PASS' : 'WARN',
      description: 'Separation of pre-launch test orders from live customer revenue.',
      recommendation: demoOrdersCount === 0 ? undefined : `${demoOrdersCount} demo order(s) tagged. Review or purge in Data Management before launch.`
    }
  ];

  const passedCount = checklistItems.filter(i => i.status === 'PASS').length;
  const warnCount = checklistItems.filter(i => i.status === 'WARN').length;
  const failCount = checklistItems.filter(i => i.status === 'FAIL').length;
  const scorePercent = Math.round((passedCount / checklistItems.length) * 100);

  return {
    timestamp: new Date().toISOString(),
    system: {
      node_version: process.version,
      platform: process.platform,
      uptime_seconds: Math.round(process.uptime())
    },
    subsystems: {
      database: {
        status: integrity === 'ok' ? 'HEALTHY' : 'DEGRADED',
        integrity,
        size_mb: dbSizeMb,
        journal_mode: journalMode,
        tables_count: tableCount,
        total_orders: totalOrders
      },
      security: {
        status: secSettings.admin_otp_enabled ? 'HEALTHY' : 'WARN',
        admin_otp_enabled: secSettings.admin_otp_enabled,
        verified_security_phone: secSettings.verified_security_phone,
        active_admin_sessions: activeSessions,
        super_admins_count: superAdminCount
      },
      whatsapp: {
        status: waStatus,
        provider: waConfig.provider,
        enabled: waConfig.enabled,
        phone_id_configured: !!waConfig.phoneNumberId,
        token_configured: !!waConfig.accessToken,
        admin_phone: waConfig.adminNotificationNumber
      },
      payments: {
        status: activeMethods.length >= 2 ? 'HEALTHY' : 'WARN',
        active_methods: activeMethods,
        pending_verifications: pendingVerifications
      },
      ai_service: {
        status: geminiKey && knowledgeDocsCount > 0 ? 'HEALTHY' : 'WARN',
        gemini_key_configured: geminiKey,
        knowledge_docs_count: knowledgeDocsCount
      },
      storage: {
        status: 'HEALTHY',
        product_images_count: imagesCount
      }
    },
    launch_checklist: {
      score_percentage: scorePercent,
      passed_count: passedCount,
      warning_count: warnCount,
      failed_count: failCount,
      items: checklistItems
    }
  };
}
