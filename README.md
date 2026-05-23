# Vettcode Engine

AI-powered codebase vetting: security vulnerabilities, production risks, typing/logic flaws, and database failure modes — with a **strict 0–100 score** and full mitigation report.

Built for [Vercel](https://vercel.com) + [OpenRouter](https://openrouter.ai) (free models supported).

## Features

- Upload a **project folder** or **ZIP** (browser directory picker)
- Ignores `node_modules`, `dist`, `.git`, `vendor`, build caches, binaries, lockfiles, etc.
- Splits code into batches analyzed in **parallel** using up to **3 OpenRouter API keys**
- Merges batch results into one **harsh** final report with findings, mitigations, and prevention steps
- Download report as JSON

## Setup (local)

```bash
cd Vettcode-engine
npm install
cp .env.example .env.local
# Edit .env.local — add your OpenRouter keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy on Vercel

1. Push this folder to GitHub (or import from local).
2. Import the repo in [Vercel](https://vercel.com/new).
3. Add environment variables (Settings → Environment Variables):

| Variable | Description |
|----------|-------------|
| `OPENROUTER_API_KEY_1` | Primary OpenRouter key |
| `OPENROUTER_API_KEY_2` | Second key (parallel scans) |
| `OPENROUTER_API_KEY_3` | Third key (parallel scans) |
| `OPENROUTER_MODELS` | Optional. Default: free model chain |
| `NEXT_PUBLIC_SITE_URL` | Your production URL (e.g. `https://your-app.vercel.app`) |

4. Deploy. Pro plan recommended for 60s function timeout on large repos.

Alternatively set a single variable:

```
OPENROUTER_API_KEYS=key1,key2,key3
```

## OpenRouter free models

Default model chain uses free tiers (`openrouter/free` and `:free` variants). Free tiers have rate limits; three keys help throughput.

Get keys at [openrouter.ai/keys](https://openrouter.ai/keys).

## Limits

- Max ~400 source files and ~4MB total per scan (Vercel payload/time limits)
- Very large files are truncated for AI context
- AI findings are not a substitute for SAST/DAST and human review

## License

MIT
