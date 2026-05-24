# Google OAuth Setup for VettCode Engine (Client-Side Implementation)

## Overview

VettCode Engine uses **client-side Google Sign-In** to authenticate users as **sellers** in your backend. The frontend gets user data from Google, then registers/logs in through your existing backend seller endpoints.

**No backend OAuth routes needed** — we use your existing `/api/sellers/register` and `/api/sellers/login` endpoints.

---

## How It Works

### User Flow:

1. **User clicks "Continue with Google"** on VettCode Engine
2. **Google Sign-In popup** appears (client-side)
3. **User authorizes** VettCode Engine
4. **Frontend receives** Google user data (JWT token)
5. **Frontend decodes** JWT to get email, name, Google ID
6. **Frontend tries to login** using existing `/api/sellers/login` endpoint:
   - Email: Google email
   - Password: `google_{googleId}` (e.g., `google_123456789`)
7. **If login fails** (seller doesn't exist):
   - **Frontend registers** new seller using `/api/sellers/register`
   - Name: Google name
   - Email: Google email
   - Phone: Random placeholder (e.g., `+11234567890`)
   - Password: `google_{googleId}`
8. **After registration**, frontend attempts to verify with special OTP code `GOOGLE_AUTO_VERIFY`
9. **If verify fails**, frontend retries login
10. **User is logged in** as seller with unlimited scans

---

## Setup Instructions

### 1. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
4. Application type: **Web application**
5. Authorized JavaScript origins:
   - `http://localhost:3000` (development)
   - `https://vetted-xi.vercel.app` (production)
6. **No redirect URIs needed** (client-side flow)
7. Copy **Client ID** (you don't need Client Secret for client-side)

### 2. Add to Frontend `.env.local`

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
```

### 3. Frontend Implementation (Already Done!)

#### Google Sign-In Script Added ✅

The Google Sign-In library is loaded in `src/app/layout.tsx`:

```typescript
<head>
  <script src="https://accounts.google.com/gsi/client" async defer></script>
</head>
```

#### Google OAuth Handler ✅

The `AuthModal.tsx` component handles Google authentication:

```typescript
async function handleGoogleLogin() {
  const google = (window as any).google;

  // Initialize Google Sign-In
  google.accounts.id.initialize({
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    callback: handleGoogleCallback,
  });

  // Show Google account picker
  google.accounts.id.prompt();
}

async function handleGoogleCallback(response: any) {
  // Decode JWT token from Google
  const credential = response.credential;
  const payload = JSON.parse(atob(credential.split(".")[1]));

  const googleEmail = payload.email;
  const googleName = payload.name;
  const googleId = payload.sub; // Google user ID

  // Try to login first
  const loginRes = await fetch(`${BACKEND_URL}/api/sellers/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: googleEmail.toLowerCase(),
      password: `google_${googleId}`, // Use Google ID as password
    }),
  });

  if (loginRes.ok) {
    // Seller exists - login successful
    const loginData = await loginRes.json();
    setAuthUser({
      ...loginData.seller,
      token: `vettcode_${loginData.seller.id}_${Date.now()}`,
    });
    onSuccess();
  } else {
    // Seller doesn't exist - register new seller
    const randomPhone = `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    const registerRes = await fetch(`${BACKEND_URL}/api/sellers/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: googleName,
        email: googleEmail.toLowerCase(),
        phoneNumber: randomPhone,
        password: `google_${googleId}`,
      }),
    });

    // After registration, try to verify or login
    // ... (see AuthModal.tsx for full implementation)
  }
}
```

---

## Backend Requirements

### No New Routes Needed ✅

The existing seller endpoints handle everything:

- **`POST /api/sellers/register`** — Creates new seller
- **`POST /api/sellers/login`** — Authenticates seller
- **`POST /api/sellers/verify`** — Verifies OTP (optional for Google users)

### Optional: Handle Special OTP Code

If you want to auto-verify Google users, add this to your `/api/sellers/verify` endpoint:

```javascript
// In backend/routes/sellers.js or similar
router.post("/verify", async (req, res) => {
  const { email, otp } = req.body;

  // Special case: Google OAuth auto-verify
  if (otp === "GOOGLE_AUTO_VERIFY") {
    const seller = await Seller.findOne({ email: email.toLowerCase() });
    if (seller && seller.email.includes("@gmail.com")) {
      // Or check password starts with 'google_'
      seller.verified = true;
      await seller.save();
      return res.json({ success: true, seller });
    }
  }

  // Normal OTP verification
  // ... existing code
});
```

**Note**: This is optional. If not implemented, the frontend will just retry login after registration.

---

## Environment Variables Summary

### Frontend `.env.local`:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
```

### Backend `.env`:

```env
# No Google OAuth variables needed!
# Your existing seller endpoints handle everything
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
4. Select Google account in popup
5. Should be logged in as seller immediately

---

## Production Deployment

### 1. Update Google OAuth Credentials:

- Add production origin: `https://vetted-xi.vercel.app`
- No redirect URIs needed

### 2. Update Frontend Environment Variables:

```env
NEXT_PUBLIC_BACKEND_URL=https://your-backend.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-production-client-id
```

### 3. Deploy:

- Vercel automatically uses environment variables
- Google Sign-In works over HTTPS (required in production)

---

## Security Notes

1. **Client ID is Public**: It's safe to expose in frontend (NEXT*PUBLIC*\*)
2. **No Client Secret**: Not needed for client-side flow
3. **Password Security**: Google ID is used as password (`google_{googleId}`)
   - Google IDs are unique and long (e.g., `google_123456789012345678901`)
   - Users can't login with regular password (they don't know it)
4. **HTTPS Required**: Google Sign-In requires HTTPS in production (Vercel provides this)

---

## Troubleshooting

### "Google Sign-In not loaded"

- Check if script is loaded: `<script src="https://accounts.google.com/gsi/client" async defer></script>`
- Wait for page to fully load before clicking Google button

### "Invalid client ID"

- Verify `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is correct
- Check Google Console credentials match your domain

### "Popup blocked"

- Browser may block popup — user needs to allow popups
- Or use `google.accounts.id.prompt()` which shows inline picker

### "Registration failed"

- Check backend `/api/sellers/register` endpoint is working
- Verify backend accepts: name, email, phoneNumber, password

### "Login failed after registration"

- Backend may require email verification
- Frontend will retry login after registration
- Check backend seller status (verified, approved, etc.)

---

## Advantages of Client-Side Approach

✅ **No backend OAuth routes** — uses existing seller endpoints

✅ **Simpler setup** — only need Google Client ID

✅ **No session management** — stateless authentication

✅ **Faster** — no backend redirect roundtrip

✅ **Better UX** — inline Google account picker

✅ **Same seller database** — integrates with existing system

---

## Summary

**VettCode users = Sellers in your backend**

**Google OAuth = Client-side authentication → Existing seller endpoints**

**No backend changes needed** (except optional auto-verify)

**Sellers get unlimited free scans**

This setup allows you to:

- Attract sellers to try VettCode for free
- Build your seller database
- Offer value before asking for shop setup
- Seamlessly integrate with your existing seller system
- Avoid complex backend OAuth implementation
