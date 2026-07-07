import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { CONFIG_DIR_NAME } from "@earendil-works/pi-coding-agent";
import { resolveWithinDir } from "./path-guard.mjs";

const BASE = "https://graph.microsoft.com/v1.0";
// ponytail: attachments are attacker-controlled (any sender) and destPath comes from LLM tool args, which can be
// steered by prompt injection in email content — confine writes to a fixed directory instead of trusting the path
const DOWNLOAD_DIR = join(homedir(), CONFIG_DIR_NAME, "agent", "hotmail-downloads");

async function graphFetch(accessToken: string, path: string, headers: Record<string, string> = {}): Promise<any> {
  // path may be a full @odata.nextLink URL (pagination) or a path relative to BASE
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, ...headers },
  });
  if (!res.ok) {
    throw new Error(`Graph API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export interface EmailSummary {
  id: string;
  subject: string;
  from: string;
  receivedDateTime: string;
  bodyPreview: string;
}

export async function searchEmail(
  accessToken: string,
  query: string | undefined,
  top: number,
  folder: string = "inbox",
): Promise<EmailSummary[]> {
  const select = "id,subject,from,receivedDateTime,bodyPreview";
  // ponytail: /me/messages includes Deleted Items and Clutter by design; default to Inbox so deleted mail doesn't reappear
  const folderPath = `/me/mailFolders/${encodeURIComponent(folder)}/messages`;
  const pageSize = Math.min(top, 999); // Graph's own per-request page cap
  const path = query
    ? `${folderPath}?$search=${encodeURIComponent(`"${query}"`)}&$top=${pageSize}&$select=${select}`
    : `${folderPath}?$top=${pageSize}&$select=${select}&$orderby=receivedDateTime desc`;
  const headers = query ? { ConsistencyLevel: "eventual" } : {}; // $search requires this header on Microsoft Graph

  const messages: any[] = [];
  let next: string | null = path;
  while (next && messages.length < top) {
    const data = await graphFetch(accessToken, next, headers);
    messages.push(...(data.value ?? []));
    next = data["@odata.nextLink"] ?? null;
  }

  return messages.slice(0, top).map((m: any) => ({
    id: m.id,
    subject: m.subject ?? "(no subject)",
    from: m.from?.emailAddress?.address ?? "(unknown)",
    receivedDateTime: m.receivedDateTime,
    bodyPreview: m.bodyPreview ?? "",
  }));
}

export async function readEmail(accessToken: string, id: string): Promise<any> {
  const select = "id,subject,from,toRecipients,ccRecipients,receivedDateTime,body,hasAttachments";
  return graphFetch(accessToken, `/me/messages/${encodeURIComponent(id)}?$select=${select}`);
}

export async function listAttachments(accessToken: string, messageId: string): Promise<any[]> {
  const data = await graphFetch(
    accessToken,
    `/me/messages/${encodeURIComponent(messageId)}/attachments?$select=id,name,contentType,size`,
  );
  return data.value ?? [];
}

export async function downloadAttachment(
  accessToken: string,
  messageId: string,
  attachmentId: string,
  destPath: string,
): Promise<{ name: string; size: number; path: string }> {
  const data = await graphFetch(
    accessToken,
    `/me/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,
  );
  if (!data.contentBytes) {
    // ponytail: only handles inline file attachments; large/reference attachments need the $value stream endpoint
    throw new Error("Attachment has no inline content (not a file attachment, or too large for this endpoint).");
  }
  const resolvedPath = resolveWithinDir(DOWNLOAD_DIR, destPath);
  mkdirSync(dirname(resolvedPath), { recursive: true });
  writeFileSync(resolvedPath, Buffer.from(data.contentBytes, "base64"));
  return { name: data.name, size: data.size, path: resolvedPath };
}
