# Reflective Canvas App

A web-based application for reflection-based learning integrated into Canvas via iframe. Participants answer a pedagogically designed question, review related content (text, video, or links), then revisit their answer. An LLM (OpenAI GPT) provides automated feedback based solely on the change between responses and the provided source text.

## Features

* Canvas-embedded pages via iframe
* Admin UI for creating and editing pages without manual file management
* Field to paste "RAG data" (source text) used by the model
* Two-phase workflow: initial answer, review material, revised answer
* Automatic comparison and constructive feedback from GPT
* Logging of all interactions per page, with view/download in admin
* Group-level insights and recommendations (common misunderstandings)
* GDPR-friendly: anonymous storage, no login, EU hosting, HTTPS only

## Tech Overview

* Frontend: React, Vite, Tailwind CSS
* UI Components: shadcn/ui, Lucide React, Framer Motion
* Routing: React Router (`/page/:slug`, `/admin`)
* State: React Hooks
* Database: Supabase (PostgreSQL) with row-level security
* AI: OpenAI GPT-4 via serverless functions
* Hosting: Vercel

## Getting Started

1. Clone and install dependencies:

   ```bash
   git clone https://github.com/turbomacka/reflective-canvas-app.git
   cd reflective-canvas-app
   npm install
   ```
2. Copy and fill environment variables:

   ```bash
   cp .env.example .env.local
   ```

   ```ini
   VITE_OPENAI_API_KEY=sk-...
   VITE_SUPA_URL=https://<your-supabase>.supabase.co
   VITE_SUPA_KEY=<anon-public-key>
   ```
3. Create database tables in Supabase SQL editor (EU region recommended):

   ```sql
   create table pages (
     slug text primary key,
     title text,
     question text,
     html text,
     source text
   );
   create table conversation_logs (
     id bigserial primary key,
     slug text references pages(slug),
     first text,
     second text,
     feedback text,
     created_at timestamptz default now()
   );
   alter table pages enable row level security;
   alter table conversation_logs enable row level security;
   create policy "anon pages" on pages for all using (true);
   create policy "anon logs" on conversation_logs for all using (true);
   ```
4. Run locally:

   ```bash
   npm run dev
   ```

   * Admin: `http://localhost:5173/admin`
   * Page:  `http://localhost:5173/page/<slug>`

## Deployment

1. Log in to Vercel CLI and link project:

   ```bash
   npm i -g vercel
   vercel login
   vercel link
   ```
2. Add environment variables to Vercel (production):

   ```bash
   vercel env add VITE_OPENAI_API_KEY production
   vercel env add VITE_SUPA_URL       production
   vercel env add VITE_SUPA_KEY       production
   ```
3. Deploy:

   ```bash
   vercel --prod
   ```

## Canvas Embed Example

```html
<iframe
  src="https://reflective-canvas-app.vercel.app/page/<slug>"
  width="100%"
  height="800"
  frameborder="0"
  scrolling="auto"
></iframe>
```

## Privacy & Security

* Anonymous logging of text responses and timestamps
* No linkage to student identities
* Data stored in EU region via Supabase
* HTTPS only
* Data retention managed via Supabase policies or scripts

## Contact

Marcus S. Hjärne [marcus.s.hjarne@gmail.com](mailto:marcus.s.hjarne@gmail.com)

## License

MIT License. See [LICENSE](LICENSE).
