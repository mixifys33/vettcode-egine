# VettCode Engine

**AI-powered codebase security and quality scanner** — Upload any codebase and get a brutally honest 0-100 security/quality score with detailed vulnerability reports.

## 🎯 What It Does

VettCode Engine analyzes your codebase for:

- **Security vulnerabilities** (SQL injection, XSS, hardcoded secrets, auth bypass, etc.)
- **Production failures** (unhandled errors, race conditions, memory leaks)
- **Code quality issues** (magic numbers, deep nesting, commented code)
- **Database risks** (N+1 queries, missing transactions, SQL injection)
- **Logic errors** and edge cases that can break your system
- **Performance problems** (inefficient queries, chained operations)
- **React-specific issues** (missing keys, inline functions, useEffect deps)

## 🚀 Key Features

### 1. **Hybrid Analysis Pipeline**

```
User uploads codebase
    ↓
Static Analysis (pattern-based) → catches 70-80% of issues instantly
    ↓
AST Parsing → extracts only high-risk code sections
    ↓
AI Analysis (free models) → deep reasoning on risky code only
    ↓
Verification Layer → validates AI findings, removes false positives
    ↓
Report Generation → merged results with confidence scores
```

### 2. **Token Efficiency**

- **70-90% token reduction** through smart AST extraction
- Only sends high-risk code sections to AI (functions with user input, DB queries, auth logic, etc.)
- Skips boilerplate, tests, configs, and low-risk code
- 3 OpenRouter API keys in rotation for parallel processing

### 3. **Accuracy & Verification**

- **Static analysis** catches obvious issues with high confidence
- **AI analysis** provides deep reasoning on complex patterns
- **Verification layer** cross-validates AI findings against actual code
- **Confidence scores** (high/medium/low) for every finding
- **False positive detection** prevents hallucinated issues

### 4. **Strict Scoring**

- **0-100 score** with no sugar-coating
- Deducts heavily for critical/high severity issues
- Confidence-weighted scoring (low-confidence findings count less)
- Letter grades: A+ (95+) to F (<40)

## 📦 Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **AI:** OpenRouter (free models: deepseek, qwen)
- **AST Parsing:** @babel/parser + @babel/traverse
- **Deployment:** Vercel (zero-config)
- **Styling:** CSS variables + Tailwind-inspired utilities

## 🛠️ Setup

### 1. Clone & Install

```bash
git clone https://github.com/mixifys33/vettcode-egine.git
cd vettcode-egine
npm install
```

### 2. Configure API Keys

Create `.env.local`:

```env
# Add up to 3 OpenRouter API keys for parallel scanning
OPENROUTER_API_KEY_1=sk-or-v1-your-first-key
OPENROUTER_API_KEY_2=sk-or-v1-your-second-key
OPENROUTER_API_KEY_3=sk-or-v1-your-third-key

# Free models (comma-separated fallback chain)
OPENROUTER_MODELS=openrouter/free,deepseek/deepseek-chat-v3-0324:free,qwen/qwen-2.5-coder-32b-instruct:free

# Site URL (optional, for OpenRouter rankings)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Get free API keys at [OpenRouter](https://openrouter.ai/)

### 3. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
# Project Settings → Environment Variables → Add the 3 API keys
```

## 📊 How It Works

### Static Analysis (Fast)

- **60+ security patterns** (SQL injection, XSS, secrets, command injection, etc.)
- **Code quality checks** (magic numbers, deep nesting, var usage, any types)
- **Production issues** (empty catch blocks, floating promises, missing timeouts)
- **React patterns** (missing keys, inline functions, useEffect deps)
- **Database issues** (N+1 queries, missing transactions)

### AST Extraction (Smart)

- Parses JavaScript/TypeScript with Babel
- Extracts only high-risk functions:
  - Functions handling user input
  - Database queries
  - Authentication/authorization logic
  - File system operations
  - Network requests
  - Command execution
- Calculates risk scores based on:
  - User input handling
  - Database operations
  - Auth logic
  - Cyclomatic complexity
  - Missing error handling

### AI Analysis (Deep)

- Receives only extracted high-risk sections (not full files)
- Verifies low-confidence static findings
- Provides context-aware reasoning
- Uses free models (deepseek, qwen) for cost efficiency

### Verification Layer (Accurate)

- Cross-validates AI findings with static analysis
- Checks if evidence matches actual code
- Category-specific validation:
  - SQL injection: checks for parameterized queries
  - XSS: checks for sanitization
  - Secrets: checks for env variables
- Assigns confidence scores
- Filters false positives

## 🎯 Supported Languages

- **Full AST support:** JavaScript, TypeScript, JSX, TSX
- **Pattern-based:** Python, Go, Java, PHP, Ruby
- **Auto-detection** based on file extension

## 📈 Limits

- **Files:** Up to 1000 files per scan
- **File size:** 500KB per file
- **Total size:** 15MB per scan
- **Batches:** Processed in parallel (3 at a time)

These limits are generous because we extract only high-risk code sections.

## 🔒 Security

- API keys stored in environment variables (never in code)
- No data persistence (stateless scans)
- Files processed in-memory only
- No external data transmission except to OpenRouter API

## 📝 Example Report

```json
{
  "score": 67,
  "grade": "C+",
  "summary": "Analyzed 45 files (3,421 lines). Found 12 verified issues.",
  "executiveVerdict": "MODERATE: This codebase has 12 issues spanning security, code quality, and reliability concerns...",
  "findings": [
    {
      "id": "sql-injection-users-api-42",
      "severity": "critical",
      "category": "security",
      "title": "SQL Injection via String Concatenation",
      "description": "User input directly concatenated into SQL query",
      "file": "src/api/users.ts",
      "line": 42,
      "evidence": "db.query(`SELECT * FROM users WHERE id = ${req.params.id}`)",
      "mitigation": "Use parameterized queries: db.query('SELECT * FROM users WHERE id = $1', [req.params.id])",
      "prevention": "Always use ORMs or parameterized queries; never concatenate user input into SQL"
    }
  ],
  "strengths": [
    "Strong type safety with TypeScript",
    "Proper use of environment variables for configuration"
  ],
  "criticalBlockers": [
    "SQL Injection via String Concatenation in src/api/users.ts:42"
  ],
  "metadata": {
    "reportConfidence": 85,
    "reportConfidenceGrade": "A",
    "reportConfidenceExplanation": "10 confirmed, 2 likely, 0 uncertain out of 12 total findings"
  }
}
```

## 🤝 Contributing

Contributions welcome! Areas for improvement:

- Add more language-specific patterns
- Improve AST extraction for other languages
- Add more verification rules
- Enhance AI prompts for better accuracy

## 📄 License

MIT

## ⚠️ Disclaimer

VettCode Engine is a tool to assist in code review, not a replacement for:

- Professional security audits
- Penetration testing
- Manual code review
- Automated testing

Always validate findings and conduct thorough testing before production deployment.
