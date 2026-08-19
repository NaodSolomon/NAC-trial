# Content Manager Guide

This guide is for the person who maintains the Nehemiah Autism Center website's
content — no technical background needed. Everything here happens in the website's
own admin screens.

## Signing in

1. Open `https://<your-site>/admin` and enter the email and password you were given.
2. Forgot the password? Use **Forgot password?** on the sign-in page. Reset
   instructions arrive by email, and the reset link works once.
3. When you finish working, use **Log out** (top right).

The menu on the left lists every screen your account can use. If a screen is
missing, your account's role does not include it — that is intentional.

## The golden workflow: pictures first

Almost every screen that shows a photo uses the same two steps:

1. **Media** screen → **Upload media** → choose the file, fill in the
   *alternative text* (one line saying what the picture shows — screen readers
   read it aloud and search engines index it), and upload.
2. On any other screen, press **Choose photo** and click the picture you uploaded.

Photos must be JPEG, PNG or WebP and at most 10 MB. Larger dimensions are always
fine — the site scales pictures down, never up.

> **Consent first.** Never upload a photo in which a child is identifiable without
> written consent from a parent or guardian.

## Both languages

The public site is in English and Amharic. Text fields come in pairs — fill both
whenever you can. If the Amharic version is empty, visitors see the English text
until you add it.

## Screen by screen

### Settings — the organization's identity

One screen controls what appears on every page:

- **Website identity and languages** — the site name and which languages are enabled.
- **Contact information** — email, phone, address. These appear in the page header,
  the footer, and the contact page. Anything you leave empty is simply not shown.
- **Social links** — Facebook, Instagram, YouTube, LinkedIn, X, TikTok. Empty
  fields remove that icon from the footer.
- **Organization voice** — opening hours, tagline, the footer sentence, the FAQ
  introduction, and the donations notice, each in both languages.
- **Page banners** — the wide photos at the top of the Gallery, Blog and Events pages.
- **Sharing image** — the picture shown when someone shares the site on Facebook,
  WhatsApp or Telegram (1200 × 630 pixels works best). Pages with their own picture
  use that instead.

### CMS pages — homepage, about, team, volunteer, contact

**CMS pages** lists the site's main pages per language. Open one to edit it, or use
**New page** to create one. Each page has a *content structure*:

- **Homepage composition** — the hero (heading, text, buttons, **hero photo**),
  three service cards, the location block with the Google Maps link, and the
  closing call-to-action.
- **About** — mission, history, and a services overview, plus a banner photo.
- **Volunteer role listings** — the roles shown on the volunteer page.
- **Approved team biographies** — names, roles and biographies. The page stays
  offline until you tick the approval box in **both** languages.
- **Contact page with map** — the Google Maps embed link (in Google Maps:
  *Share → Embed a map*, copy the link inside `src="…"`).
- **Generic page** — any other page; it appears at `/<its-slug>`.

Every non-homepage type also has a **Banner photo** picker.

**Publishing is always an explicit step.** Saving stores a draft; **Publish now**
makes it public; **Schedule** publishes at a chosen time. Editing an already
published page returns it to draft — the previous version stays public until you
publish again, so you can never half-publish an edit.

**The slug** is the page's web address (for example `family-support` →
`/family-support`). Use lowercase words joined by hyphens; **Check availability**
tells you whether it is free.

### FAQ

Add questions and answers per language, drag-free reordering with the arrow
buttons, and optional categories to group related questions. Pair the English and
Amharic versions of a question with the same *translation key*.

### Blog

Posts have a title, the article text, a one-sentence summary for search results,
and a cover image. Each post is written in one language — write the pair as two
posts.

### Events

Each event has a name, description, start and end time, location, and an **event
photo** (shown on the card, on the event's own page, and in link previews).
Visitors can RSVP when you enable it; **Review RSVPs** shows who is coming.

### Gallery

Upload photos and short videos directly on this screen (title + alternative text
per item, per language). The arrows control the display order.

### Testimonials

Quotes from families and volunteers, with a moderation flow: entries you approve
appear on the volunteer page. An anonymous display name like "A grateful parent"
is fine — but keep the person's written consent on file.

### Navigation

The header menu, per language. Label, destination, order, and a visibility toggle.
Destinations are internal paths (like `/about`) or full `https://` addresses.

### Donations

Online payment is not connected yet. The donate page shows the **Donations
notice** from Settings → Organization voice — use it to tell supporters how to
help meanwhile. The Donations screen itself lists records once payments go live.

## What you cannot change here (yet)

- The **logo** — the site shows the organization name as styled text for now.
- **Team member photos** — the team page shows initials; photos are a planned
  update (collect them now).
- The three **service card icons** on the homepage.
- The footer's **link groups** (Support / Discover) — fixed lists for now.

Ask your developer for these; everything else in this guide is yours.

## If something looks wrong

- A red message next to a field explains exactly what to fix — nothing is saved
  until the form is valid, and a failed save never loses what you typed.
- Deleting always asks for confirmation first, and tells you if the system
  refused (for example, deleting something that is still in use).
- If a page of results looks empty after deleting, the list reloads itself; use
  **Clear filters** if a filter is hiding what you expect to see.
