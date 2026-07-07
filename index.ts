import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { deviceCodeLogin, getValidAccessToken, clearTokens } from "./auth.ts";
import { searchEmail, readEmail, listAttachments, downloadAttachment } from "./graph.ts";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("hotmail-login", {
    description: "Sign in to your Microsoft/Hotmail account",
    handler: async (_args, ctx) => {
      try {
        await deviceCodeLogin((userCode, verificationUri) => {
          ctx.ui.notify(`Open ${verificationUri} and enter code: ${userCode}`, "info");
        });
        ctx.ui.notify("Signed in to Microsoft. Email tools are ready.", "info");
      } catch (err: any) {
        ctx.ui.notify(`Sign-in failed: ${err.message}`, "error");
      }
    },
  });

  pi.registerCommand("hotmail-logout", {
    description: "Forget the stored Microsoft sign-in",
    handler: async (_args, ctx) => {
      clearTokens();
      ctx.ui.notify("Signed out of Microsoft.", "info");
    },
  });

  pi.registerTool({
    name: "search_email",
    label: "Search Email",
    description: "Search or list recent emails from the signed-in Microsoft/Hotmail account",
    promptSnippet: "Search or list recent emails",
    parameters: Type.Object({
      query: Type.Optional(Type.String({ description: "Search text; omit to list most recent emails" })),
      top: Type.Optional(
        Type.Integer({ description: "Max results (default 10); pages through the mailbox as needed", minimum: 1, maximum: 1000 }),
      ),
      folder: Type.Optional(
        Type.String({ description: "Mail folder to search, e.g. inbox, sentitems, deleteditems, archive (default inbox)" }),
      ),
    }),
    async execute(_toolCallId, params) {
      const token = await getValidAccessToken();
      const results = await searchEmail(token, params.query, params.top ?? 10, params.folder);
      return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }], details: { results } };
    },
  });

  pi.registerTool({
    name: "read_email",
    label: "Read Email",
    description: "Fetch the full subject, sender, recipients, and body of one email by id (from search_email)",
    parameters: Type.Object({ id: Type.String({ description: "Message id from search_email" }) }),
    async execute(_toolCallId, params) {
      const token = await getValidAccessToken();
      const message = await readEmail(token, params.id);
      return { content: [{ type: "text", text: JSON.stringify(message, null, 2) }], details: { message } };
    },
  });

  pi.registerTool({
    name: "list_attachments",
    label: "List Attachments",
    description: "List attachments on an email by id",
    parameters: Type.Object({ id: Type.String({ description: "Message id" }) }),
    async execute(_toolCallId, params) {
      const token = await getValidAccessToken();
      const attachments = await listAttachments(token, params.id);
      return { content: [{ type: "text", text: JSON.stringify(attachments, null, 2) }], details: { attachments } };
    },
  });

  pi.registerTool({
    name: "download_attachment",
    label: "Download Attachment",
    description: "Download one attachment from an email into the extension's downloads folder (~/.pi/agent/hotmail-downloads)",
    parameters: Type.Object({
      messageId: Type.String({ description: "Message id" }),
      attachmentId: Type.String({ description: "Attachment id from list_attachments" }),
      destPath: Type.String({
        description: "File name (optionally with subfolders) to save the attachment as, relative to the downloads folder",
      }),
    }),
    async execute(_toolCallId, params) {
      const token = await getValidAccessToken();
      const result = await downloadAttachment(token, params.messageId, params.attachmentId, params.destPath);
      return {
        content: [{ type: "text", text: `Saved ${result.name} (${result.size} bytes) to ${result.path}` }],
        details: result,
      };
    },
  });
}
