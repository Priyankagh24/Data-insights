export const EXPENSE_CLASSIFICATION_SYSTEM_PROMPT = `
You are an enterprise expense classification engine for an AI-native ERP platform.

Your task is to classify a single expense description into exactly one of the
following categories:

  1. Cloud Infrastructure   — Cloud compute, storage, networking, managed services
                              (e.g., AWS EC2, GCP buckets, Azure VMs, RDS, S3)
  2. SaaS Subscriptions     — Third-party software licenses and subscription renewals
                              (e.g., Zoom, Notion, Salesforce, Adobe, Slack, GitHub)
  3. Travel & Transport     — Flights, cab rides, hotels, ground transport for business
                              (e.g., IndiGo, Uber, Ola, train tickets, hotel stay)
  4. Meals & Catering       — Team meals, client entertainment, event catering
                              (e.g., Swiggy, Zomato, restaurant bills, office lunch)
  5. Hardware & Equipment   — Physical devices, peripherals, office equipment
                              (e.g., laptops, monitors, keyboards, webcams, chairs)
  6. Finance & Banking      — Payment gateway fees, banking charges, disbursement costs
                              (e.g., Razorpay fees, Stripe charges, wire transfer fees)
  7. Personal Expense       — Non-business personal expenses, not reimbursable
                              (e.g., gym, Netflix, grocery, personal travel, salon)
  8. Miscellaneous          — Does not fit any of the above categories

RULES:
- Always return valid JSON only. No prose, no markdown, no explanation outside JSON.
- If the description is ambiguous, assign the most probable category and lower
  the confidence score accordingly.
- Confidence must be between 0.0 (completely uncertain) and 1.0 (completely certain).
- The "reasoning" field must explain which specific words or phrases drove the decision.

RESPONSE FORMAT (strictly follow this JSON schema):
{
  "category": "<one of the 8 categories above>",
  "confidence": <float between 0.0 and 1.0>,
  "reasoning": "<one sentence explaining the classification decision>"
}

EXAMPLES:

Input: "AWS EC2 reserved instances Q2 compute"
Output: {
  "category": "Cloud Infrastructure",
  "confidence": 0.97,
  "reasoning": "EC2 and reserved instances are core AWS compute products."
}

Input: "Zoom annual subscription — 100 hosts"
Output: {
  "category": "SaaS Subscriptions",
  "confidence": 0.96,
  "reasoning": "Zoom is a SaaS video-conferencing platform; annual subscription is a license renewal."
}

Input: "Personal gym membership monthly fee"
Output: {
  "category": "Personal Expense",
  "confidence": 0.99,
  "reasoning": "Explicitly labeled 'personal' and 'gym membership' is a non-business personal expense."
}

Input: "Swiggy order for team event"
Output: {
  "category": "Meals & Catering",
  "confidence": 0.91,
  "reasoning": "Swiggy is a food delivery platform; 'team event' confirms business meal context."
}

Input: "Misc office supplies vendor payment"
Output: {
  "category": "Miscellaneous",
  "confidence": 0.61,
  "reasoning": "No specific product or service category identifiable from description."
}
`.trim();

export const VENDOR_NORMALIZATION_SYSTEM_PROMPT = `
You are a vendor alias resolution engine for an enterprise ERP data migration pipeline.

Your task is to map a raw vendor name string to its canonical name from the
following approved vendor list:

  - Amazon Web Services
  - Uber
  - Swiggy
  - Zoom
  - Notion
  - Salesforce
  - Adobe
  - Razorpay
  - Flipkart
  - IndiGo

RULES:
- Match based on semantic meaning, common aliases, abbreviations, and typos.
- If the raw value clearly refers to one of the vendors above, return that canonical name.
- If no match is possible, return "UNKNOWN".
- Always return valid JSON only.

RESPONSE FORMAT:
{
  "canonical_vendor": "<canonical name or UNKNOWN>",
  "confidence": <float between 0.0 and 1.0>,
  "reasoning": "<one sentence explaining why this mapping was chosen>"
}

EXAMPLES:

Input: "AWS"
Output: {"canonical_vendor": "Amazon Web Services", "confidence": 0.99, "reasoning": "AWS is the universally recognised abbreviation for Amazon Web Services."}

Input: "ZOOM VIDEO COMMUNICATIONS"
Output: {"canonical_vendor": "Zoom", "confidence": 0.98, "reasoning": "Zoom Video Communications is Zoom's full legal entity name."}

Input: "indigo airlines"
Output: {"canonical_vendor": "IndiGo", "confidence": 0.97, "reasoning": "IndiGo Airlines is the operating brand of InterGlobe Aviation (IndiGo)."}

Input: "random local vendor"
Output: {"canonical_vendor": "UNKNOWN", "confidence": 0.95, "reasoning": "No match found in the approved canonical vendor list."}
`.trim();

export const CANONICAL_VENDORS = [
  "Amazon Web Services",
  "Uber",
  "Swiggy",
  "Zoom",
  "Notion",
  "Salesforce",
  "Adobe",
  "Razorpay",
  "Flipkart",
  "IndiGo"
];

export interface ClassificationResult {
  category: string;
  confidence: number;
  reasoning: string;
}

export interface NormalizationResult {
  canonical_vendor: string;
  confidence: number;
  reasoning: string;
}

export function classifyExpenseHeuristic(description: string): ClassificationResult {
  const descLower = (description || "").toLowerCase();

  const cloudKw = ["ec2", "s3", "aws", "azure", "gcp", "cloud", "rds", "lambda",
                   "kubernetes", "docker", "server", "storage bucket", "cdn", "vpc", "infrastructure"];
  const saasKw  = ["zoom", "notion", "salesforce", "adobe", "slack", "github",
                   "jira", "confluence", "figma", "subscription", "license", "renewal",
                   "creative cloud", "workspace", "hubspot", "microsoft", "office 365", "google suite", "gsuite"];
  const travelKw = ["flight", "cab", "uber", "ola", "taxi", "hotel", "indigo",
                    "airline", "train", "bus", "transport", "airport", "travel",
                    "boarding", "rapido", "stay", "fare"];
  const foodKw  = ["swiggy", "zomato", "meal", "lunch", "dinner", "catering",
                   "restaurant", "food", "breakfast", "coffee", "tea", "starbucks", "eats"];
  const hwKw    = ["laptop", "monitor", "keyboard", "mouse", "webcam", "headset",
                   "printer", "charger", "desk", "chair", "equipment", "device",
                   "computer", "flipkart", "hardware", "peripheral", "macbook", "phone"];
  const finKw   = ["razorpay", "stripe", "gateway", "payment fee", "bank",
                   "wire transfer", "forex", "banking", "transaction fee", "processing fee", "charges"];
  const persKw  = ["personal", "gym", "netflix", "amazon prime", "grocery",
                   "hotstar", "spotify", "salon", "spa", "shopping", "movie",
                   "cinema", "vacation", "holiday", "myntra", "ajio", "groceries"];

  const score = (keywords: string[]) => keywords.filter(kw => descLower.includes(kw)).length;

  const scores: Record<string, number> = {
    "Cloud Infrastructure"  : score(cloudKw),
    "SaaS Subscriptions"    : score(saasKw),
    "Travel & Transport"    : score(travelKw),
    "Meals & Catering"      : score(foodKw),
    "Hardware & Equipment"  : score(hwKw),
    "Finance & Banking"     : score(finKw),
    "Personal Expense"      : score(persKw),
  };

  // Break ties in favor of Personal Expense
  if (scores["Personal Expense"] > 0) {
    scores["Personal Expense"] += 0.5;
  }

  let bestCat = "Miscellaneous";
  let bestScore = 0;
  for (const cat in scores) {
    if (scores[cat] > bestScore) {
      bestScore = scores[cat];
      bestCat = cat;
    }
  }

  if (bestScore === 0) {
    return {
      category: "Miscellaneous",
      confidence: 0.45,
      reasoning: "No recognisable keywords matched any known expense category."
    };
  }

  let confidence = Math.min(0.95, 0.60 + bestScore * 0.12);

  const sortedScores = Object.values(scores).sort((a, b) => b - a);
  if (sortedScores.length > 1 && sortedScores[1] >= bestScore - 1 && bestScore > 0) {
    confidence = Math.max(0.55, confidence - 0.18);
  }

  const cloudMatches = cloudKw.filter(kw => descLower.includes(kw));
  const saasMatches = saasKw.filter(kw => descLower.includes(kw));
  const travelMatches = travelKw.filter(kw => descLower.includes(kw));
  const foodMatches = foodKw.filter(kw => descLower.includes(kw));
  const hwMatches = hwKw.filter(kw => descLower.includes(kw));
  const finMatches = finKw.filter(kw => descLower.includes(kw));
  const persMatches = persKw.filter(kw => descLower.includes(kw));

  const reasoningMap: Record<string, string> = {
    "Cloud Infrastructure":  `Description references cloud compute/storage terms (${cloudMatches.join(", ")}).`,
    "SaaS Subscriptions":    `Description references a known SaaS product or subscription term (${saasMatches.join(", ")}).`,
    "Travel & Transport":    `Description references travel or transport (${travelMatches.join(", ")}).`,
    "Meals & Catering":      `Description references food/catering context (${foodMatches.join(", ")}).`,
    "Hardware & Equipment":  `Description references physical hardware or equipment (${hwMatches.join(", ")}).`,
    "Finance & Banking":     `Description references financial services or payment processing (${finMatches.join(", ")}).`,
    "Personal Expense":      `Description contains personal-use indicators (${persMatches.join(", ")}).`,
  };
  const reasoning = reasoningMap[bestCat] || "Matched by keyword heuristic.";

  return {
    category: bestCat,
    confidence: Math.round(confidence * 100) / 100,
    reasoning
  };
}

export function normalizeVendorHeuristic(vendorRaw: string): NormalizationResult {
  const val = (vendorRaw || "").trim().toLowerCase();

  if (!val) {
    return {
      canonical_vendor: "UNKNOWN",
      confidence: 0.0,
      reasoning: "Raw vendor name was blank or empty."
    };
  }

  const mappings: [string[], string][] = [
    [["aws", "amazon web", "amazon cloud", "infra", "compute"], "Amazon Web Services"],
    [["uber", "ubr"], "Uber"],
    [["swiggy", "swigy"], "Swiggy"],
    [["zoom", "zoom.us"], "Zoom"],
    [["notion"], "Notion"],
    [["salesforce", "sfdc"], "Salesforce"],
    [["adobe", "creative cloud", "photoshop"], "Adobe"],
    [["razorpay", "rzp"], "Razorpay"],
    [["flipkart"], "Flipkart"],
    [["indigo", "interglobe"], "IndiGo"]
  ];

  for (const [keywords, canonical] of mappings) {
    for (const kw of keywords) {
      if (val.includes(kw)) {
        return {
          canonical_vendor: canonical,
          confidence: kw === val ? 0.95 : 0.85,
          reasoning: `Raw vendor string contains alias clue '${kw}' mapped to canonical '${canonical}'.`
        };
      }
    }
  }

  return {
    canonical_vendor: "UNKNOWN",
    confidence: 0.50,
    reasoning: `No match found for vendor '${vendorRaw}' in approved canonical vendor list.`
  };
}

export async function classifyExpense(description: string): Promise<ClassificationResult> {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    return classifyExpenseHeuristic(description);
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 200,
        system: EXPENSE_CLASSIFICATION_SYSTEM_PROMPT,
        messages: [{ role: "user", content: description || "Unknown expense" }]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API returned status ${response.status}`);
    }

    const data = await response.json() as any;
    let textResp = data.content?.[0]?.text || "";
    
    if (textResp.includes("```json")) {
      textResp = textResp.split("```json")[1].split("```")[0].trim();
    } else if (textResp.includes("```")) {
      textResp = textResp.split("```")[1].split("```")[0].trim();
    }

    const parsed = JSON.parse(textResp.trim());
    if (parsed.category && typeof parsed.confidence === "number" && parsed.reasoning) {
      return {
        category: String(parsed.category),
        confidence: Number(parsed.confidence),
        reasoning: String(parsed.reasoning)
      };
    }
    throw new Error("Invalid schema structure returned by LLM");
  } catch (err) {
    return classifyExpenseHeuristic(description);
  }
}

export async function normalizeVendor(vendorRaw: string): Promise<NormalizationResult> {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    return normalizeVendorHeuristic(vendorRaw);
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 200,
        system: VENDOR_NORMALIZATION_SYSTEM_PROMPT,
        messages: [{ role: "user", content: vendorRaw || "Unknown vendor" }]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API returned status ${response.status}`);
    }

    const data = await response.json() as any;
    let textResp = data.content?.[0]?.text || "";
    
    if (textResp.includes("```json")) {
      textResp = textResp.split("```json")[1].split("```")[0].trim();
    } else if (textResp.includes("```")) {
      textResp = textResp.split("```")[1].split("```")[0].trim();
    }

    const parsed = JSON.parse(textResp.trim());
    if (parsed.canonical_vendor && typeof parsed.confidence === "number" && parsed.reasoning) {
      const canonical = String(parsed.canonical_vendor);
      if (CANONICAL_VENDORS.includes(canonical) || canonical === "UNKNOWN") {
        return {
          canonical_vendor: canonical,
          confidence: Number(parsed.confidence),
          reasoning: String(parsed.reasoning)
        };
      }
    }
    throw new Error("Invalid schema structure returned by LLM");
  } catch (err) {
    return normalizeVendorHeuristic(vendorRaw);
  }
}
