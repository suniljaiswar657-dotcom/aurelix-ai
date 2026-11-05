# AURELIX — Intelligence, Orchestrated

Original independent AI-company and AI-platform frontend.

## Run locally
Open `index.html` in a modern browser, or deploy this repository to Vercel as a static site.

## Included
- Responsive company and platform interface
- AI Assistant local guidance interface
- Specialist agent task queue
- Creative brief generator
- Local workflow builder
- Business objective and initiative tracker
- Developer Hub and Control Center
- Browser-local persistence and JSON export

## Integration status
This is a functional frontend MVP, not a live AI backend. Live model responses require provider configuration. Multi-agent execution, image/video generation, scheduled workflows, external APIs, user accounts and cloud sync are not connected. Never place provider API secrets in browser code. Add secure server-side endpoints before enabling live AI. Supabase is optional and should be introduced only when authentication or shared cloud data is required.

## Deploy
Import this GitHub repository into Vercel. Select Framework Preset: Other, leave Build Command empty, set Output Directory to `.`, then deploy.


## Enable live AI assistant
The server-side endpoint is `/api/assistant`. It accepts POST requests with a JSON `message` field and never sends provider credentials to the browser.

In Vercel → Project Settings → Environment Variables, add:
- `AI_API_KEY`: your AI provider API key (keep it secret)
- `AI_MODEL`: a chat-completions compatible model name
- `AI_BASE_URL` (optional): HTTPS chat-completions endpoint; defaults to the OpenAI API endpoint

Redeploy after adding the variables. The endpoint currently expects an OpenAI-compatible Chat Completions response format. Do not commit keys to GitHub or put them in frontend code. The built-in per-instance request throttle is a basic safeguard, not a substitute for durable production rate limiting or authenticated user quotas.
