# Fan uploads: one-time Cloudflare setup

The code is in this repo. These steps connect it to your Cloudflare account. Until they're done the
Fan Pics page still loads, and uploading just says "Uploads aren't set up yet."

## 1. Storage (R2) and database (D1)
1. Cloudflare dashboard > **R2 Object Storage** > **Create bucket** > name it `twurt-uploads`. Leave it **private** (do not enable public access or a custom domain).
2. **Storage & Databases > D1 SQL database** > **Create database** > name it `twurt-uploads`.
3. Open the new database > **Console** tab > paste the contents of `schema.sql` > **Execute**.

## 2. Human check (Turnstile)
1. Dashboard > **Turnstile** > **Add widget**. Hostnames: `twurtchamberlain.com` and your `*.pages.dev` address. Mode: Managed.
2. Copy the **Site key** and **Secret key**.

## 3. Connect everything to the Pages project
Workers & Pages > your project > **Settings**:

**Bindings** (Production *and* Preview):
| Type | Variable name | Value |
|---|---|---|
| R2 bucket | `UPLOADS` | `twurt-uploads` |
| D1 database | `DB` | `twurt-uploads` |

**Variables and secrets** (Production and Preview):
| Name | Type | Value |
|---|---|---|
| `SIGNING_SECRET` | Secret | any long random string (e.g. 40+ characters from a password manager) |
| `TURNSTILE_SECRET` | Secret | Turnstile secret key |
| `TURNSTILE_SITEKEY` | Plain text | Turnstile site key (used at build time) |
| `ACCESS_TEAM_DOMAIN` | Plain text | from step 4, like `yourteam.cloudflareaccess.com` |
| `ACCESS_AUD` | Plain text | from step 4 |

Then **Deployments > Retry deployment** (or push any commit) so the new settings apply.

## 4. Lock the moderation page (Cloudflare Access): required
Without this, the admin API refuses every request, which is safe but means you can't approve anything.
1. Dashboard > **Zero Trust** (free plan, up to 50 users; pick a team name if asked, which becomes `<team>.cloudflareaccess.com`).
2. **Access > Applications > Add an application > Self-hosted.**
3. Application domain: `twurtchamberlain.com` (or your `.pages.dev` address while testing). Add **two paths**: `admin` and `api/admin`. (`/api/admin/*` is protected by Access itself and also re-checked by the code.)
4. Policy: **Allow**, Include **Emails**: Twurt's email and yours.
5. Save, then open the application and copy the **Application Audit (AUD) Tag**. Put that and your team domain in the variables above.

## 5. Try it
1. Visit `/photo-pit/`, upload a photo.
2. Visit `/admin/`, sign in with your email code, and approve it.
3. It appears on the Fan Pics wall.

## Day to day
- **Review:** `/admin/` shows Waiting and Published tabs. Approve (with optional caption), Reject (permanently deletes the file), or Unpublish.
- **Limits** (edit `LIMITS` in `lib/server.js`): photos 10 MB after in-browser resize, videos 90 MB and 60 s, 5 files per submission, 10 files per hour per person.
- **Cost:** R2 free tier is 10 GB with no download fees. If video fills it, upgrade R2 storage or move video to Cloudflare Stream.
- **Housekeeping:** an upload that starts but never finishes leaves an `uploading` row; it's invisible and harmless.
