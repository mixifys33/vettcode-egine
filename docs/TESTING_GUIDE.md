# Testing Guide - Authentication System

## Prerequisites

1. **Backend server must be running**

   ```bash
   cd ../backend
   npm start
   ```

2. **Environment variables configured**
   - Copy `.env.example` to `.env.local`
   - Set `NEXT_PUBLIC_BACKEND_URL=http://localhost:5000`
   - Add your OpenRouter API keys

3. **Email service configured in backend**
   - Backend must be able to send OTP emails
   - Check backend email service configuration

## Test Scenarios

### Scenario 1: Free Tier Scan Limits

**Steps:**

1. Open http://localhost:3000 in incognito/private window
2. Notice the banner: "Free users: 2 scans remaining"
3. Upload a codebase and scan (1st scan)
4. After scan completes, notice: "Free users: 1 scan remaining"
5. Upload another codebase and scan (2nd scan)
6. After scan completes, notice: "Free users: 0 scans remaining"
7. Try to upload a 3rd codebase
8. **Expected:** Auth modal appears with message "You have reached the free scan limit"

**Pass Criteria:**

- ✅ Scan counter decrements correctly
- ✅ Auth modal appears after 2 scans
- ✅ Cannot scan without authentication

---

### Scenario 2: User Registration

**Steps:**

1. Click "Login / Register" button in header
2. Click "Register here" link
3. Fill in registration form:
   - Name: Test User
   - Email: test@example.com
   - Phone: +1234567890
   - Password: Test123!@#
4. Click "Register"
5. **Expected:** Success message "Verification code sent to your email!"
6. Check email for 6-digit OTP code
7. Enter OTP in verification screen
8. Click "Verify & Complete Registration"
9. **Expected:** Modal closes, user logged in, scan counter reset

**Pass Criteria:**

- ✅ Registration form validates all fields
- ✅ OTP email received within 1 minute
- ✅ OTP verification succeeds
- ✅ User automatically logged in
- ✅ Header shows "Welcome, Test User"
- ✅ Scan limit banner disappears
- ✅ Can perform unlimited scans

**Error Cases to Test:**

- Invalid email format → Shows error
- Phone without + prefix → Shows error
- Weak password (< 8 chars) → Shows error
- Wrong OTP code → Shows attempts remaining
- Expired OTP (wait 10 min) → Shows "expired" error

---

### Scenario 3: OTP Resend

**Steps:**

1. Start registration process
2. Wait for OTP email
3. On verification screen, click "Resend code"
4. **Expected:** Success message "New verification code sent"
5. Check email for new OTP
6. Try clicking "Resend code" again immediately
7. **Expected:** Error with cooldown timer (3 minutes)
8. Wait 3 minutes and resend again
9. **Expected:** New code sent successfully

**Pass Criteria:**

- ✅ New OTP received
- ✅ Old OTP no longer works
- ✅ New OTP works correctly
- ✅ Cooldown prevents spam
- ✅ Cooldown timer shows remaining time

---

### Scenario 4: User Login

**Steps:**

1. Logout if logged in
2. Click "Login / Register"
3. Enter credentials:
   - Email: test@example.com
   - Password: Test123!@#
4. Click "Login"
5. **Expected:** Modal closes, user logged in

**Pass Criteria:**

- ✅ Login succeeds with correct credentials
- ✅ Header shows user name
- ✅ Scan counter reset to unlimited
- ✅ Can perform scans immediately

**Error Cases to Test:**

- Wrong email → "Invalid credentials"
- Wrong password → "Invalid credentials"
- Unverified account → "Account not verified"
- Empty fields → Validation errors

---

### Scenario 5: Session Persistence

**Steps:**

1. Login successfully
2. Perform a scan
3. Refresh the page (F5)
4. **Expected:** Still logged in, user info in header
5. Close browser tab
6. Open new tab to http://localhost:3000
7. **Expected:** Still logged in (localStorage persists)

**Pass Criteria:**

- ✅ Session persists across page refreshes
- ✅ Session persists across browser tabs
- ✅ User info displayed correctly
- ✅ Can scan without re-authentication

---

### Scenario 6: Logout

**Steps:**

1. While logged in, click "Logout" button
2. **Expected:** User logged out, header shows "Login / Register"
3. Notice scan limit banner reappears: "Free users: 2 scans remaining"
4. Try to scan
5. **Expected:** Can scan (scan counter starts from 2 again)

**Pass Criteria:**

- ✅ Logout clears session
- ✅ Header updates to show login button
- ✅ Scan limit banner reappears
- ✅ Scan counter resets to 2

---

### Scenario 7: Multiple Failed OTP Attempts

**Steps:**

1. Start registration
2. Enter wrong OTP 5 times
3. **Expected:** Account locked for 30 minutes
4. Try to verify again
5. **Expected:** Error "Account locked due to too many failed attempts"
6. Try to resend OTP
7. **Expected:** Error "Account temporarily locked"

**Pass Criteria:**

- ✅ Shows attempts remaining (4, 3, 2, 1)
- ✅ Locks after 5 failed attempts
- ✅ Shows lockout duration (30 minutes)
- ✅ Prevents all operations during lockout
- ✅ Allows retry after lockout expires

---

### Scenario 8: Duplicate Registration

**Steps:**

1. Register with email: test@example.com
2. Complete verification
3. Logout
4. Try to register again with same email
5. **Expected:** Error "Email already registered as seller"

**Pass Criteria:**

- ✅ Prevents duplicate email registration
- ✅ Shows clear error message
- ✅ Suggests logging in instead

---

### Scenario 9: Backend Connection Failure

**Steps:**

1. Stop backend server
2. Try to login/register
3. **Expected:** Error message about connection failure
4. Start backend server
5. Try again
6. **Expected:** Works normally

**Pass Criteria:**

- ✅ Shows user-friendly error message
- ✅ Doesn't crash the app
- ✅ Recovers when backend is back online

---

### Scenario 10: Scan Limit Edge Cases

**Steps:**

1. Clear localStorage: `localStorage.clear()`
2. Perform 1 scan
3. Login
4. **Expected:** Scan counter resets, unlimited scans
5. Logout
6. **Expected:** Scan counter shows 2 (not 1)
7. Perform 2 scans
8. Clear localStorage manually
9. Refresh page
10. **Expected:** Scan counter shows 2 (reset)

**Pass Criteria:**

- ✅ Login resets scan counter
- ✅ Logout resets scan counter to 2
- ✅ localStorage clear resets counter
- ✅ No negative scan counts
- ✅ No bypass of scan limits

---

## Browser Console Testing

### Check Auth State

```javascript
// Check if user is authenticated
localStorage.getItem("vettcode_auth");

// Check scan count
localStorage.getItem("vettcode_scan_count");

// Clear auth (logout)
localStorage.removeItem("vettcode_auth");

// Reset scan count
localStorage.removeItem("vettcode_scan_count");

// Clear all
localStorage.clear();
```

---

## Backend API Testing (with curl)

### Test Registration

```bash
curl -X POST http://localhost:5000/api/sellers/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phoneNumber": "+1234567890",
    "password": "Test123!@#"
  }'
```

### Test Login

```bash
curl -X POST http://localhost:5000/api/sellers/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'
```

### Test OTP Verification

```bash
curl -X POST http://localhost:5000/api/sellers/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "123456"
  }'
```

---

## Common Issues & Solutions

### Issue: "Failed to send verification email"

**Solution:** Check backend email service configuration, SMTP credentials

### Issue: "No verification request found"

**Solution:** OTP expired (10 min), start registration again

### Issue: "Account temporarily locked"

**Solution:** Wait 30 minutes or clear lockout from backend

### Issue: CORS errors

**Solution:** Add frontend URL to backend CORS whitelist

### Issue: "Cannot read property of undefined"

**Solution:** Check NEXT_PUBLIC_BACKEND_URL is set correctly

---

## Performance Testing

### Load Testing

1. Open 10 browser tabs
2. Login in each tab with different accounts
3. Perform scans simultaneously
4. **Expected:** All scans work independently

### Memory Leak Testing

1. Login/logout 50 times
2. Check browser memory usage
3. **Expected:** No significant memory increase

---

## Accessibility Testing

### Keyboard Navigation

1. Use Tab key to navigate form
2. Use Enter to submit
3. Use Escape to close modal
4. **Expected:** All interactive elements accessible

### Screen Reader Testing

1. Use screen reader (NVDA/JAWS)
2. Navigate through auth modal
3. **Expected:** All labels and errors announced

---

## Security Testing

### XSS Prevention

1. Try entering `<script>alert('xss')</script>` in name field
2. **Expected:** Sanitized, no script execution

### SQL Injection Prevention

1. Try entering `' OR '1'='1` in email field
2. **Expected:** Treated as literal string, no injection

### Password Strength

1. Try weak passwords: "123456", "password", "abc"
2. **Expected:** Rejected with clear error message

---

## Automated Testing (Future)

### Unit Tests

- `auth.ts` functions (canScan, incrementScanCount, etc.)
- Form validation logic
- Token generation/storage

### Integration Tests

- Full registration flow
- Full login flow
- Scan limit enforcement

### E2E Tests (Playwright/Cypress)

- Complete user journey
- Error scenarios
- Edge cases

---

## Test Checklist

Before deploying to production:

- [ ] All 10 test scenarios pass
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Backend integration works
- [ ] Email delivery works
- [ ] OTP verification works
- [ ] Scan limits enforced correctly
- [ ] Session persistence works
- [ ] Logout works correctly
- [ ] Error messages are user-friendly
- [ ] Loading states work
- [ ] Mobile responsive
- [ ] Keyboard accessible
- [ ] Screen reader compatible
- [ ] CORS configured correctly
- [ ] Environment variables set
- [ ] Documentation complete

---

## Production Testing

After deploying to Vercel:

1. Test with production backend URL
2. Test email delivery in production
3. Test with real user accounts
4. Monitor error logs
5. Check analytics for auth flow completion rate
6. Test from different devices/browsers
7. Test with slow network (throttling)
8. Test with VPN/different regions

---

## Monitoring

### Metrics to Track

- Registration success rate
- Login success rate
- OTP verification success rate
- Average time to complete registration
- Failed login attempts
- Scan limit hit rate
- Session duration

### Error Tracking

- Failed API calls
- OTP delivery failures
- Verification failures
- Backend connection errors
- CORS errors

---

## Support

If tests fail, check:

1. Backend server is running
2. Environment variables are set
3. Email service is configured
4. Database is accessible
5. CORS is configured
6. Network connectivity

For help, see [AUTH_SETUP.md](./AUTH_SETUP.md)
