# Authentication Setup Guide

## Overview
VettCode Engine now includes authentication with scan limits:
- **Free tier**: 2 scans without login (tracked in browser localStorage)
- **Authenticated users**: Unlimited scans after login/registration
- **User type**: Sellers (incomplete - no shop setup required)

## Features Implemented

### 1. Scan Limit Tracking
- Free users can perform 2 scans before being required to login
- Scan count is tracked in browser localStorage
- After login/registration, scan count is reset and unlimited scans are allowed

### 2. Authentication Modal
- **Login**: Email + Password
- **Register**: Name + Email + Phone + Password (with OTP verification)
- **OTP Verification**: 6-digit code sent to email after registration
- **Resend OTP**: Option to resend verification code

### 3. User Management
- Users are saved as "incomplete sellers" in the Seller collection
- No shop setup required for code scanning
- `shop.isSetup = false` by default
- Users can later complete shop setup if they want to sell products

## Backend Integration

### Required Backend Endpoints
The frontend connects to these existing backend endpoints:

1. **POST** `/api/sellers/register`
   - Registers new seller and sends OTP to email
   - Body: `{ name, email, phoneNumber, password }`

2. **POST** `/api/sellers/verify`
   - Verifies OTP and completes registration
   - Body: `{ email, otp }`

3. **POST** `/api/sellers/login`
   - Authenticates seller
   - Body: `{ email, password }`

4. **POST** `/api/sellers/resend-otp`
   - Resends verification code
   - Body: `{ email }`

## Environment Variables

Add to your `.env.local` file:

```env
# Backend API URL for seller authentication
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

For production (Vercel):
```env
NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com
```

## Files Created/Modified

### New Files
1. `src/lib/auth.ts` - Authentication utilities and scan limit logic
2. `src/components/AuthModal.tsx` - Login/Register/Verify modal component
3. `AUTH_SETUP.md` - This documentation file

### Modified Files
1. `src/app/page.tsx` - Integrated authentication and scan limits
2. `.env.example` - Added NEXT_PUBLIC_BACKEND_URL

## How It Works

### For Unauthenticated Users
1. User can perform 2 free scans
2. Scan count is stored in localStorage: `vettcode_scan_count`
3. After 2 scans, modal appears requiring login/registration
4. User cannot scan until authenticated

### For Authenticated Users
1. User logs in or registers (with OTP verification)
2. Auth data stored in localStorage: `vettcode_auth`
3. Scan count is reset to 0
4. User can perform unlimited scans
5. User info displayed in header with logout button

### Registration Flow
1. User fills registration form (name, email, phone, password)
2. Backend sends 6-digit OTP to email
3. User enters OTP in verification screen
4. Account is created and verified
5. User is automatically logged in
6. Scan count is reset

### Login Flow
1. User enters email and password
2. Backend validates credentials
3. User is logged in
4. Scan count is reset

## Testing

### Test Locally
1. Start your backend server:
   ```bash
   cd ../backend
   npm start
   ```

2. Start VettCode Engine:
   ```bash
   cd Vettcode-engine
   npm run dev
   ```

3. Open http://localhost:3000

4. Test scenarios:
   - Perform 2 scans without login (should show limit warning)
   - Try 3rd scan (should show auth modal)
   - Register new account (check email for OTP)
   - Verify OTP and complete registration
   - Perform unlimited scans after login

### Clear Test Data
To reset for testing:
```javascript
// In browser console
localStorage.removeItem('vettcode_scan_count');
localStorage.removeItem('vettcode_auth');
```

## Backend Requirements

### Database Schema
Users are saved in the `Seller` collection with these fields:
- `name`: String (required)
- `email`: String (required, unique)
- `phoneNumber`: String (required, unique)
- `password`: String (hashed, required)
- `verified`: Boolean (set to true after OTP verification)
- `status`: String (default: 'pending')
- `shop.isSetup`: Boolean (default: false)

### Email Service
Backend must have email service configured to send:
- OTP verification codes (6 digits)
- Welcome emails after registration

## Security Notes

1. **Password Requirements** (enforced by backend):
   - Minimum 8 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number
   - At least one special character

2. **OTP Security**:
   - 6-digit codes
   - 10-minute expiration
   - 5 attempt limit before lockout
   - 3-minute cooldown between resends

3. **Token Storage**:
   - Simple token format: `vettcode_{sellerId}_{timestamp}`
   - Stored in localStorage (client-side only)
   - For production, consider implementing JWT tokens on backend

## Production Deployment

### Vercel Environment Variables
Add in Vercel dashboard:
```
NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com
```

### CORS Configuration
Ensure your backend allows requests from your Vercel domain:
```javascript
// In backend server.js or app.js
const cors = require('cors');
app.use(cors({
  origin: ['http://localhost:3000', 'https://vetted-xi.vercel.app'],
  credentials: true
}));
```

## Future Enhancements

Potential improvements:
1. **Google OAuth**: Add social login option
2. **JWT Tokens**: Implement proper JWT authentication on backend
3. **Password Reset**: Add forgot password flow
4. **Email Verification**: Require email verification before first scan
5. **Session Management**: Add token refresh and expiration handling
6. **Rate Limiting**: Add API rate limiting for authenticated users
7. **Analytics**: Track scan usage per user

## Troubleshooting

### "Failed to send verification email"
- Check backend email service configuration
- Verify SMTP credentials
- Check email service logs

### "No verification request found"
- OTP may have expired (10 minutes)
- Try registering again
- Check backend OTP storage

### "Account temporarily locked"
- Too many failed OTP attempts
- Wait 30 minutes or contact support
- Clear lockout from backend if needed

### CORS Errors
- Add your frontend URL to backend CORS whitelist
- Check NEXT_PUBLIC_BACKEND_URL is correct
- Verify backend is running

## Support

For issues or questions:
1. Check browser console for errors
2. Check backend logs
3. Verify environment variables
4. Test backend endpoints directly with Postman/curl
