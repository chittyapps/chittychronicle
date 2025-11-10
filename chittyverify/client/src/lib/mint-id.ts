/**
 * ChittyID Runtime Minting Helper
 *
 * Minimal client for minting ChittyIDs from id.chitty.cc with deterministic fallback.
 * This ensures zero local random ID generation while providing graceful degradation.
 *
 * @see https://id.chitty.cc/v1/mint
 */

interface MintIdOptions {
  entity?: string;
  purpose?: string;
  env?: any;
}

/**
 * Mint a ChittyID from the central authority service
 *
 * @param entity - Entity type (e.g., 'TXHASH', 'ANCHOR', 'SESSN', 'REGNUM')
 * @param purpose - Purpose description for audit trail
 * @param env - Environment object containing CHITTY_ID_TOKEN
 * @returns ChittyID string or deterministic pending ID on failure
 *
 * @example
 * const txHash = await mintId('TXHASH', 'blockchain-transaction');
 * const sessionId = await mintId('SESSN', 'user-authentication');
 */
export async function mintId(
  entity: string = "ID",
  purpose: string = "general",
  env?: any,
): Promise<string> {
  const entityType = String(entity || "ID").toUpperCase();

  // Attempt to get token from environment
  const token =
    (env && (env.CHITTY_ID_TOKEN || env.SECRET_CHITTY_ID_TOKEN)) ||
    (typeof process !== "undefined" && process?.env?.CHITTY_ID_TOKEN) ||
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env?.VITE_CHITTY_ID_TOKEN);

  try {
    const res = await fetch("https://id.chitty.cc/v1/mint", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ entity: entityType, purpose }),
    });

    if (!res.ok) {
      console.warn(
        `[mintId] HTTP ${res.status} from id.chitty.cc, using fallback`,
      );
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data && data.chittyId) {
      return data.chittyId;
    }

    console.warn("[mintId] Missing chittyId in response, using fallback");
    throw new Error("missing chittyId in response");
  } catch (error) {
    // Deterministic, non-random fallback (no Math.random!)
    const timestamp = Date.now();
    const fallbackId = `pending-${entityType.toLowerCase()}-${timestamp}`;

    console.warn(
      `[mintId] ChittyID service unavailable, using fallback: ${fallbackId}`,
      error,
    );
    return fallbackId;
  }
}

/**
 * Mint a ChittyID with no fallback - throws error if service unavailable
 * Use this for critical operations that MUST have a proper ChittyID
 *
 * @param entity - Entity type
 * @param purpose - Purpose description
 * @param env - Environment object
 * @throws Error if ChittyID service is unavailable
 */
export async function mintIdRequired(
  entity: string = "ID",
  purpose: string = "general",
  env?: any,
): Promise<string> {
  const entityType = String(entity || "ID").toUpperCase();

  const token =
    (env && (env.CHITTY_ID_TOKEN || env.SECRET_CHITTY_ID_TOKEN)) ||
    (typeof process !== "undefined" && process?.env?.CHITTY_ID_TOKEN) ||
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env?.VITE_CHITTY_ID_TOKEN);

  if (!token) {
    throw new Error("CHITTY_ID_TOKEN not configured - cannot mint required ID");
  }

  const res = await fetch("https://id.chitty.cc/v1/mint", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ entity: entityType, purpose }),
  });

  if (!res.ok) {
    throw new Error(
      `ChittyID service returned HTTP ${res.status} - cannot mint required ${entityType} ID`,
    );
  }

  const data = await res.json();
  if (!data || !data.chittyId) {
    throw new Error("ChittyID service response missing chittyId field");
  }

  return data.chittyId;
}

/**
 * Generate deterministic content hash (NOT random)
 * Use this for content-based hashing, not random ID generation
 */
export async function generateContentHash(content: string): Promise<string> {
  // Use Web Crypto API for deterministic hashing
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `sha256-${hashHex}`;
  }

  // Fallback: deterministic hash based on content, not random
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `hash-${Math.abs(hash).toString(36)}`;
}
