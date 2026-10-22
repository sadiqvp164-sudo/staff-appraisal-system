# Staff Appraisal System

A React + Vite starter for a full Staff Appraisal & Performance Management System based on the uploaded **Staff Appraisal & Performance Management Policy 2026–2027**.

## Current status — read this first

This starter includes:
- Responsive React UI with Overview, Staff Directory, Duties & Monitoring, Special Tasks, Appraisal Scoring, Special Points, and Reports pages.
- Local preview interactions for task creation and domain rating calculation.
- Supabase client configuration and email/password sign-in flow.
- SQL starter schema for four roles, seven domains, duties, special tasks, evidence, separate special points, appraisals, development plans, appeals, and audit logs.
- Row Level Security (RLS) policies as a baseline.

**It is not yet a production-ready application.** Several pages deliberately use sample data or show placeholders. They do not yet read/write all records from Supabase, generate actual exports, or implement the complete annual workflow. Treat the SQL RLS policies as a starting point for security review, not a guarantee of complete security.

## Policy mapping

The seven official domain weights are seeded in `supabase/schema.sql`:

| Code | Domain | Weight |
|---|---|---:|
| D1 | Teaching, Learning & Learner Achievement | 25 |
| D2 | Student Mentoring, Wellbeing & Holistic Development | 15 |
| D3 | Campus Engagement & Institutional Responsibilities | 15 |
| D4 | Collaboration, Communication & Campus Community | 10 |
| D5 | Personal & Professional Development, TPD, Research & Growth | 10 |
| D6 | Professionalism, Reliability & Institutional Responsibility | 15 |
| D7 | Academic Leadership, Governance & Institutional Contribution | 10 |
| | **Total** | **100** |

Weighted score formula from the policy:

`weighted_score = (rating / 5) * allocated_weight`

Ratings are 1–5. N/A needs a recorded justification and must not silently become zero. Domain-level scoring must not be confused with the detailed subdomain criteria: load the full approved criteria and weights from the policy before using the system for formal appraisal.

**Special Points are stored separately** in `special_point_entries`. They are not added to the 100-mark score automatically. The institution must formally approve any future rule connecting points to formal appraisal.

## Requirements

- Node.js 20 LTS or newer recommended
- npm
- A Supabase project
- A Vercel account for deployment

## Run locally

1. Extract the project ZIP and open a terminal in the project directory.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env.local`.
4. Fill in the values you must supply:

   ```env
   VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
   ```

   Get these from **Supabase Dashboard → Project Settings → API** (or the project's Connect panel). Use the publishable/anon key only. **Never** put `service_role` or other secret keys in frontend environment variables.

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open the local URL Vite prints in the terminal. If Supabase is not configured, the UI runs in preview mode with illustrative sample data. Preview-mode actions do not persist.

## Configure Supabase

1. Create a Supabase project.
2. Open **SQL Editor** and run `supabase/schema.sql`.
3. In **Authentication → Providers**, enable Email sign-in.
4. Create the first user from the Supabase Auth dashboard. The trigger creates a `profiles` row with the `teacher` role by default.
5. To grant the first Admin role, use a trusted project-owner session in SQL Editor after confirming the user's identity:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = (
     select id from auth.users
     where email = 'YOUR-ADMIN-EMAIL'
   );
   ```

   Replace `YOUR-ADMIN-EMAIL` with the actual address. Do not build a public client-side role editor. Repeat for other roles only after the institution authorises them.

6. In **Storage**, create a **private** bucket named `appraisal-evidence`. Do not make it public. Add and test Storage object policies before uploading real evidence. Use signed URLs for authorised downloads.
7. Add your approved staff, departments, coordinator assignments and role mappings.
8. Test access using a separate test account for each of the four roles.

## Deploy to Vercel

1. Push this folder to a private Git repository.
2. Import the repository in Vercel.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel Project Settings → Environment Variables.
4. Deploy. Build command is `npm run build`; output directory is `dist`.
5. In Supabase Auth URL Configuration, set the production Site URL and allowed redirect URLs to your Vercel domain.
6. Redeploy after changing environment variables.

## Security checklist before real staff data

- Review every RLS policy with a security-minded developer and test all four roles.
- Add Storage object policies for `appraisal-evidence`; private bucket alone is not enough.
- Ensure a teacher cannot change their role, appraisal status, approved points, final score, or another person's records by direct API calls.
- Move final scoring, status transitions and audit logging into database functions or trusted server-side code where appropriate.
- Add database triggers for immutable audit records, controlled status transitions, and server-calculated scores. Do not trust a score sent by the browser.
- Keep student wellbeing information in a separately restricted data model; minimise personal details.
- Define retention, deletion, backup, restore and incident-response procedures.
- Do not use real personal data until role-based tests and backups are verified.

## Suggested build sequence

1. Complete profile administration and invite/disable accounts.
2. Connect staff, task, duty and evidence pages to Supabase.
3. Add the full approved appraisal criteria/subdomain weights from the policy PDF.
4. Implement self-assessment, supervisor ratings, evidence checks, moderation, authority approval, and appeals.
5. Implement separate special-points approval and audit trail.
6. Implement reports and exports.
7. Run role-by-role security testing and restore a backup in a test project.

## Files

- `src/App.jsx` — first UI module and preview interactions
- `src/lib/supabase.js` — Supabase client
- `src/styles.css` — responsive styling
- `supabase/schema.sql` — initial schema and RLS policies
- `.env.example` — configuration placeholders

## Important scoring note

The starter preserves the PDF's **seven domain weights totaling 100**. The PDF also contains detailed subdomain criteria and scorecards. Before formal use, transcribe and verify every approved criterion and subdomain weight against the final policy version. Do not infer missing weights or automatically count Special Points toward the official appraisal.
