import sys
import os

# Add root folder to python path to import lib.classifier
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from lib.classifier import classify_expense, normalize_vendor, CANONICAL_VENDORS

CATEGORIES = [
    "Cloud Infrastructure",
    "SaaS Subscriptions",
    "Travel & Transport",
    "Meals & Catering",
    "Hardware & Equipment",
    "Finance & Banking",
    "Personal Expense",
    "Miscellaneous"
]

def test_expense_classification():
    print("Testing classify_expense()...")
    
    test_cases = [
        ("AWS EC2 instance billing for Q1 compute", "Cloud Infrastructure"),
        ("Monthly Zoom workspace communication license", "SaaS Subscriptions"),
        ("Uber cab ride to meeting at headquarters", "Travel & Transport"),
        ("Office team lunch Swiggy delivery invoice", "Meals & Catering"),
        ("Brand new developer laptop monitor screen replacement", "Hardware & Equipment"),
        ("Razorpay online processing fee invoice charges", "Finance & Banking"),
        ("Personal Netflix premium subscription renewal", "Personal Expense"),
        ("Stationary or random general office spend", "Miscellaneous"),
        ("", "Miscellaneous")  # Empty string test
    ]

    for desc, expected in test_cases:
        res = classify_expense(desc)
        print(f"Input: '{desc}'")
        print(f"Output: {res}")
        
        # Schema verification
        assert isinstance(res, dict), "Output must be a dictionary"
        assert "category" in res, "Missing 'category' in output"
        assert "confidence" in res, "Missing 'confidence' in output"
        assert "reasoning" in res, "Missing 'reasoning' in output"
        
        # Values verification
        assert res["category"] in CATEGORIES, f"Category '{res['category']}' not in canonical list"
        assert isinstance(res["confidence"], float), "Confidence must be a float"
        assert 0.0 <= res["confidence"] <= 1.0, f"Confidence {res['confidence']} not in [0.0, 1.0]"
        assert isinstance(res["reasoning"], str) and len(res["reasoning"]) > 0, "Reasoning must be a non-empty string"
        
        # Explicit Category match
        assert res["category"] == expected, f"Expected category '{expected}', but got '{res['category']}'"
        print("OK\n")

def test_vendor_normalization():
    print("Testing normalize_vendor()...")
    
    test_cases = [
        ("aws web services", "Amazon Web Services"),
        ("ZOOM.US COMMUNICATIONS", "Zoom"),
        ("interglobe aviation indigo", "IndiGo"),
        ("uber taxi rides", "Uber"),
        ("swiggy delivery app", "Swiggy"),
        ("razorpay fee", "Razorpay"),
        ("flipkart private limited", "Flipkart"),
        ("Unknown supplier 123", "UNKNOWN"),
        ("", "UNKNOWN")  # Empty/blank vendor name test
    ]

    for raw, expected in test_cases:
        res = normalize_vendor(raw)
        print(f"Raw: '{raw}'")
        print(f"Output: {res}")
        
        # Schema verification
        assert isinstance(res, dict), "Output must be a dictionary"
        assert "canonical_vendor" in res, "Missing 'canonical_vendor' in output"
        assert "confidence" in res, "Missing 'confidence' in output"
        assert "reasoning" in res, "Missing 'reasoning' in output"
        
        # Values verification
        assert res["canonical_vendor"] in CANONICAL_VENDORS or res["canonical_vendor"] == "UNKNOWN", \
            f"Canonical vendor '{res['canonical_vendor']}' not in canonical list or UNKNOWN"
        assert isinstance(res["confidence"], float), "Confidence must be a float"
        assert 0.0 <= res["confidence"] <= 1.0, f"Confidence {res['confidence']} not in [0.0, 1.0]"
        assert isinstance(res["reasoning"], str) and len(res["reasoning"]) > 0, "Reasoning must be a non-empty string"
        
        if expected != "UNKNOWN":
            assert res["canonical_vendor"] == expected, f"Expected {expected}, got {res['canonical_vendor']}"
            
        print("OK\n")

if __name__ == "__main__":
    try:
        test_expense_classification()
        test_vendor_normalization()
        print("[SUCCESS] All Python wrapper tests passed successfully!")
        sys.exit(0)
    except AssertionError as e:
        print(f"[ERROR] Test verification failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Unexpected error: {e}")
        sys.exit(1)
