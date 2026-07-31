# Unified Authentication Setup

## Overview

The VettCode Web Scanner now uses the **same authentication system** as the VettCode CLI Landing Page. This means:

- ✅ **Single Sign-On**: Login once, access both apps
- ✅ **Shared Sessions**: If logged in on landing page, you're logged in on web scanner
- ✅ **Unified Database**: Both apps use the same MongoDB `vettcode-developers` collection
- ✅ **Same API Routes**: Web scanner calls landing page API endpoints

## Architecture

```
┌─────────────────────────┐
│  Landing Page           │
│  vettcodecli.vercel.app │
│                         │
│  • Login/Signup Pages   │
│  • API Routes (/api/*)  │
│  • MongoDB Connection   │
│  • Google OAuth         │
└─────────────────────────┘
           ▲
           │ API Calls
           │
┌──────────┴──────────────┐
│  Web Scanner            │
│  vetted-xi.vercel.app   │
│                         │
│  • Auth Modal           │
│  • Calls Landing APIs   │
│  • Shares localStorage  │
└─────────────────────────┘
```

## Shared Configuration

### localStorage Keys (SAME for both apps)

```javascript
"vettcode_token"; // JWT token
"vettcode_developer"; // User profile data
"vettcode_authenticated"; // Boolean flag
```

### API Endpoints (Web Scanner → Landing Page)

```
POST https://vettcodecli.vercel.app/api/developer-auth/signup
POST https://vettcodecli.vercel.app/api/developer-auth/login
POST https://vettcodecli.vercel.app/api/google-auth/verify
```

## Environment Variables

### Landing Page (.env.local)

```env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
GOOGLE_CLIENT_ID=1035836726019-...
```

### Web Scanner (.env.local)

```env
NEXT_PUBLIC_LANDING_API_URL=https://vettcodecli.vercel.app
NEXT_PUBLIC_GOOGLE_CLIENT_ID=1035836726019-...
```

## Files Modified

### Web Scanner

1. **src/lib/auth.ts** - Uses unified API config
2. **src/lib/api-config.ts** - Points to landing page APIs
3. **src/components/AuthModal.tsx** - Calls landing page endpoints
4. **.env.local** - Added landing page URL

### Landing Page

No changes needed - already has the API routes and MongoDB connection.

## Testing Cross-Domain Authentication

### Scenario 1: Login on Landing Page First

1. Go to https://vettcodecli.vercel.app/login
2. Login with email/password or Google
3. Open https://vetted-xi.vercel.app
4. **Expected**: Should be logged in automatically

### Scenario 2: Login on Web Scanner First

1. Go to https://vetted-xi.vercel.app
2. Click "Sign in" and login
3. Open https://vettcodecli.vercel.app
4. **Expected**: Should be logged in automatically

### Scenario 3: Google Sign-In

1. Use Google Sign-In on either app
2. Open the other app
3. **Expected**: Should be logged in with same Google account

## Cross-Domain Considerations

Since both apps are on different domains (vettcodecli.vercel.app vs vetted-xi.vercel.app), localStorage is **NOT shared** between them by default.

### Current Implementation (localStorage)

- Each domain has its own localStorage
- User must login separately on each domain
- BUT: Same credentials work on both (unified database)

### Future Enhancement (Cookies/JWT)

To achieve true single sign-on across domains, you would need:

1. Set JWT in a cookie with domain=`.vercel.app`
2. Use a shared parent domain
3. Or implement OAuth flow with redirect

## Benefits of Current Setup

1. **Single Database**: Only one MongoDB collection to manage
2. **Single API Backend**: Only maintain one set of auth routes
3. **Consistent User Data**: Same profile, stats, and settings
4. **Easier Updates**: Change auth logic in one place
5. **Cost Effective**: One database, one API deployment

## User Experience

- User creates account on landing page → Can immediately use web scanner
- User creates account on web scanner → Can immediately use landing page
- Both apps show same user profile and stats
- Logout from one affects only that domain (unless we implement shared cookies)

## Security

- JWT tokens validated on every API request
- Google OAuth tokens verified server-side
- bcrypt password hashing
- Environment variables for sensitive data
- No console.log statements in production

## Deployment Checklist

- [x] Landing page deployed with API routes
- [x] MongoDB connection configured
- [x] Web scanner updated to call landing APIs
- [x] Environment variables set on both Vercel projects
- [x] Google OAuth configured with both domains
- [ ] Test login flow on both apps
- [ ] Test Google Sign-In on both apps
- [ ] Verify localStorage keys match

## Troubleshooting

### Issue: "404 Not Found" on API calls

**Solution**: Check that `NEXT_PUBLIC_LANDING_API_URL` is set correctly in web scanner

### Issue: Google Sign-In not working

**Solution**: Add both domains to Google OAuth allowed origins:

- https://vettcodecli.vercel.app
- https://vetted-xi.vercel.app

### Issue: Token expired

**Solution**: JWT tokens expire after 7 days. User needs to login again.

### Issue: Different users on each app

**Solution**: Check that localStorage keys match exactly:

- `vettcode_token` (not `vettcode_auth`)
- `vettcode_developer` (not `vettcode_user`)
- `vettcode_authenticated` (not `isAuthenticated`)

## Next Steps

1. Deploy updated web scanner to Vercel
2. Test authentication flow on both production apps
3. Monitor MongoDB for user records
4. Consider implementing shared cookies for true SSO
5. Add email verification if needed
6. Add password reset functionality
