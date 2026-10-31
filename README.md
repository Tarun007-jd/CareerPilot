# CareerPilot AI

Voice-first AI career pivot coach. Your Career. Your Voice. Your Roadmap.

CareerPilot compares a student's real skills and resume against a user-supplied job description, then produces tailored skill-gap analysis, a four-week adaptive roadmap, portfolio projects, mock interviews, and application insights.

## Stack

- Next.js 16 App Router, TypeScript, Tailwind CSS
- shadcn-style component system, Lucide icons, Recharts
- Gemini via the official `@google/genai` SDK with server-side structured JSON
- Versioned LocalStorage with a storage abstraction for a future MongoDB adapter
- Wispr Flow desktop dictation for voice input (no fake in-browser microphone)

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

## Environment variables

```env
GEMINI_API_KEY=your_server_side_key
GEMINI_MODEL=gemini-2.5-flash
```

`GEMINI_API_KEY` is read only inside server-side route handlers. It is never sent to the browser or written to LocalStorage.

If `GEMINI_API_KEY` is absent, CareerPilot runs in a clearly labeled **Local coach** mode. Resume parsing, skill-gap matching, roadmap generation, project recommendations, interview scoring, application insights, and voice intent parsing remain functional using deterministic local logic. AI calls that fail while a key is configured return a real error and are never replaced by fake success.

## Core workflows

1. Create profile and target role in **Career Profile**.
2. Upload/paste a resume in **Resume Intelligence** and review extracted fields.
3. Paste a real job description in **Skill Gap Analysis** and run analysis.
4. Generate and complete tasks in **Learning Roadmap**.
5. Generate and save portfolio projects in **Projects**.
6. Generate questions and submit answers in **Mock Interview**.
7. Add applications and generate data-driven insights in **Applications**.
8. Use **Wispr Flow** to dictate into any text field. The persistent **CareerPilot command center** parses intent, previews data changes, and requires confirmation before saving.

## Testing

```bash
npm run lint
npm run typecheck
npm run build
```

## Deploy to Vercel

Import the repository and add `GEMINI_API_KEY` and optionally `GEMINI_MODEL` in Project Settings → Environment Variables. No other configuration is required.

## Data and privacy

Career data is stored in the browser's LocalStorage under the versioned key `careerpilot:v1`. Use **Settings → Reset workspace** to erase it. Mock interview and skill proficiency scores are AI-generated or locally inferred estimates, not verified certifications. Job descriptions are always user-supplied; CareerPilot does not scrape live listings.

## Project structure

```
app/                  Pages and API route handlers
components/           Design system, shell, charts, feature modules
lib/                  Schemas, storage, Gemini client, local coach, domain logic
public/               Static assets
```
