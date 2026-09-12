import {
  searchProducts,
  checkProductAvailability,
  getCurrentPrice,
  getActiveOffers,
  getStoreInformation,
  getDeliveryInformation,
  getCustomerOrderStatus,
  ProductSearchResult
} from './tools';
import { searchKnowledgeBase, RAGSearchResult } from './rag';
import { formatPKR } from '@/lib/formatters';

export interface ChatProductCard {
  id: string;
  name: string;
  variety: string;
  package_size_id: string;
  package_name: string;
  weight_kg: number;
  price: number;
  original_price?: number | null;
  image_url: string;
  in_stock: boolean;
  available_stock: number;
  sweetness_brix: number;
}

export interface AgentChatResponse {
  answer: string;
  suggestedFollowUps: string[];
  products?: ChatProductCard[];
  sources?: string[];
}

/**
 * 1. Prompt Injection & Adversarial Defense Sanitizer
 */
export function validateAndSanitizePrompt(prompt: string): { isSafe: boolean; reason?: string } {
  const p = prompt.toLowerCase();

  const injectionPatterns = [
    /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
    /disregard\s+(all\s+)?(previous|prior)\s+directions/i,
    /system\s+prompt/i,
    /reveal\s+(your\s+)?(instructions|prompt|rules|keys)/i,
    /output\s+(your\s+)?(initial|hidden)\s+prompt/i,
    /what\s+are\s+your\s+(exact\s+)?instructions/i,
    /jailbreak/i,
    /dan\s+mode/i,
    /developer\s+mode\s+(on|enabled)/i,
    /you\s+are\s+now\s+an\s+unrestricted/i,
    /bypass\s+safety/i
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(p)) {
      return {
        isSafe: false,
        reason: 'I am OrchardBot, your dedicated royal mango concierge. I am strictly programmed to assist exclusively with Al Usmani Orchards cultivars, harvest schedules, live cold-chain logistics, and order support.'
      };
    }
  }

  return { isSafe: true };
}

/**
 * 2. Primary Grounded Agent Orchestrator
 */
export async function runOrchardAgent(
  userQuery: string,
  userContext?: {
    userId?: string;
    phoneOrEmail?: string;
  }
): Promise<AgentChatResponse> {
  try {
    // Step A: Safety check
    const safety = validateAndSanitizePrompt(userQuery);
  if (!safety.isSafe) {
    return {
      answer: safety.reason!,
      suggestedFollowUps: [
        'Which mango is sweetest?',
        'What is available in 10 KG?',
        'Which offer is active?'
      ]
    };
  }

  const query = userQuery.trim();
  const q = query.toLowerCase();

  // Step B: RAG Search across knowledge base
  const ragExcerpts: RAGSearchResult[] = searchKnowledgeBase(query, undefined, 3);
  const ragContext = ragExcerpts.map((d) => `[${d.category}]: ${d.title} - ${d.content}`).join('\n\n');

  // Step C: Intent Recognition & Tool Calling

  // 1. Order Tracking Check
  const orderRegex = /(AUO|MF|ORD)-\d{4}-\d+|\b\d{4,8}\b/i;
  const match = query.match(orderRegex);
  const isTrackingIntent = Boolean(match || q.includes('track') || q.includes('where is my order') || q.includes('consignment'));

  if (isTrackingIntent) {
    const orderNum = match ? match[0] : '';
    if (orderNum) {
      const orderData = getCustomerOrderStatus(orderNum, {
        phoneOrEmail: userContext?.phoneOrEmail,
        customerId: userContext?.userId
      });

      if (!orderData.found) {
        return {
          answer: `I could not locate consignment reference **${orderNum}** in our active dispatch ledger. Please verify the order number from your confirmation SMS or receipt, or connect with our Multan concierge on WhatsApp (+92 300 8472910).`,
          suggestedFollowUps: ['How do I track my order?', 'Do you deliver to Karachi?', 'Which offer is active?']
        };
      }

      if (!orderData.authorized) {
        return {
          answer: `🔐 **Order ${orderData.orderNumber} Located:**\n\n${orderData.error}\n\n*Tip: If you placed this order as a guest, please include your phone number (e.g., \`track ${orderData.orderNumber} 03001234567\`).*`,
          suggestedFollowUps: [`Track ${orderData.orderNumber} with my phone`, 'Contact WhatsApp Concierge']
        };
      }

      // Authorized order summary
      const itemsList = orderData.items?.map((it) => `• **${it.variety}** (${it.package} × ${it.quantity})`).join('\n') || '';
      const recentLog = orderData.timeline?.[0] ? `\n\n📍 **Latest Progress:** ${orderData.timeline[0].title} — ${orderData.timeline[0].description}` : '';

      return {
        answer: `📦 **Consignment Status for Order #${orderData.orderNumber}:**\n\n• **Status**: **${orderData.status}**\n• **Destination**: ${orderData.city}, Pakistan\n• **Carrier**: ${orderData.courierName} (Consignment #${orderData.trackingNumber})\n• **Total Amount**: ${orderData.totalAmount} (${orderData.paymentMethod} • ${orderData.paymentStatus})\n\n**Harvest Crates in Shipment:**\n${itemsList}${recentLog}\n\nAll consignments are foam-nested and transported in temperature-controlled logistics.`,
        suggestedFollowUps: ['Download PDF Invoice', 'What is the delivery estimate?', 'Browse more varieties']
      };
    } else {
      return {
        answer: `To check your real-time harvest consignment status, please share your order number (such as **AUO-10245** or **MF-2026-1021**), along with your delivery mobile number if ordered as a guest.`,
        suggestedFollowUps: ['Track order AUO-10245', 'Do you deliver to Lahore?']
      };
    }
  }

  // 2. Shipping & Delivery Intent
  const isShippingIntent = q.includes('ship') || q.includes('deliver') || q.includes('city') || q.includes('charges') || q.includes('tcs') || q.includes('rates') || q.includes('cod') || q.includes('lahore') || q.includes('karachi') || q.includes('islamabad');
  if (isShippingIntent && !q.includes('price') && !q.includes('stock')) {
    const delivery = getDeliveryInformation(query);
    const store = getStoreInformation();

    let cityNote = '';
    if (delivery.citySpecificEstimate) {
      cityNote = `\n\n🚚 **Transit Estimate for your location:**\n${delivery.citySpecificEstimate}`;
    }

    return {
      answer: `🚚 **Nationwide Cold-Chain Shipping & Delivery:**\n\n• **Punjab & Federal Capital**: ${delivery.timelines.punjabAndCapital} from dawn dispatch.\n• **Sindh & KPK**: ${delivery.timelines.sindhAndKPK} from dawn dispatch.\n• **Carrier Partners**: Handled via ${delivery.carriers.join(', ')}.\n• **Standard Freight**: ${delivery.deliveryRates.standardRate} (${delivery.deliveryRates.freeShippingThreshold}).\n• **Payment Methods**: Cash on Delivery (COD) accepted nationwide, as well as Direct Bank Transfer and Cards.${cityNote}\n\nAll boxes feature our signature individual foam netting and ventilated thermal cartons to guarantee zero pressure bruising.`,
      suggestedFollowUps: ['What packages are in stock?', 'Which mango is sweetest?', 'Which offer is active?'],
      sources: ragExcerpts.map((s) => s.title)
    };
  }

  // 3. Offers & Volume Savings Intent
  const isOfferIntent = q.includes('offer') || q.includes('discount') || q.includes('coupon') || q.includes('promo') || q.includes('deal') || q.includes('sale');
  if (isOfferIntent) {
    const offers = getActiveOffers();
    const couponText = offers.coupons.length > 0
      ? offers.coupons.map((c) => `• **${c.name}**: Use code \`${c.code}\` for **${c.discount}** (Min order: ${c.minOrder})`).join('\n')
      : '• Seasonal First Flush Promotion: Special pre-applied crate pricing.';

    const volumeText = offers.volumeDiscounts
      .map((v) => `• **${v.tier}**: **${v.discount}** (${v.note})`)
      .join('\n');

    return {
      answer: `✨ **Active Seasonal Promotions & Volume Rebates:**\n\n${couponText}\n\n🎁 **Tiered Crate Volume Discounts:**\n${volumeText}\n\nDiscounts are automatically calculated at checkout or when applying your coupon code.`,
      suggestedFollowUps: ['What is available in 10 KG?', 'Which mango is sweetest?', 'How do you ship?']
    };
  }

  // 4. Products, Sweetness (Brix), Packaging, and Recommendations
  // Tool invocation
  let detectedVariety: string | undefined = undefined;
  if (q.includes('chaunsa')) detectedVariety = 'chaunsa';
  else if (q.includes('sindhri')) detectedVariety = 'sindhri';
  else if (q.includes('ratol') || q.includes('anwar')) detectedVariety = 'anwar';
  else if (q.includes('dussehri') || q.includes('dasheri')) detectedVariety = 'dussehri';

  let detectedSize: string | undefined = undefined;
  if (q.includes('10 kg') || q.includes('10kg') || q.includes('10')) detectedSize = '10';
  else if (q.includes('5 kg') || q.includes('5kg') || q.includes('5')) detectedSize = '5';
  else if (q.includes('8 kg') || q.includes('8kg') || q.includes('8')) detectedSize = '8';

  const productsFound = searchProducts({
    variety: detectedVariety,
    packageSize: detectedSize
  });

  const cards: ChatProductCard[] = productsFound.slice(0, 4).map((p) => ({
    id: p.id,
    name: p.name,
    variety: p.variety,
    package_size_id: p.package_size_id,
    package_name: p.package_name,
    weight_kg: p.weight_kg,
    price: p.effective_price,
    original_price: p.sale_price !== null ? p.base_price : null,
    image_url: p.image_url,
    in_stock: p.in_stock,
    available_stock: p.available_stock,
    sweetness_brix: p.sweetness_brix
  }));

  // Check if Gemini API is available for natural synthesis
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (geminiApiKey) {
    try {
      const systemPrompt = `You are OrchardBot, the prestigious AI Concierge of Al Usmani Orchards (Multan, Pakistan).
You embody the elegance, refinement, and agricultural mastery of centuries-old Multani mango growers.
Rules:
1. Ground your knowledge ONLY in the provided RAG documents and database product facts.
2. Tone: Warm, regal, articulate, and deeply knowledgeable about Brix sugar levels, aroma notes, tree-ripening, and cold-chain care.
3. Currency: Always format in Pakistani Rupees (PKR or Rs.).
4. Guarantee: Emphasize 100% tree-ripened, zero calcium carbide, foam cushioning.
5. If recommending products, refer to the attached product options.
Keep responses concise (2-4 paragraphs maximum).`;

      const promptPayload = `User Question: "${query}"

RAG Knowledge Base Excerpts:
${ragContext || 'None'}

Current Real-time Products in Stock:
${JSON.stringify(productsFound.slice(0, 4), null, 2)}

Please provide a helpful, luxury response to the customer.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\n${promptPayload}` }]
              }
            ],
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 600
            }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const geminiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (geminiText) {
          return {
            answer: geminiText,
            suggestedFollowUps: [
              'What is available in 10 KG?',
              'Which mango is sweetest?',
              'What are the delivery charges?'
            ],
            products: cards.length > 0 ? cards : undefined,
            sources: ragExcerpts.map((s) => s.title)
          };
        }
      }
    } catch (llmErr) {
      console.warn('Gemini API call failed, falling back to deterministic agent:', llmErr);
    }
  }

  // Step D: Deterministic Fallback Engine
  // Sweetness / Brix comparison
  if (q.includes('sweet') || q.includes('brix') || q.includes('sugar') || q.includes('taste') || q.includes('flavor')) {
    const sweetnessList = [
      '• **Multani White Chaunsa**: **24°–26° Brix** — Unrivaled royal sweetness, intense honey-nectar fragrance, completely fiberless.',
      '• **Anwar Ratol**: **22°–24° Brix** — The aroma emperor with a rich, floral miniature profile.',
      '• **Sindhri**: **18°–20° Brix** — Majestic aromatic queen with a balanced sweet-tangy finish and radiant golden skin.',
      '• **Dussehri**: **19°–21° Brix** — Royal court favorite featuring delicate perfumed sweetness.'
    ].join('\n');

    return {
      answer: `🥭 **Sweetness & Flavor Comparison (Brix Index):**\n\nThe sweetest cultivar harvested at Al Usmani Orchards is **Multani White Chaunsa**, measuring up to **26° Brix** on refractometer testing.\n\n${sweetnessList}\n\nEvery crate is 100% tree-ripened on the branch without toxic calcium carbide acceleration.`,
      suggestedFollowUps: ['What packages are in stock?', 'Can I order a 10 KG Chaunsa crate?', 'What are the delivery charges?'],
      products: cards.length > 0 ? cards : undefined,
      sources: ragExcerpts.map((s) => s.title)
    };
  }

  // Stock / Packages / Available query
  if (cards.length > 0) {
    const productList = cards
      .map((c) => `• **${c.variety} — ${c.package_name}** (${c.weight_kg} KG): **${formatPKR(c.price)}** ${c.in_stock ? `(${c.available_stock} crates available in cold store)` : '(Temporarily Sold Out)'}`)
      .join('\n');

    return {
      answer: `Here are our current harvest packages directly from our Multan cold storage:\n\n${productList}\n\nEach crate is packed in our custom-ventilated, cushioned luxury export cartons to prevent bruising in transit. You can add them directly to your order below:`,
      suggestedFollowUps: ['Which mango is sweetest?', 'Which offer is active?', 'Do you deliver to Karachi?'],
      products: cards,
      sources: ragExcerpts.map((s) => s.title)
    };
  }

  // Default helpful welcome / consultation
  return {
    answer: `Welcome to **Al Usmani Orchards**! I am your dedicated Orchard Concierge.\n\nI can assist you with:\n• **Varietal Comparisons**: Sweetness (Brix 18°–26°), flavor profiles, and harvest flushes for Chaunsa, Sindhri, and Anwar Ratol.\n• **Live Stock & Packages**: Available crates in 5 KG, 8 KG, and 10 KG.\n• **Protected Order Tracking**: Real-time status of your harvest consignments.\n• **Cold-Chain Logistics**: Nationwide delivery timelines and transit care.\n\nWhat would you like to explore today?`,
    suggestedFollowUps: [
      'Which mango is sweetest?',
      'What is available in 10 KG?',
      'Which offer is active?',
      'Do you deliver to Lahore?'
    ],
    sources: ragExcerpts.map((s) => s.title)
  };
  } catch (agentErr) {
    console.warn('[AI_AGENT] Unexpected error handled safely:', agentErr);
    return {
      answer: 'Welcome to **Al Usmani Orchards**! I am your dedicated Orchard Concierge. Our groves are actively harvesting premium Multani White Chaunsa, Sindhri, and Anwar Ratol. How may I assist your order today?',
      suggestedFollowUps: [
        'Which mango is sweetest?',
        'What is available in 10 KG?',
        'Which offer is active?'
      ]
    };
  }
}
