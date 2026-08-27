import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const rawToken = process.env.EBAY_SANDBOX_USER_TOKEN || process.env.EBAY_ACCESS_TOKEN || process.env.EBAY_TOKEN || "";
const cleanToken = rawToken.trim().replace(/^["']/, "").replace(/["']$/, "").trim();

const isPresent = Boolean(cleanToken);
const tokenLen = cleanToken.length;
const tokenPrefix = isPresent ? cleanToken.substring(0, 10) : "NONE";
const tokenSuffix = isPresent ? cleanToken.substring(Math.max(0, tokenLen - 6)) : "NONE";

const SANDBOX_BASE = "https://api.sandbox.ebay.com";
const ACCOUNT_API_BASE = `${SANDBOX_BASE}/sell/account/v1`;
const INVENTORY_API_BASE = `${SANDBOX_BASE}/sell/inventory/v1`;

function maskToken(str: string): string {
  if (!str) return "NOT CONFIGURED";
  return `${str.substring(0, 8)}...***MASKED***`;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitizeError(err: any): string {
  const status = err.response?.status;
  const statusText = err.response?.statusText || "";
  const ebayErrList = err.response?.data?.errors || [];
  const ebayErrMsg = ebayErrList.map((e: any) => `[ID: ${e.errorId}] ${e.message} (${e.domain || "OAuth"})`).join("; ");

  let detail = `HTTP ${status || "UNKNOWN"} ${statusText}`;
  if (ebayErrMsg) {
    detail += ` -> ${ebayErrMsg}`;
  } else if (err.message) {
    detail += ` -> ${err.message}`;
  }

  if (cleanToken && cleanToken.length > 5) {
    const escaped = escapeRegex(cleanToken);
    detail = detail.replace(new RegExp(escaped, "g"), "***MASKED***");
  }

  return detail;
}

if (!isPresent) {
  console.log("⚠️  EBAY_SANDBOX_USER_TOKEN is not set in backend/.env.");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${cleanToken}`,
  "Content-Type": "application/json",
  "Content-Language": "en-US",
};

async function runDiagnostic() {
  console.log("\n===========================================================");
  console.log("             EBAY SANDBOX CONFIGURATION VERIFIER           ");
  console.log("===========================================================");
  console.log(`Token Status:            Valid & Present (${tokenLen} chars)`);
  console.log(`Token Prefix:            ${tokenPrefix}...`);
  console.log(`Target Environment:      SANDBOX (${SANDBOX_BASE})`);
  console.log("===========================================================\n");

  let sellerRegistrationCompleted: boolean | string = "UNKNOWN";
  let fulfillmentPolicyId = "";
  let paymentPolicyId = "";
  let returnPolicyId = "";
  let merchantLocationKey = "";

  // 1. Privilege & Registration Check
  console.log("--- 1. Checking Seller Registration Privilege ---");
  try {
    const privilegeRes = await axios.get(`${ACCOUNT_API_BASE}/privilege`, { headers, timeout: 10000 });
    sellerRegistrationCompleted = Boolean(privilegeRes.data?.sellerRegistrationCompleted);
    console.log(`PASS: Account Privileges Retrieved. sellerRegistrationCompleted = ${sellerRegistrationCompleted}`);
  } catch (err: any) {
    console.log(`FAIL: Seller Privilege Query -> ${sanitizeError(err)}`);
  }

  // 2. Query Payment Policy
  console.log("\n--- 2. Checking Payment Policies (EBAY_US) ---");
  try {
    const res = await axios.get(`${ACCOUNT_API_BASE}/payment_policy?marketplace_id=EBAY_US`, { headers, timeout: 10000 });
    const policies = res.data?.paymentPolicies || [];
    if (policies.length > 0) {
      paymentPolicyId = policies[0].paymentPolicyId;
      console.log(`PASS: Found existing Payment Policy ID: ${paymentPolicyId} ("${policies[0].name}")`);
    } else {
      console.log("No payment policy found.");
    }
  } catch (err: any) {
    console.log(`FAIL: Payment Policy Query -> ${sanitizeError(err)}`);
  }

  // 3. Query Return Policy
  console.log("\n--- 3. Checking Return Policies (EBAY_US) ---");
  try {
    const res = await axios.get(`${ACCOUNT_API_BASE}/return_policy?marketplace_id=EBAY_US`, { headers, timeout: 10000 });
    const policies = res.data?.returnPolicies || [];
    if (policies.length > 0) {
      returnPolicyId = policies[0].returnPolicyId;
      console.log(`PASS: Found existing Return Policy ID: ${returnPolicyId} ("${policies[0].name}")`);
    } else {
      console.log("No return policy found.");
    }
  } catch (err: any) {
    console.log(`FAIL: Return Policy Query -> ${sanitizeError(err)}`);
  }

  // 4. Query & Create Fulfillment Policy
  console.log("\n--- 4. Checking Fulfillment Policies (EBAY_US) ---");
  try {
    const res = await axios.get(`${ACCOUNT_API_BASE}/fulfillment_policy?marketplace_id=EBAY_US`, { headers, timeout: 10000 });
    const policies = res.data?.fulfillmentPolicies || [];
    if (policies.length > 0) {
      fulfillmentPolicyId = policies[0].fulfillmentPolicyId;
      console.log(`PASS: Found existing Fulfillment Policy ID: ${fulfillmentPolicyId} ("${policies[0].name}")`);
    } else {
      console.log("Fulfillment policy count is 0. Attempting policy creation...");
      const createBody = {
        name: "Multichannel Test Fulfillment",
        marketplaceId: "EBAY_US",
        categoryTypes: [{ name: "ALL_EXCLUDING_MOTORS_AND_FEEDS" }],
        shippingOptions: [
          {
            optionType: "DOMESTIC",
            costType: "FLAT_RATE",
            shippingServices: [
              {
                shippingServiceCode: "USPSPriority",
                shippingCost: { value: "5.00", currency: "USD" },
              },
            ],
          },
        ],
      };
      try {
        const createRes = await axios.post(`${ACCOUNT_API_BASE}/fulfillment_policy`, createBody, { headers, timeout: 10000 });
        fulfillmentPolicyId = createRes.data?.fulfillmentPolicyId;
        console.log(`PASS: Created new Fulfillment Policy ID: ${fulfillmentPolicyId}`);
      } catch (createErr: any) {
        console.log(`FAIL: Fulfillment Policy Creation Rejected -> ${sanitizeError(createErr)}`);
      }
    }
  } catch (err: any) {
    console.log(`FAIL: Fulfillment Policy Query -> ${sanitizeError(err)}`);
  }

  // 5. Query & Create Inventory Location
  console.log("\n--- 5. Checking Merchant Inventory Locations ---");
  try {
    const res = await axios.get(`${INVENTORY_API_BASE}/location?limit=5`, { headers, timeout: 10000 });
    const locations = res.data?.locations || [];

    if (locations.length > 0) {
      merchantLocationKey = locations[0].merchantLocationKey;
      console.log(`PASS: Found existing Merchant Location Key: ${merchantLocationKey} ("${locations[0].name || "Warehouse"}")`);
    } else {
      console.log("No inventory location found. Attempting to create MULTICHANNEL_TEST_LOCATION...");
      const locationKey = "MULTICHANNEL_TEST_LOCATION";
      const locationBody = {
        location: {
          address: {
            addressLine1: "2055 Hamilton Ave",
            city: "San Jose",
            stateOrProvince: "CA",
            postalCode: "95125",
            country: "US",
          },
        },
        locationInstructions: "Multichannel Commerce Sandbox Warehouse",
        name: "Multichannel Test Warehouse",
        merchantLocationStatus: "ENABLED",
        locationTypes: ["STORE"],
      };

      try {
        await axios.post(`${INVENTORY_API_BASE}/location/${locationKey}`, locationBody, { headers, timeout: 10000 });
        merchantLocationKey = locationKey;
        console.log(`PASS: Created Merchant Location Key: ${merchantLocationKey}`);
      } catch (locErr: any) {
        console.log(`FAIL: Inventory Location Creation Rejected -> ${sanitizeError(locErr)}`);
      }
    }
  } catch (err: any) {
    console.log(`FAIL: Inventory Location Query -> ${sanitizeError(err)}`);
  }

  // 6. Output Final Sanitized Configuration Summary
  console.log("\n===========================================================");
  console.log("               EBAY SANDBOX SAFE CONFIGURATION             ");
  console.log("===========================================================");
  console.log(`Environment:                 SANDBOX`);
  console.log(`Marketplace ID:              EBAY_US`);
  console.log(`Currency:                    USD`);
  console.log(`OAuth User Access Token:     ${maskToken(cleanToken)}`);
  console.log(`Seller Registration Status:  sellerRegistrationCompleted = ${sellerRegistrationCompleted}`);
  console.log(`Fulfillment Policy ID:       ${fulfillmentPolicyId || "MISSING / NOT CREATED"}`);
  console.log(`Payment Policy ID:           ${paymentPolicyId || "MISSING / NOT CREATED"}`);
  console.log(`Return Policy ID:            ${returnPolicyId || "MISSING / NOT CREATED"}`);
  console.log(`Merchant Location Key:       ${merchantLocationKey || "MISSING / NOT CREATED"}`);
  console.log("===========================================================\n");
}

runDiagnostic().catch((err) => {
  console.error("Diagnostic script error:", err.message);
  process.exit(1);
});
