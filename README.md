# pi-hotmail

Microsoft/Hotmail email access for the [Pi coding agent](https://github.com/earendil-works), via Microsoft Graph. Sign in with a personal Microsoft account (Outlook.com/Hotmail) and let the agent search, read, and pull attachments from your mailbox.

## Commands

- `/hotmail-login` — sign in via device code flow
- `/hotmail-logout` — forget the stored sign-in

## Tools

- `search_email` — search or list recent emails (`query`, `top`, `folder`)
- `read_email` — fetch full subject/sender/recipients/body by ref (from `search_email`)
- `list_attachments` — list attachments on a message by ref
- `download_attachment` — save an attachment into `~/.pi/agent/hotmail-downloads`

## Setup

### 1. Register an app in your Azure tenant

You don't need an organizational Azure subscription — every personal Microsoft account (Outlook.com, Hotmail, Live) has a free default Azure AD tenant you can register an app in.

1. Go to the [Azure Portal](https://portal.azure.com) and sign in with your Microsoft/Hotmail account.
2. Search for **App registrations** → **New registration**.
3. Fill in the form:
   - **Name**: anything, e.g. `pi-hotmail`
   - **Supported account types**: *Personal Microsoft accounts only* (or *Accounts in any organizational directory and personal Microsoft accounts* if you also use a work/school account)
   - **Redirect URI**: leave blank — not needed for the device code flow
4. Click **Register**, then copy the **Application (client) ID** from the Overview page.
5. Go to **Authentication** (left nav) → under *Advanced settings*, set **Allow public client flows** to **Yes** → **Save**.
   - This is required: the extension is a public client (no client secret) using OAuth's device code grant.
6. Go to **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated permissions**, and add:
   - `Mail.Read`
   - `User.Read`
   - `offline_access`
7. Click **Grant admin consent** if you see the option (on a personal tenant you're the only admin; otherwise you'll consent on first sign-in instead).

### 2. Configure the extension

```bash
export HOTMAIL_CLIENT_ID="<Application (client) ID from step 1>"
```

Optional:

```bash
# Only needed if you're using a work/school account instead of a personal one
export HOTMAIL_TENANT="organizations"   # default: "consumers"
```

### 3. Sign in

Run `/hotmail-login` in Pi, open the printed URL, and enter the device code. Tokens are cached at `~/.pi/agent/hotmail-auth.json` (mode `0600`) and refreshed automatically.

## Notes

- Attachment downloads are confined to `~/.pi/agent/hotmail-downloads` regardless of the requested path, since attachment content and file names come from arbitrary senders.
- `search_email` defaults to the Inbox folder; pass `folder` to search Sent Items, Deleted Items, Archive, etc.
- `search_email` hands out short refs ("1", "2", ...) instead of raw Graph message ids. Graph ids are 100+ char strings that differ only in a few trailing characters between adjacent emails, which an LLM can transpose when generating a tool call — a short ref leaves much less room for that. `read_email`/`list_attachments`/`download_attachment` accept either a ref or a raw id. `read_email` also echoes the subject/sender it actually fetched as the first line of its output, so a wrong pick is visible immediately instead of buried in the JSON.
