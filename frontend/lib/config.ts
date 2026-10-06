const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

// Local `next dev` sets NEXT_PUBLIC_API_URL in .env.development.local.
// Production builds use .env.local or the host environment. An unset value
// stays on the Render API so a Vercel build never falls back to localhost.
export const API_URL = configuredApiUrl || "https://multichannel-commerce-hoee.onrender.com";
