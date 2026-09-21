import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock, Globe, Mail, Building, FileText, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Wizmart Privacy Policy",
  description:
    "Privacy Policy for Wizmart, a multi-channel commerce management platform.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Wizmart
              </span>
              {/* <span className="ml-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                by Wizmart
              </span> */}
            </div>
          </div>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>
        </div>
      </header>

      {/* Main Privacy Policy Container */}
      <main className="mx-auto max-w-4xl px-6 py-12">
        {/* Title Banner */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 md:p-12 shadow-sm mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 border border-indigo-100 mb-4">
            <FileText className="h-4 w-4" />
            Legal Documentation
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-3 text-base text-slate-600">
            Learn how Wizmart collects, protects, uses, and handles your multi-channel commerce data.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-6 border-t border-slate-100 pt-6 text-xs text-slate-500 font-mono">
            <div>
              <span className="font-semibold text-slate-700">Platform:</span> Wizmart Multi-Channel Commerce
            </div>
           
            <div>
              <span className="font-semibold text-slate-700">Last Updated:</span> September 17, 2026
            </div>
          </div>
        </div>

        {/* Legal Document Content Body */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 md:p-12 shadow-sm space-y-10 text-sm leading-relaxed text-slate-700">
          
          {/* Section 1 */}
          <section id="introduction" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <span className="text-indigo-600 font-mono text-base">1.</span> Introduction
            </h2>
            <p className="mb-3">
              Welcome to <strong>Wizmart</strong> ("we," "our," "us"), a multi-channel commerce management SaaS platform  (accessible at <a href="https://wizmart.co.uk/" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-medium">https://wizmart.co.uk/</a>).
            </p>
            <p>
              Wizmart empowers online merchants and business operators to manage products, catalog synchronization, and marketplace listings across connected sales channels from a centralized dashboard. We are committed to maintaining the privacy, security, and integrity of your business data and connected marketplace channels. This Privacy Policy details how we collect, process, store, and safeguard data when you access or use Wizmart.
            </p>
          </section>

          {/* Section 2 */}
          <section id="information-collected" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <span className="text-indigo-600 font-mono text-base">2.</span> Information We Collect
            </h2>
            <p className="mb-4">
              To deliver multi-channel listing management, product mapping, and channel synchronization, Wizmart collects specific categories of operational data:
            </p>

            <div className="space-y-4 pl-2 border-l-2 border-indigo-50">
              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-1">
                  2.1 Account Information
                </h3>
                <p>
                  When you register or log in to Wizmart, we collect account credentials including your account email address, encrypted password credentials, user profile identifiers, and assigned system administrative roles.
                </p>
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-1">
                  2.2 Product and Catalog Information
                </h3>
                <p>
                  We store product catalog details uploaded or synchronized to your account, including Stock Keeping Units (SKUs), product titles, descriptions, brand names, product categories, pricing parameters, shipping charges, inventory quantities, images, status flags, and channel listing mappings.
                </p>
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-1">
                  2.3 Connected Sales Channel Information
                </h3>
                <p>
                  When you connect sales channels, we store configuration parameters such as store domain URLs (e.g., <code>your-store.myshopify.com</code>), account store names, seller profile details, marketplace identifiers (e.g., <code>EBAY_US</code>), currency settings, and policy identifiers necessary for multi-channel publishing.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section id="third-party-authorization" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <span className="text-indigo-600 font-mono text-base">3.</span> Third-Party Account Authorization
            </h2>
            <p>
              Wizmart interacts with external sales platforms through explicit user authorization. When connecting a channel, you authorize Wizmart to request access tokens, perform authorized API operations, retrieve catalog data, and push product or inventory updates to your authorized channel account on your behalf.
            </p>
          </section>

          {/* Section 4 */}
          <section id="how-we-use-information" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <span className="text-indigo-600 font-mono text-base">4.</span> How We Use Your Information
            </h2>
            <p className="mb-3">
              We process your information strictly for legitimate commercial and operational SaaS functions:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Executing product catalog synchronization and publishing items across connected sales channels.</li>
              <li>Performing real-time or scheduled inventory quantity updates to prevent overselling.</li>
              <li>Validating channel health, API authorization status, and operational connection metrics.</li>
              <li>Maintaining product mappings and cross-channel SKU relationships.</li>
              <li>Detecting, preventing, and resolving technical errors or unauthorized platform access.</li>
              <li>Providing operational logs, sync failure diagnostics, and catalog summary reports.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section id="ebay-information" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <span className="text-indigo-600 font-mono text-base">5.</span> eBay Information
            </h2>
            <p className="mb-3">
              When connecting an <strong>eBay</strong> marketplace channel:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Wizmart processes eBay API OAuth authorization tokens, marketplace IDs (such as <code>EBAY_US</code>), currency configurations, and fulfillment, payment, and return policy IDs provided by the merchant.</li>
              <li>Catalog updates, pricing, and stock levels are submitted to eBay's Inventory and Listing APIs in compliance with eBay Developer API terms.</li>
              <li>Wizmart stores eBay seller profile URLs and configuration parameters securely scoped to your user account.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section id="shopify-information" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <span className="text-indigo-600 font-mono text-base">6.</span> Shopify Information
            </h2>
            <p className="mb-3">
              When connecting a <strong>Shopify</strong> store channel:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Shopify store connections are established via secure OAuth authorization flows initiated directly by an authenticated SaaS user.</li>
              <li>Wizmart normalizes store URLs to standard domain formats (e.g. <code>your-store.myshopify.com</code>) and securely exchanges authorization codes for API tokens.</li>
              <li>Wizmart interacts with Shopify Admin GraphQL APIs to import products, read/update inventory levels, and publish catalog modifications.</li>
              <li>Shopify access tokens and refresh tokens are stored securely in database credentials and are <strong>never</strong> exposed to frontend client applications or logged in system output.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section id="custom-website-integration" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <span className="text-indigo-600 font-mono text-base">7.</span> Custom Website Integration
            </h2>
            <p>
              For merchants integrating a <strong>Custom Website</strong> channel via custom REST endpoints, Wizmart stores the configured target API Base URL and authentication API Keys. API Keys are transmitted securely via HTTP headers (such as <code>X-API-Key</code> or Bearer headers) exclusively to your designated custom endpoint during synchronization events.
            </p>
          </section>

          {/* Section 8 */}
          <section id="authentication-and-access-tokens" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <span className="text-indigo-600 font-mono text-base">8.</span> Authentication and Access Tokens
            </h2>
            <p className="mb-3">
              Security of credentials is a core architectural priority in Wizmart:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>All channel access tokens, OAuth refresh tokens, and custom API keys are stored in encrypted backend infrastructure.</li>
              <li>Credentials fields are strictly excluded from client-facing API responses (via explicit projection exclusions).</li>
              <li>OAuth authorization state sessions are cryptographically generated and bound to initiating user accounts to prevent CSRF or cross-tenant session hijacking.</li>
            </ul>
          </section>

          {/* Section 9 */}
          <section id="information-sharing" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <span className="text-indigo-600 font-mono text-base">9.</span> Information Sharing
            </h2>
            
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Connected Marketplaces:</strong> Product and inventory data is transmitted directly to external sales channels (Shopify, eBay, Custom Website) as explicitly instructed by your synchronization configuration.</li>
              <li><strong>Service Infrastructure:</strong> Trusted cloud hosting, database, and Redis caching infrastructure providers operating under strict confidentiality and security obligations.</li>
              <li><strong>Legal Compliance:</strong> When required by valid legal process, regulation, or enforceable governmental request.</li>
            </ul>
          </section>

          {/* Section 10 */}
          <section id="data-security" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <span className="text-indigo-600 font-mono text-base">10.</span> Data Security
            </h2>
            <p>
              We employ industry-standard technical safeguards to protect your information, including TLS/HTTPS encryption in transit, strict user isolation database indexes, distributed locking mechanisms for token rotation, hashed password storage, and access token masking in application logs. While no transmission over the Internet is 100% immune to risk, we continuously audit our infrastructure to safeguard your account.
            </p>
          </section>

          {/* Section 11 */}
          <section id="data-retention" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <span className="text-indigo-600 font-mono text-base">11.</span> Data Retention
            </h2>
            <p>
              Wizmart retains account data, product mappings, and integration records for as long as your account remains active or as needed to provide multi-channel services. If you delete a product mapping or remove a connected sales channel, associated channel credential tokens and mappings are permanently removed from active server records.
            </p>
          </section>

          {/* Section 12 */}
          <section id="disconnecting-an-integration" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <span className="text-indigo-600 font-mono text-base">12.</span> Disconnecting an Integration
            </h2>
            <p>
              You can disconnect any sales channel at any time via the <em>Integrations</em> page in the Wizmart dashboard. Upon deletion of an integration, Wizmart immediately ceases background synchronization for that channel and removes stored access tokens for that specific integration.
            </p>
          </section>

          {/* Section 13 */}
          <section id="your-rights" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <span className="text-indigo-600 font-mono text-base">13.</span> Your Rights
            </h2>
            <p className="mb-3">
              Depending on your jurisdiction, you may hold the following rights regarding your personal and business data:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>The right to access and review data stored in your account.</li>
              <li>The right to correct or update inaccurate product or account information.</li>
              <li>The right to request deletion of your account and associated multi-channel records.</li>
              <li>The right to disconnect third-party marketplace channel authorizations at any time.</li>
            </ul>
          </section>

          {/* Section 14 */}
          <section id="cookies-and-tracking" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <span className="text-indigo-600 font-mono text-base">14.</span> Cookies and Similar Technologies
            </h2>
            <p>
              Wizmart uses essential authentication tokens (such as JSON Web Tokens stored in browser secure storage) to maintain active user login sessions and authenticate API requests. We do not use third-party advertising cookies or cross-site tracking scripts.
            </p>
          </section>

          {/* Section 15 */}
          <section id="childrens-privacy" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <span className="text-indigo-600 font-mono text-base">15.</span> Children's Privacy
            </h2>
            <p>
              Wizmart is a commercial B2B e-commerce software platform intended strictly for use by legal adults and business enterprises. We do not knowingly collect personal information from individuals under 18 years of age.
            </p>
          </section>

          {/* Section 16 */}
          <section id="international-transfers" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <span className="text-indigo-600 font-mono text-base">16.</span> International Data Transfers
            </h2>
            <p>
              Your information may be transferred to and processed on secure server infrastructure located outside of your state, province, or country. Wizmart ensures that all data transfers adhere to appropriate technical safeguards and data protection protocols.
            </p>
          </section>

          {/* Section 17 */}
          <section id="third-party-services" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <span className="text-indigo-600 font-mono text-base">17.</span> Third-Party Services
            </h2>
            <p>
              Wizmart interfaces with third-party platforms (Shopify, eBay). This Privacy Policy applies exclusively to Wizmart and Wizmart. We encourage you to review the privacy policies of any third-party marketplaces you connect to Wizmart.
            </p>
          </section>

          {/* Section 18 */}
          <section id="changes-to-policy" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <span className="text-indigo-600 font-mono text-base">18.</span> Changes to This Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time to reflect platform enhancements, legal requirements, or operational changes. Updated versions will be published on this page with a revised "Last Updated" date.
            </p>
          </section>

          {/* Section 19 */}
          <section id="contact-us" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <span className="text-indigo-600 font-mono text-base">19.</span> Contact Us
            </h2>
            <p className="mb-4">
              If you have any questions, concerns, or requests regarding this Privacy Policy or Wizmart data practices, please contact Wizmart:
            </p>
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 space-y-3 font-mono text-xs">
              <div className="flex items-center gap-3">
                <Building className="h-4 w-4 text-indigo-600 shrink-0" />
                <span><strong>Company:</strong> Wizmart</span>
              </div>
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-indigo-600 shrink-0" />
                <span><strong>Website:</strong> <a href="https://wizmart.co.uk/" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">https://wizmart.co.uk/</a></span>
              </div>
              {/* <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-indigo-600 shrink-0" />
                <span><strong>Privacy Email:</strong> [YOUR PRIVACY/CONTACT EMAIL]</span>
              </div>
              <div className="flex items-center gap-3">
                <Building className="h-4 w-4 text-indigo-600 shrink-0" />
                <span><strong>Registered Address:</strong> [YOUR REGISTERED BUSINESS ADDRESS]</span>
              </div> */}
            </div>
          </section>

          {/* Section 20 */}
          <section id="consent" className="scroll-mt-24 border-t border-slate-100 pt-8">
            <h2 className="text-xl font-bold text-slate-900 pb-3 mb-3 flex items-center gap-2">
              <span className="text-indigo-600 font-mono text-base">20.</span> Consent
            </h2>
            <p>
              By accessing or using Wizmart, or by logging into your account, you acknowledge that you have read and understood this Privacy Policy and agree to the collection, use, and processing of your information as described herein.
            </p>
          </section>
        </div>

        {/* Footer info */}
        <div className="mt-12 text-center text-xs text-slate-500">
          <p>© 2026 Wizmart. All rights reserved. Wizmart is a trademark of Wizmart.</p>
        </div>
      </main>
    </div>
  );
}
