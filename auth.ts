import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { CONFIG_DIR_NAME } from "@earendil-works/pi-coding-agent";
import { isExpired } from "./expiry.mjs";
import { netFetch, readJson } from "./net-fetch.mjs";

const TENANT = process.env.HOTMAIL_TENANT || "consumers";
const SCOPE = "offline_access Mail.Read User.Read";
const TOKEN_URL = () => `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`;
const DEVICECODE_URL = () => `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/devicecode`;
const TOKEN_DIR = join(homedir(), CONFIG_DIR_NAME, "agent");
const TOKEN_PATH = join(TOKEN_DIR, "hotmail-auth.json");

interface TokenSet {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

function requireClientId(): string {
  const clientId = process.env.HOTMAIL_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      "HOTMAIL_CLIENT_ID is not set. Register a public-client Azure AD app (Mail.Read, offline_access, User.Read; " +
        "supports personal Microsoft accounts) and export its Application (client) ID as HOTMAIL_CLIENT_ID.",
    );
  }
  return clientId;
}

function loadTokens(): TokenSet | null {
  if (!existsSync(TOKEN_PATH)) return null;
  const raw = readFileSync(TOKEN_PATH, "utf8").trim();
  if (!raw) return null;
  return JSON.parse(raw);
}

function saveTokens(tokens: TokenSet): void {
  mkdirSync(TOKEN_DIR, { recursive: true });
  writeFileSync(TOKEN_PATH, JSON.stringify(tokens), { mode: 0o600 });
}

export function clearTokens(): void {
  if (existsSync(TOKEN_PATH)) writeFileSync(TOKEN_PATH, "");
}

async function postForm(url: string, body: Record<string, string>): Promise<{ ok: boolean; json: any }> {
  const res = await netFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  return { ok: res.ok, json: await readJson(res) };
}

export async function deviceCodeLogin(
  onPrompt: (userCode: string, verificationUri: string) => void,
): Promise<void> {
  const clientId = requireClientId();
  const startRes = await netFetch(DEVICECODE_URL(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, scope: SCOPE }),
  });
  const device = await readJson(startRes);
  if (!startRes.ok) {
    throw new Error(device.error_description || device.error || "failed to start device code flow");
  }

  onPrompt(device.user_code, device.verification_uri);

  const deadline = Date.now() + device.expires_in * 1000;
  let intervalMs = (device.interval ?? 5) * 1000;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    const { ok, json } = await postForm(TOKEN_URL(), {
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      client_id: clientId,
      device_code: device.device_code,
    });
    if (ok) {
      saveTokens({
        access_token: json.access_token,
        refresh_token: json.refresh_token,
        expires_at: Date.now() + json.expires_in * 1000,
      });
      return;
    }
    if (json.error === "authorization_pending") continue;
    if (json.error === "slow_down") {
      intervalMs += 5000;
      continue;
    }
    throw new Error(json.error_description || json.error || "device code login failed");
  }
  throw new Error("Device code expired before sign-in completed. Run /hotmail-login again.");
}

export async function getValidAccessToken(): Promise<string> {
  const tokens = loadTokens();
  if (!tokens) throw new Error("Not signed in. Run /hotmail-login first.");
  if (!isExpired(tokens.expires_at)) return tokens.access_token;

  const clientId = requireClientId();
  const { ok, json } = await postForm(TOKEN_URL(), {
    grant_type: "refresh_token",
    client_id: clientId,
    refresh_token: tokens.refresh_token,
    scope: SCOPE,
  });
  if (!ok) throw new Error(`Session expired (${json.error}). Run /hotmail-login again.`);

  saveTokens({
    access_token: json.access_token,
    refresh_token: json.refresh_token ?? tokens.refresh_token,
    expires_at: Date.now() + json.expires_in * 1000,
  });
  return json.access_token;
}
