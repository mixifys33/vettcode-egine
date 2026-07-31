# AI Scanning Debugging Guide

## Problem
The AI scanning feature in Vettcode Engine isn't working in the live hosted version, even though all API keys are configured in the `.env` file.

## Changes Made

### 1. Enhanced Logging Throughout the AI Pipeline

#### OpenRouter Library (`src/lib/openrouter.ts`)
- Added logging to `getApiKeys()` to show how many keys are found
- Added detailed request/response logging in `chatCompletion()`
- Logs now show:
  - API key count
  - Models being used
  - Request attempt numbers
  - Response status codes
  - Content lengths
  - Error details

#### Smart Batch API (`src/app/api/scan/smart-batch/route.ts`)
- Added batch processing logs showing:
  - Number of API keys available
  - Batch index and total batches
  - Number of sections and static findings per batch
  - API key slot being used
  - Prompt length
  - AI response status
  - Number of findings parsed
  - Validation results

#### Smart Scan Orchestrator (`src/lib/smart-scan-orchestrator.ts`)
- Added logs for:
  - AI analysis mode (quick/deep)
  - Number of extracted sections
  - Number of batches created
  - Progress through batch rounds
  - Total findings collected

### 2. Created Test Endpoint

**New file:** `src/app/api/test-ai/route.ts`

This endpoint allows you to quickly test if OpenRouter is working without running a full scan.

**Usage:**
```
GET https://your-domain.com/api/test-ai
```

**What it tests:**
- ✓ API keys are configured
- ✓ Models are configured
- ✓ OpenRouter API is reachable
- ✓ AI responses are being received
- ✓ JSON parsing works

## How to Debug

### Step 1: Test the AI Connection
Visit `/api/test-ai` in your browser or use curl:

```bash
curl https://your-domain.com/api/test-ai
```

**Expected Success Response:**
```json
{
  "success": true,
  "message": "OpenRouter AI is working correctly",
  "details": {
    "apiKeysConfigured": 3,
    "modelsConfigured": ["openrouter/free", "deepseek/deepseek-chat-v3-0324:free"],
    "modelUsed": "deepseek/deepseek-chat-v3-0324",
    "responsePreview": "{\"status\": \"working\", \"message\": \"AI is connected\"}"
  }
}
```

**If it fails:**
- Check the error message in the response
- Check your hosting platform's logs (Vercel, Netlify, etc.)
- Verify environment variables are set correctly

### Step 2: Check Environment Variables

Make sure these are set in your hosting platform:

```env
OPENROUTER_API_KEY_1=sk-or-v1-your-actual-key-here
OPENROUTER_API_KEY_2=sk-or-v1-your-second-key (optional)
OPENROUTER_API_KEY_3=sk-or-v1-your-third-key (optional)

# OR use comma-separated format:
OPENROUTER_API_KEYS=key1,key2,key3

# Models (optional, has defaults)
OPENROUTER_MODELS=openrouter/free,deepseek/deepseek-chat-v3-0324:free,qwen/qwen-2.5-coder-32b-instruct:free
```

**Important:** 
- Keys must start with `sk-or-v1-`
- No quotes around the values
- No spaces in comma-separated lists

### Step 3: Run a Scan and Check Logs

1. Run a scan on your live site
2. Check your hosting platform's logs (e.g., Vercel logs, Netlify logs)
3. Look for these log patterns:

**Good signs:**
```
[OpenRouter] Found 3 API key(s)
[AI Analysis] Starting quick mode analysis
[AI Analysis] Created 5 batches for processing
[Smart Batch 0/5] Processing batch for my-project
[OpenRouter] ✓ Success on attempt 1
[Smart Batch 0] ✓ AI response received from deepseek/deepseek-chat-v3-0324
[Smart Batch 0] ✓ Parsed 3 findings from AI response
[AI Analysis] ✓ Complete: 12 total AI findings
```

**Bad signs:**
```
[OpenRouter] No API keys found! Check environment variables.
[AI Analysis] No content to analyze, skipping AI
[Smart Batch 0] ✗ AI request failed: OpenRouter 401: Unauthorized
[Smart Batch 0] ✗ JSON parse error: Invalid JSON response
```

### Step 4: Common Issues and Solutions

#### Issue: "No API keys found"
**Solution:** Environment variables aren't being read
- Verify variables are set in your hosting platform (not just `.env` file)
- Redeploy after setting environment variables
- Check variable names match exactly (case-sensitive)

#### Issue: "OpenRouter 401: Unauthorized"
**Solution:** Invalid API key
- Verify your OpenRouter API key is correct
- Check if the key has been revoked
- Try generating a new key at https://openrouter.ai/keys

#### Issue: "OpenRouter 429: Rate limited"
**Solution:** Too many requests
- Add more API keys (up to 3 supported)
- Wait a few minutes and try again
- Consider upgrading your OpenRouter plan

#### Issue: "Empty response from OpenRouter"
**Solution:** Model might be unavailable
- Check if the free models are working at https://openrouter.ai/models
- Try different models in `OPENROUTER_MODELS`
- Remove `:free` suffix to use paid models

#### Issue: "JSON parse error"
**Solution:** AI response isn't valid JSON
- This is usually temporary - retry the scan
- Check logs for the raw response
- Model might be overloaded - try a different model

#### Issue: AI runs but returns 0 findings
**Possible causes:**
1. Code is actually very clean (rare!)
2. AST extraction found no high-risk sections
3. All static findings are high-confidence (AI only reviews low-confidence ones)

**Check logs for:**
```
[AI Analysis] Extracted sections: 0
[AI Analysis] Low-confidence static findings: 0
[AI Analysis] No content to analyze, skipping AI
```

If you see this, it means:
- Static analysis is working
- But there's nothing for AI to review
- This is actually good - your code passed static checks!

## Monitoring in Production

### Key Metrics to Watch

1. **API Key Usage**
   - Log: `[OpenRouter] Found X API key(s)`
   - Should be: 1-3 keys

2. **Batch Creation**
   - Log: `[AI Analysis] Created X batches`
   - Quick mode: 1-10 batches
   - Deep mode: up to 48 batches

3. **Success Rate**
   - Look for: `✓ Success` vs `✗ Failed`
   - Should be: >90% success rate

4. **Response Times**
   - Each batch: 5-30 seconds
   - Full scan: 1-5 minutes (quick), 5-15 minutes (deep)

### Setting Up Alerts

If using Vercel/Netlify, set up alerts for:
- `[OpenRouter] No API keys found`
- `✗ AI request failed`
- `OpenRouter 401`
- `OpenRouter 429`

## Removing Debug Logs (Optional)

Once everything is working, you can remove the verbose logging:

1. Search for `console.log` in:
   - `src/lib/openrouter.ts`
   - `src/app/api/scan/smart-batch/route.ts`
   - `src/lib/smart-scan-orchestrator.ts`

2. Keep `console.error` logs (for production debugging)

3. Remove or comment out `console.log` statements

## Need More Help?

1. Check OpenRouter status: https://status.openrouter.ai/
2. Review OpenRouter docs: https://openrouter.ai/docs
3. Check your hosting platform's documentation for environment variables
4. Look at the full logs in your hosting dashboard

## Quick Checklist

- [ ] Environment variables are set in hosting platform
- [ ] `/api/test-ai` returns success
- [ ] Logs show API keys are found
- [ ] Logs show batches are being created
- [ ] Logs show AI responses are received
- [ ] Findings are being parsed successfully
- [ ] Final report shows AI findings (not just static)
