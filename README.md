# Tab Organizer

A local Chrome extension that automatically groups your tabs by domain, using Chrome's built-in tab groups.

`github.com`, `google.com`, `reddit.com`, and other sites each get their own named group.
New tabs join the matching group as they open or navigate.

This is for personal, unpacked use on your own machine.
It is not packaged for the Chrome Web Store.

## What it does

- Groups http(s) tabs in each window by domain.
- Strips `www.` so `www.github.com` and `github.com` land in the same group.
- Optionally collapses subdomains, so `mail.google.com` joins the `google.com` group.
- Leaves pinned tabs, `chrome://` pages, and other non-http tabs alone.
- Assigns a stable color to each domain.
- Shows a group count on the toolbar icon.

Open the toolbar popup to toggle auto-organize, change subdomain grouping, or run **Organize now**.

## Install in Chrome

1. Build is not required.
   The extension loads directly from this folder.
2. Open Chrome and go to `chrome://extensions`.
3. Turn on **Developer mode** in the top-right corner.
4. Click **Load unpacked**.
5. Select this repository folder (the one that contains `manifest.json`).
6. Pin **Tab Organizer** from the puzzle-piece extensions menu if you want the popup one click away.

Chrome will prompt for the `tabs`, `tabGroups`, and `storage` permissions.
Those are required so the extension can read tab URLs, create groups, and remember your settings.

## Use it

Open a few tabs from the same site, or click **Organize now** in the popup.
Existing tabs are grouped when the extension is installed or when Chrome starts, as long as auto-organize is on.

Grouping is per window.
Chrome does not let a single tab group span multiple windows.

If you use Incognito windows, open `chrome://extensions`, click **Details** on Tab Organizer, and enable **Allow in Incognito**.

## Update after code changes

1. Return to `chrome://extensions`.
2. Click the reload arrow on the Tab Organizer card.
3. Click **Organize now** if you want to regroup immediately.

## Uninstall

On `chrome://extensions`, click **Remove** on the Tab Organizer card.
Chrome deletes the extension's local settings.
Your tabs themselves are not removed.
