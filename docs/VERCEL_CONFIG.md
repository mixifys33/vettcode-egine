# Vercel Configuration Guide

## Function Timeouts

Vettcode Engine uses extended function timeouts for AI analysis:

### Current Settings:

- **Server-side timeout**: 300 seconds (5 minutes) - `maxDuration` in route.ts
- **Client-side timeout**: 280 seconds (4min 40s) - AbortController in orchestrator
- **Default Vercel timeout**: 10 seconds (Hobby), 60 seconds (Pro), 300 seconds (Pro with config)

### Why These Timeouts?

AI analysis can take time, especially for:

- Large codebases (1000+ files)
- Deep scan mode (up to 48 batches)
- Complex code with many high-risk sections
- Free AI models (slower than paid)

### Vercel Plan Requirements:

**Hobby Plan** (Free):

- Max timeout: 10 seconds
- ❌ Not sufficient for AI scanning
- ✅ Works for static analysis only

**Pro Plan** ($20/month):

- Max timeout: 300 seconds (5 minutes) with `maxDuration` config
- ✅ Sufficient for most scans
- ✅ Recommended for production use

### If You're on Hobby Plan:

You have two options:

1. **Upgrade to Pro** (recommended)
   - Full AI scanning support
   - Faster performance
   - Better reliability

2. **Disable AI scanning** (free alternative)
   - Edit `src/lib/smart-scan-orchestrator.ts`
   - Return empty array from `runAIAnalysis()`
   - Static analysis still works (catches 70-80% of issues)

### Timeout Errors in Logs:

If you see `FUNCTION_INVOCATION_TIMEOUT` or `504 Gateway Timeout`:

1. **Check your Vercel plan**:
   - Go to Vercel Dashboard → Settings → General
   - Look for "Function Duration"

2. **Verify environment variables**:
   - Ensure `OPENROUTER_API_KEY_1` is set
   - Check that models are configured

3. **Try Quick Scan mode**:
   - Uses fewer batches (1-10 vs up to 48)
   - Faster completion
   - Still catches most issues

4. **Reduce codebase size**:
   - Scan specific directories
   - Exclude large dependencies
   - Use .gitignore patterns

### Monitoring Performance:

Check your Vercel function logs for:

```
[AI Analysis] Created X batches for processing
[AI Analysis] Round 1 complete: X findings
[AI Analysis] ✓ Complete: X total AI findings
```

If batches are timing out:

```
Batch X failed: FUNCTION_INVOCATION_TIMEOUT
```

This means the function exceeded the timeout limit.

### Optimizing for Faster Scans:

1. **Use Quick Scan mode** (default)
   - Analyzes priority files only
   - 1-4 minutes typical
   - Good for most use cases

2. **Add more API keys**
   - Up to 3 keys supported
   - Parallel processing
   - Faster completion

3. **Use paid AI models**
   - Faster response times
   - Better quality
   - More reliable

4. **Scan smaller codebases**
   - Focus on src/ directory
   - Exclude tests and docs
   - Use ignore patterns

### Environment Variables:

Required for AI scanning:

```env
OPENROUTER_API_KEY_1=sk-or-v1-your-key-here
OPENROUTER_API_KEY_2=sk-or-v1-second-key (optional)
OPENROUTER_API_KEY_3=sk-or-v1-third-key (optional)

OPENROUTER_MODELS=openrouter/free,deepseek/deepseek-chat-v3-0324:free
```

### Troubleshooting:

**Problem**: All batches timeout
**Solution**: Upgrade to Vercel Pro or disable AI scanning

**Problem**: Some batches timeout
**Solution**: Add more API keys for parallel processing

**Problem**: Slow AI responses
**Solution**: Use paid models or add more keys

**Problem**: No AI findings in report
**Solution**: Check logs for timeout errors, verify API keys

### Support:

- Vercel Docs: https://vercel.com/docs/functions/serverless-functions/runtimes#max-duration
- OpenRouter: https://openrouter.ai/docs
- GitHub Issues: https://github.com/mixifys33/vettcode-egine/issues
