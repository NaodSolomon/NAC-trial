# UI route map

Every route is API-backed; there are no static fixtures. Public content routes are
bilingual via `?lang=en|am`.

## Public — `(public)` route group

| Route | Content source |
| --- | --- |
| `/` | CMS `home` page composition (placeholder page while unpublished) |
| `/about`, `/team`, `/[slug]` | Published CMS pages (team withheld until approved in both languages) |
| `/blog`, `/blog/[slug]` | Blog posts |
| `/events`, `/events/[slug]` | Events with RSVP |
| `/gallery` | Gallery items |
| `/faq` | FAQ entries |
| `/resources` | Downloadable resources |
| `/search` | Published-content search |
| `/contact` | CMS `contact` page + site settings |
| `/volunteer` | CMS `volunteer` page + application form |
| `/donate`, `/donate/simulated` | Donation flow (managed notice while payments are disabled) |
| `/coming-soon` | Standalone pre-launch page |

## Administrator sign-in — `(auth)` route group

`/admin/login`, `/admin/forgot-password`, `/admin/reset-password`. No public
registration exists; `/login` is a legacy alias excluded from robots.

## Administrator workspace — `(dashboard)` route group

`/admin` (dashboard), `content` + `content/[id]` + `content/new`, `blog`, `faq`,
`events`, `gallery`, `media`, `resources`, `seo`, `navigation`, `settings`,
`contact`, `volunteers`, `testimonials`, `newsletter`, `donations`, `analytics`,
`users`, `audit-logs`, `sessions`, `system`, plus `forbidden` for role denials.
Access is role-gated in the UI and independently enforced by the API.
