import os
import json
import re

EXPENSE_CLASSIFICATION_SYSTEM_PROMPT = """
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
""".strip()

VENDOR_NORMALIZATION_SYSTEM_PROMPT = """
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
""".strip()

# Canonical Vendors Approved List
CANONICAL_VENDORS = [
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
]

def classify_expense_heuristic(description: str) -> dict:
    """Fallback heuristic classifier based on scoring keywords."""
    desc_lower = (description or "").lower()

    # Keywords maps
    cloud_kw = ["ec2", "s3", "aws", "azure", "gcp", "cloud", "rds", "lambda",
                "kubernetes", "docker", "server", "storage bucket", "cdn", "vpc", "infrastructure"]
    saas_kw  = ["zoom", "notion", "salesforce", "adobe", "slack", "github",
                "jira", "confluence", "figma", "subscription", "license", "renewal",
                "creative cloud", "workspace", "hubspot", "microsoft", "office 365", "google suite", "gsuite"]
    travel_kw = ["flight", "cab", "uber", "ola", "taxi", "hotel", "indigo",
                 "airline", "train", "bus", "transport", "airport", "travel",
                 "boarding", "rapido", "stay", "fare"]
    food_kw  = ["swiggy", "zomato", "meal", "lunch", "dinner", "catering",
                "restaurant", "food", "breakfast", "coffee", "tea", "starbucks", "eats"]
    hw_kw    = ["laptop", "monitor", "keyboard", "mouse", "webcam", "headset",
                "printer", "charger", "desk", "chair", "equipment", "device",
                "computer", "flipkart", "hardware", "peripheral", "macbook", "phone"]
    fin_kw   = ["razorpay", "stripe", "gateway", "payment fee", "bank",
                "wire transfer", "forex", "banking", "transaction fee", "processing fee", "charges"]
    pers_kw  = ["personal", "gym", "netflix", "amazon prime", "grocery",
                "hotstar", "spotify", "salon", "spa", "shopping", "movie",
                "cinema", "vacation", "holiday", "myntra", "ajio", "groceries"]

    def score(keywords):
        return sum(1 for kw in keywords if kw in desc_lower)

    scores = {
        "Cloud Infrastructure"  : score(cloud_kw),
        "SaaS Subscriptions"    : score(saas_kw),
        "Travel & Transport"    : score(travel_kw),
        "Meals & Catering"      : score(food_kw),
        "Hardware & Equipment"  : score(hw_kw),
        "Finance & Banking"     : score(fin_kw),
        "Personal Expense"      : score(pers_kw),
    }

    # Break ties in favor of Personal Expense
    if scores["Personal Expense"] > 0:
        scores["Personal Expense"] += 0.5

    best_cat = max(scores, key=scores.get)
    best_score = scores[best_cat]

    if best_score == 0:
        return {
            "category": "Miscellaneous",
            "confidence": 0.45,
            "reasoning": "No recognisable keywords matched any known expense category."
        }

    # Scale confidence: more keyword hits -> higher confidence
    confidence = min(0.95, 0.60 + best_score * 0.12)

    # Penalise ambiguity if second-best is close
    sorted_scores = sorted(scores.values(), reverse=True)
    if len(sorted_scores) > 1 and sorted_scores[1] >= best_score - 1 and best_score > 0:
        confidence = max(0.55, confidence - 0.18)

    reasoning_map = {
        "Cloud Infrastructure":  f"Description references cloud compute/storage terms ({', '.join(kw for kw in cloud_kw if kw in desc_lower)}).",
        "SaaS Subscriptions":    f"Description references a known SaaS product or subscription term ({', '.join(kw for kw in saas_kw if kw in desc_lower)}).",
        "Travel & Transport":    f"Description references travel or transport ({', '.join(kw for kw in travel_kw if kw in desc_lower)}).",
        "Meals & Catering":      f"Description references food/catering context ({', '.join(kw for kw in food_kw if kw in desc_lower)}).",
        "Hardware & Equipment":  f"Description references physical hardware or equipment ({', '.join(kw for kw in hw_kw if kw in desc_lower)}).",
        "Finance & Banking":     f"Description references financial services or payment processing ({', '.join(kw for kw in fin_kw if kw in desc_lower)}).",
        "Personal Expense":      f"Description contains personal-use indicators ({', '.join(kw for kw in pers_kw if kw in desc_lower)}).",
    }
    reasoning = reasoning_map.get(best_cat, "Matched by keyword heuristic.")

    # Reset score modifications for accurate confidence rounding
    return {
        "category": best_cat,
        "confidence": round(confidence, 2),
        "reasoning": reasoning
    }

def normalize_vendor_heuristic(vendor_raw: str) -> dict:
    """Fallback heuristic vendor normalizer mapping aliases to approved canonical list."""
    val = (vendor_raw or "").strip().lower()
    
    if not val:
        return {
            "canonical_vendor": "UNKNOWN",
            "confidence": 0.0,
            "reasoning": "Raw vendor name was blank or empty."
        }

    # Helper maps for direct substring matches
    mappings = [
        (["aws", "amazon web", "amazon cloud", "infra", "compute"], "Amazon Web Services"),
        (["uber", "ubr"], "Uber"),
        (["swiggy", "swigy"], "Swiggy"),
        (["zoom", "zoom.us"], "Zoom"),
        (["notion"], "Notion"),
        (["salesforce", "sfdc"], "Salesforce"),
        (["adobe", "creative cloud", "photoshop"], "Adobe"),
        (["razorpay", "rzp"], "Razorpay"),
        (["flipkart"], "Flipkart"),
        (["indigo", "interglobe"], "IndiGo")
    ]

    for keywords, canonical in mappings:
        for kw in keywords:
            if kw in val:
                return {
                    "canonical_vendor": canonical,
                    "confidence": 0.95 if kw == val else 0.85,
                    "reasoning": f"Raw vendor string contains alias clue '{kw}' mapped to canonical '{canonical}'."
                }

    return {
        "canonical_vendor": "UNKNOWN",
        "confidence": 0.50,
        "reasoning": f"No match found for vendor '{vendor_raw}' in approved canonical vendor list."
    }

def classify_expense(description: str, max_retries: int = 3) -> dict:
    """
    Classify an expense description using Anthropic Claude LLM if ANTHROPIC_API_KEY is configured,
    otherwise fall back to heuristic categorization.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return classify_expense_heuristic(description)

    # Attempt Live LLM API call
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        
        # Clean up description
        user_input = description or "Unknown expense"
        
        response = client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=200,
            system=EXPENSE_CLASSIFICATION_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_input}]
        )
        
        text_resp = response.content[0].text
        # Strip markdown code blocks if any
        if "```json" in text_resp:
            text_resp = text_resp.split("```json")[1].split("```")[0].strip()
        elif "```" in text_resp:
            text_resp = text_resp.split("```")[1].split("```")[0].strip()
        
        data = json.loads(text_resp.strip())
        
        # Ensure correct schema keys are present
        if "category" in data and "confidence" in data and "reasoning" in data:
            return {
                "category": str(data["category"]),
                "confidence": float(data["confidence"]),
                "reasoning": str(data["reasoning"])
            }
        raise ValueError("Response schema invalid")
    except Exception as e:
        # Fall back to heuristic classification if anything goes wrong
        return classify_expense_heuristic(description)

def normalize_vendor(vendor_raw: str, max_retries: int = 3) -> dict:
    """
    Normalize a raw vendor name to its canonical vendor name using Anthropic Claude LLM if ANTHROPIC_API_KEY is configured,
    otherwise fall back to heuristic normalization.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return normalize_vendor_heuristic(vendor_raw)

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        
        user_input = vendor_raw or "Unknown vendor"
        
        response = client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=200,
            system=VENDOR_NORMALIZATION_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_input}]
        )
        
        text_resp = response.content[0].text
        if "```json" in text_resp:
            text_resp = text_resp.split("```json")[1].split("```")[0].strip()
        elif "```" in text_resp:
            text_resp = text_resp.split("```")[1].split("```")[0].strip()
            
        data = json.loads(text_resp.strip())
        
        if "canonical_vendor" in data and "confidence" in data and "reasoning" in data:
            canonical = str(data["canonical_vendor"])
            # Ensure it is strictly on the canonical list or UNKNOWN
            if canonical in CANONICAL_VENDORS or canonical == "UNKNOWN":
                return {
                    "canonical_vendor": canonical,
                    "confidence": float(data["confidence"]),
                    "reasoning": str(data["reasoning"])
                }
        raise ValueError("Response schema invalid")
    except Exception as e:
        return normalize_vendor_heuristic(vendor_raw)

if __name__ == "__main__":
    print("--- Testing Python Expense Classifier Wrapper ---")
    test_descriptions = [
        "AWS EC2 reserved instances compute billing",
        "Zoom monthly webinar subscription",
        "Indigo flight ticket to Bangalore",
        "Swiggy lunch order for engineering team",
        "MacBook Pro 16-inch hardware lease",
        "Razorpay payment gateway fees",
        "Personal Netflix subscription monthly recharge",
        "Misc office stationary supplies payment"
    ]
    
    print("\n[Expense Classification Results]")
    for desc in test_descriptions:
        res = classify_expense(desc)
        print(f"Desc: '{desc}'")
        print(f"  -> Category: {res.get('category')} (Conf: {res.get('confidence')})")
        print(f"  -> Reasoning: {res.get('reasoning')}\n")

    test_vendors = [
        "AWS",
        "ZOOM VIDEO COMMUNICATIONS",
        "indigo airlines",
        "Uber rides monthly",
        "Swiggy delivery",
        "Razorpay software pvt ltd",
        "Flipkart India",
        "Random corner tea shop"
    ]

    print("\n[Vendor Alias Normalization Results]")
    for raw in test_vendors:
        res = normalize_vendor(raw)
        print(f"Raw: '{raw}'")
        print(f"  -> Canonical: {res.get('canonical_vendor')} (Conf: {res.get('confidence')})")
        print(f"  -> Reasoning: {res.get('reasoning')}\n")
