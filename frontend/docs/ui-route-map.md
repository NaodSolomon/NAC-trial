# UI route map

This map freezes the imported UI surface before API integration. Static fixtures live in each
feature's `data` directory and must later be replaced behind feature hooks or service modules—not
inside presentational components.

| Designed screen | URL | Current visual source | Planned backend capability |
| --- | --- | --- | --- |
| Homepage | `/` | `features/home` | Homepage CMS, events, testimonials, gallery |
| About | `/about` | `features/about` | Published CMS page |
| Events | `/events` | `features/events` | Published events |
| Event detail | `/events/[slug]` | `features/events` | Event detail, RSVP, iCal |
| Blog | `/blog` | `features/blog` | Published blog posts |
| Blog detail | `/blog/[slug]` | `features/blog` | Published blog post and SEO |
| Gallery | `/gallery` | `features/gallery` | Public gallery/media metadata |
| Masonry gallery | `/gallery/masonry` | `features/gallery` | Public gallery/media metadata |
| FAQ | `/faq` | `features/faq` | Published FAQ CMS content |
| Contact | `/contact` | `features/contact` | Contact submissions |
| Donation | `/donate` | `features/donation` | Fake/trial donation workflow |
| Donation result | `/donate/simulated` | existing trial screen | Fake payment status/cancel/receipt |
| Coming soon | `/coming-soon` | `features/coming-soon` | Static launch state |
| Administrator login | `/login` | existing auth shell | JWT login/password recovery |
| Administrator dashboard | `/dashboard` | existing dashboard shell | Protected administration features |

Public registration is intentionally absent. Administrator accounts are created and managed only by
authorized administrators, in agreement with the backend security model.

The imported template's team routes remain intentionally withheld until the Center supplies
authoritative bilingual profiles, approved photographs, and verified biographies. They are absent
from public navigation, search-engine discovery, and visual baselines.
