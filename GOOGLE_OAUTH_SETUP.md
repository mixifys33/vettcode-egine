# Google OAuth Setup for VettCode Engine (Seller Authentication)

## Overview

VettCode Engine users authenticate as **sellers** in your backend. Google OAuth allows sellers to sign up/login with their Google account instead of email/password.

---

## Backend Setup Required

You need to add Google OAuth endpoints to your **seller authentication** in the backend.

### 1. Install Required Packages

```bash
cd ../backend
npm install passport passport-google-oauth20 express-session
```

### 2. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Authorized redirect URIs:
   - `http://localhost:5000/api/sellers/auth/google/callback` (development)
   - `https://your-backend-url.com/api/sellers/auth/google/callback` (production)
7. Copy **Client ID** and **Client Secret**

### 3. Add to Backend `.env`

```env
# Google OAuth for Sellers
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:5000/api/sellers/auth/google/callback

# Frontend URL for redirect after OAuth
FRONTEND_URL=http://localhost:3000
```

### 4. Create Google OAuth Route for Sellers

Create `backend/routes/sellerGoogleAuth.js`:

```javascript
const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const Seller = require('../models/Seller');
const router = express.Router();

// Configure Google Strategy for Sellers
passport.use('google-seller', new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/sellers/auth/google/callback',
    scope: ['profile', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      const name = profile.displayName;
      
      // Check if seller already exists
      let seller = await Seller.findOne({ email: email.toLowerCase() });
      
      if (seller) {
        // Existing seller - login
        return done(null, seller);
      }
      
      // New seller - create account
      // Generate a random phone number placeholder (seller can update later)
      const randomPhone = `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      
      seller = new Seller({
        name: name,
        email: email.toLowerCase(),
        phoneNumber: randomPhone, // Placeholder - seller can update in profile
        password: Math.random().toString(36).slice(-12), // Random password (won't be used)
        verified: true, // Google email is already verified
        status: 'pending', // Requires admin approval
        approvalStatus: 'pending_review',
        shop: {
          isSetup: false // No shop setup required for VettCode
        }
      });
      
      await seller.save();
      console.log('New seller created via Google OAuth:', seller.email);
      
      return done(null, seller);
    } catch (error) {
      console.error('Google OAuth error:', error);
      return done(error, null);
    }
  }
));

// Serialize/deserialize seller
passport.serializeUser((seller, done) => {
  done(null, seller.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const seller = await Seller.findById(id);
    done(null, seller);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth routes for sellers
router.get('/google', 
  passport.authenticate('google-seller', { 
    scope: ['profile', 'email'],
    session: false 
  })
);

router.get('/google/callback',
  passport.authenticate('google-seller', { 
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}?auth=failed`
  }),
  (req, res) => {
    // Successful authentication
    const seller = req.user;
    
    // Create a simple token (in production, use JWT)
    const token = `vettcode_${seller._id}_${Date.now()}`;
    
    // Redirect to frontend with seller data
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/auth/callback?token=${token}&id=${seller._id}&name=${encodeURIComponent(seller.name)}&email=${encodeURIComponent(seller.email)}`;
    
    res.redirect(redirectUrl);
  }
);

module.exports = router;
```

### 5. Update Backend `server.js` or `app.js`

```javascript
const express = require('express');
const passport = require('passport');
const session = require('express-session');
const sellerGoogleAuth = require('./routes/sellerGoogleAuth');

const app = express();

// Session middleware (required for passport)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Mount Google OAuth routes for sellers
app.use('/api/sellers/auth', sellerGoogleAuth);

// ... rest of your routes
```

---

## Frontend Setup (Already Done!)

The frontend is already configured to use Google OAuth:

### 1. Google Button Added ✅
- Login form has "Continue with Google" button
- Register form has "Sign up with Google" button

### 2. OAuth Handler ✅
```typescript
async function handleGoogleLogin() {
  window.location.href = `${BACKEND_URL}/api/sellers/auth/google`;
}
```

### 3. Callback Handler Needed

Create `src/app/auth/callback/page.tsx`:

```typescript
"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setAuthUser, resetScanCount } from "@/lib/auth";

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const id = searchParams.get("id");
    const name = searchParams.get("name");
    const email = searchParams.get("email");

    if (token && id && name && email) {
      // Save seller auth data
      setAuthUser({
        id,
        name: decodeURIComponent(name),
        email: decodeURIComponent(email),
        token,
        userType: "Seller",
      });

      // Reset scan count
      resetScanCount();

      // Redirect to home
      router.push("/?auth=success");
    } else {
      // Auth failed
      router.push("/?auth=failed");
    }
  }, [searchParams, router]);

  return (
    <div style={{ 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center", 
      minHeight: "100vh",
      flexDirection: "column",
      gap: "1rem"
    }}>
      <div className="spinner"></div>
      <p>Completing authentication...</p>
    </div>
  );
}
```

---

## How It Works

### User Flow:

1. **User clicks "Continue with Google"** on VettCode Engine
2. **Redirected to Google** for authentication
3. **User authorizes** VettCode Engine
4. **Google redirects back** to backend callback
5. **Backend checks** if seller exists:
   - **Exists**: Login seller
   - **New**: Create seller account (verified, no shop setup)
6. **Backend redirects** to frontend with seller data
7. **Frontend saves** seller auth and redirects to home
8. **User is logged in** as seller with unlimited scans

### Seller Data Saved:

```javascript
{
  name: "John Doe",
  email: "john@gmail.com",
  phoneNumber: "+1234567890", // Placeholder
  verified: true, // Google email verified
  status: "pending", // Awaits admin approval
  shop: {
    isSetup: false // No shop required for VettCode
  }
}
```

---

## Environment Variables Summary

### Backend `.env`:
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/sellers/auth/google/callback
FRONTEND_URL=http://localhost:3000
SESSION_SECRET=your-session-secret
```

### Frontend `.env.local`:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

---

## Testing

### 1. Start Backend:
```bash
cd backend
npm start
```

### 2. Start Frontend:
```bash
cd Vettcode-engine
npm run dev
```

### 3. Test Google OAuth:
1. Go to http://localhost:3000
2. Click "Login / Register"
3. Click "Continue with Google"
4. Authorize with Google account
5. Should redirect back and be logged in as seller

---

## Production Deployment

### 1. Update Google OAuth Credentials:
- Add production callback URL: `https://your-backend.com/api/sellers/auth/google/callback`

### 2. Update Environment Variables:
```env
GOOGLE_CALLBACK_URL=https://your-backend.com/api/sellers/auth/google/callback
FRONTEND_URL=https://vetted-xi.vercel.app
```

### 3. Enable HTTPS:
- Google OAuth requires HTTPS in production
- Vercel provides HTTPS automatically

---

## Security Notes

1. **Session Secret**: Use a strong random string in production
2. **HTTPS Only**: Google OAuth requires HTTPS in production
3. **CORS**: Ensure backend allows requests from frontend domain
4. **Token Security**: Consider using JWT tokens instead of simple tokens

---

## Troubleshooting

### "Redirect URI mismatch"
- Check Google Console redirect URIs match exactly
- Include both http://localhost:5000/... and https://production-url/...

### "Access blocked: This app's request is invalid"
- Verify Google+ API is enabled
- Check OAuth consent screen is configured

### "Cannot read property 'emails' of undefined"
- Ensure 'email' scope is requested
- Check Google account has email address

---

## Summary

✅ **VettCode users = Sellers in your backend**

✅ **Google OAuth = Seller authentication**

✅ **No shop setup required** for VettCode users

✅ **Sellers get unlimited free scans**

✅ **Same seller database** as your main app

This setup allows you to:
- Attract sellers to try VettCode for free
- Build your seller database
- Offer value before asking for shop setup
- Seamlessly integrate with your existing seller system
