# Changelog

## [Unreleased] - 2025-01-XX

### Added - Authentication & Scan Limits

#### Features

- **Free tier scan limits**: Users can perform 2 scans without authentication
- **Authentication system**: Login and registration with OTP verification
- **Unlimited scans**: Authenticated users get unlimited scans
- **User management**: Users saved as "incomplete sellers" (no shop setup required)
- **Scan count tracking**: Browser-based localStorage tracking for free users
- **User interface**: Login/Register modal with clean, modern design
- **OTP verification**: Email-based 6-digit verification codes
- **Resend OTP**: Option to resend verification codes with cooldown
- **Session management**: Persistent login with logout functionality
- **Scan limit warnings**: Visual indicators showing remaining free scans

#### Technical Implementation

- Created `src/lib/auth.ts` - Authentication utilities and scan limit logic
- Created `src/components/AuthModal.tsx` - Login/Register/Verify modal component
- Updated `src/app/page.tsx` - Integrated authentication and scan limits
- Updated `.env.example` - Added NEXT_PUBLIC_BACKEND_URL configuration
- Created `AUTH_SETUP.md` - Comprehensive authentication documentation
- Updated `README.md` - Added authentication feature documentation

#### Backend Integration

- Connects to existing seller authentication endpoints:
  - `POST /api/sellers/register` - Register new seller with OTP
  - `POST /api/sellers/verify` - Verify OTP and complete registration
  - `POST /api/sellers/login` - Authenticate seller
  - `POST /api/sellers/resend-otp` - Resend verification code

#### Security Features

- Password requirements enforced by backend (8+ chars, uppercase, lowercase, number, special char)
- OTP security: 6-digit codes, 10-minute expiration, 5 attempt limit
- Account lockout after failed attempts
- Resend cooldown (3 minutes between resends)
- Client-side token storage in localStorage

#### User Experience

- Seamless authentication flow
- Clear error messages
- Success notifications
- Remaining scan counter for free users
- Welcome message with user name after login
- One-click logout

### Changed

- Home page now shows authentication status
- Scan button checks authentication before allowing scans
- Header displays user info when logged in

### Files Modified

- `src/app/page.tsx` - Added auth integration
- `.env.example` - Added backend URL
- `README.md` - Updated with auth features

### Files Created

- `src/lib/auth.ts` - Auth utilities
- `src/components/AuthModal.tsx` - Auth UI
- `AUTH_SETUP.md` - Auth documentation
- `CHANGELOG.md` - This file

---

## Previous Releases

### [1.0.0] - Initial Release

- Smart analysis pipeline (Static → AST → AI → Verification)
- 70-90% token reduction through AST extraction
- Free OpenRouter models integration
- Comprehensive security pattern detection
- File tree visualization
- Downloadable JSON reports
- Vercel deployment support
