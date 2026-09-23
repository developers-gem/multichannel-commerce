const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

// Vercel builds must never fall back to localhost. Local development still
// uses frontend/.env with NEXT_PUBLIC_API_URL=http://localhost:5000.
export const API_URL = configuredApiUrl || "https://multichannel-commerce-hoee.onrender.com";
