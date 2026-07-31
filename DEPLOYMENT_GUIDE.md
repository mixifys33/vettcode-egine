# Web Scanner Deployment Guide - Unified Auth

## Quick Deployment Steps

### 1. Push Code to GitHub

```bash
cd C:\Users\USER\Desktop\VETTCODE\Vettcode-scanner

# Check what will be committed
git status

# Add all changes
git add .

# Commit with descriptive message
git commit -m "feat: Unified authentication with VettCode CLI landing page

- Updated auth.ts to use unified API config
- Modified AuthModal to call landing page API routes
- Removed phone number and email verification flow
- Now using vettcode_token, vettcode_developer localStorage keys
- Added UNIFIED_AUTH_SETUP.md documentation
- Created .env.local with landing page API URL"

# Push to GitHub
git push origin main
```

### 2. Configure Vercel Environment Variables

Go to your Vercel project for the web scanner and add these environment variables:

**Required:**

```
NEXT_PUBLIC_LANDING_API_URL=https://vettcodecli.vercel.app
NEXT_PUBLIC_GOOGLE_CLIENT_ID=1035836726019-emdkl3m6p7jcvl2i9fg3qcltc6ppvju2.apps.googleusercontent.com
OPENROUTER_API_KEY_1=sk-or-v1-your-openrouter-key-here
```

**Optional:**

```
OPENROUTER_MODELS=openrouter/free,deepseek/deepseek-chat-v3-0324:free,qwen/qwen-2.5-coder-32b-instruct:free
NEXT_PUBLIC_SITE_URL=https://vetted-xi.vercel.app
```

### 3. Redeploy on Vercel

After pushing to GitHub, Vercel should auto-deploy. Or manually trigger:

1. Go to https://vercel.com/dashboard
2. Find your web scanner project
3. Click "Deploy" or wait for auto-deployment
4. Monitor build logs for errors

### 4. Verify Google OAuth Setup

Go to Google Cloud Console:
https://console.cloud.google.com/apis/credentials

**Check that both domains are authorized:**

**Authorized JavaScript origins:**

- https://vettcodecli.vercel.app
- https://vetted-xi.vercel.app

**Authorized redirect URIs:**

- https://vettcodecli.vercel.app
- https://vetted-xi.vercel.app

If not added, click "Edit" on your OAuth 2.0 Client ID and add them.

### 5. Test the Authentication Flow

#### Test 1: Email/Password Signup

1. Go to https://vetted-xi.vercel.app
2. Click "Sign in"
3. Click "Register"
4. Fill out: Name, Email, Password
5. Click "Create account"
6. Should see success message and be logged in
7. Header should show your name

#### Test 2: Email/Password Login

1. Click "Sign out"
2. Click "Sign in"
3. Enter email and password
4. Click "Sign in"
5. Should be logged in
6. Header should show your name

#### Test 3: Google Sign-In

1. Click "Sign out"
2. Click "Sign in"
3. Click "Continue with Google"
4. Select Google account
5. Should see authentication modal with progress
6. Should be logged in
7. Header should show your name

#### Test 4: Unlimited Scans

1. While logged in, scan a project
2. Should work without limit warning
3. Scan 5-10 more projects
4. Should never see "10 scan limit" message

#### Test 5: Cross-App Authentication

1. While logged in on web scanner
2. Open https://vettcodecli.vercel.app in new tab
3. You'll need to login again (different domain)
4. Use SAME email/password
5. Should work (shared database)

### 6. Verify MongoDB Records

1. Go to MongoDB Atlas
2. Select your cluster
3. Browse Collections
4. Database: `vettcode-developers`
5. Collection: `vettcodedevelopers`
6. Should see user records from both apps
7. Email should be unique (no duplicates)

### 7. Check for Errors

**Browser Console:**

- Open DevTools (F12)
- Check Console tab for errors
- Look for 404s, CORS errors, or auth failures

**Network Tab:**

- Check API calls to landing page
- Should see `POST https://vettcodecli.vercel.app/api/developer-auth/login`
- Response should be 200 with token

**localStorage:**

- Open DevTools → Application → Local Storage
- Should see:
  - `vettcode_token`: JWT string
  - `vettcode_developer`: JSON object with user data
  - `vettcode_authenticated`: "true"

## Troubleshooting

### Issue: 404 on API calls

**Symptoms:**

```
POST https://vettcodecli.vercel.app/api/developer-auth/login 404
```

**Solutions:**

1. Check landing page is deployed and accessible
2. Verify API routes exist in landing page repo
3. Try accessing API directly: https://vettcodecli.vercel.app/api/developer-auth/login
4. Check Vercel build logs for landing page

### Issue: CORS errors

**Symptoms:**

```
Access to fetch at 'https://vettcodecli.vercel.app/api/...' from origin 'https://vetted-xi.vercel.app' has been blocked by CORS policy
```

**Solutions:**

1. Add CORS headers to landing page API routes:

```typescript
return new NextResponse(JSON.stringify(data), {
  status: 200,
  headers: {
    "Access-Control-Allow-Origin": "https://vetted-xi.vercel.app",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  },
});
```

2. Handle OPTIONS preflight:

```typescript
if (request.method === "OPTIONS") {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "https://vetted-xi.vercel.app",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
```

### Issue: Google Sign-In popup blocked

**Symptoms:**

- Click "Continue with Google"
- Nothing happens
- Or popup appears then disappears

**Solutions:**

1. Check browser allows popups
2. Verify Google Client ID is correct
3. Check both domains are in Google Console
4. Try in incognito mode
5. Clear browser cache

### Issue: Token expired

**Symptoms:**

```
{ "error": "Invalid token" }
{ "error": "Token expired" }
```

**Solutions:**

1. Tokens expire after 7 days
2. User needs to login again
3. This is normal behavior
4. Could extend expiration in JWT config:

```typescript
const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
```

### Issue: Can't see user name in header

**Symptoms:**

- Logged in successfully
- But header still shows "Sign in" button
- Name not displayed

**Solutions:**

1. Check localStorage has `vettcode_developer`
2. Verify component is reading from localStorage
3. Check `getAuthUser()` function works
4. Try refreshing page
5. Check for JavaScript errors in console

## Environment Variables Checklist

### Landing Page (vettcodecli.vercel.app)

- [x] `MONGODB_URI` - MongoDB connection string
- [x] `JWT_SECRET` - Secret key for JWT signing
- [x] `GOOGLE_CLIENT_ID` - Google OAuth client ID
- [x] `OPENROUTER_API_KEY` - For CLI scanning

### Web Scanner (vetted-xi.vercel.app)

- [ ] `NEXT_PUBLIC_LANDING_API_URL` - Landing page URL
- [ ] `NEXT_PUBLIC_GOOGLE_CLIENT_ID` - Google OAuth client ID
- [ ] `OPENROUTER_API_KEY_1` - For AI scanning
- [ ] `OPENROUTER_MODELS` - AI models to use
- [ ] `NEXT_PUBLIC_SITE_URL` - Web scanner URL

## Security Checklist

- [x] `.env.local` is in `.gitignore`
- [x] No API keys in source code
- [x] Passwords hashed with bcrypt
- [x] JWT tokens signed and validated
- [x] Google tokens verified server-side
- [x] No console.log statements with sensitive data
- [x] CORS configured for specific domains
- [ ] SSL/HTTPS enabled (Vercel default)
- [ ] Rate limiting configured (optional)

## Success Criteria

✅ **Authentication Working:**

- Users can signup with email/password
- Users can login with email/password
- Google Sign-In works
- JWT tokens generated and stored
- localStorage keys correct

✅ **Cross-App Functionality:**

- Same database used by both apps
- User created on one app can login on other
- No duplicate user records in MongoDB

✅ **User Experience:**

- Logged in users see their name
- Unlimited scans for authenticated users
- Guest users limited to 10 scans
- Logout clears session

✅ **No Errors:**

- No 404s on API calls
- No CORS errors
- No JavaScript console errors
- Google Sign-In popup works

## Post-Deployment Tasks

1. **Monitor for Issues**
   - Check Vercel logs for errors
   - Monitor user signups in MongoDB
   - Watch for failed API calls

2. **User Testing**
   - Ask beta users to test signup flow
   - Get feedback on UX
   - Check for edge cases

3. **Documentation Updates**
   - Update main README if needed
   - Add authentication section
   - Document any issues found

4. **Performance Optimization**
   - Check API response times
   - Monitor MongoDB queries
   - Optimize if needed

5. **Future Enhancements**
   - Add email verification
   - Implement password reset
   - Add user dashboard on web scanner
   - Consider OAuth for better cross-domain SSO

## Need Help?

- Check `UNIFIED_AUTH_SETUP.md` for architecture details
- Review `AUTHENTICATION_UNIFICATION_COMPLETE.md` for full summary
- Check Vercel build logs for deployment errors
- Inspect browser console for client-side errors
- Check MongoDB logs for database issues

## Deployment Complete! 🎉

Once all tests pass, your unified authentication system is live and ready for users!

Both apps now share the same authentication backend, providing a seamless experience across the VettCode ecosystem.
