# Auth API

Owner: Theo. See README.md in this folder for conventions (error shape, cookie, status codes).

## User object (returned everywhere)
```
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
  "fullName": "Juan Cruz",
  "email": "cruzj@students.nu-moa.edu.ph",
  "studentId": "2024-123456",
  "department": "BSIT",
  "inGameName": "JuanTheGreat",
  "role": "player",
  "isActive": true,
  "isEmailVerified": true
}
```
The password hash is never returned.

## Rules
- Email must end with `@students.nu-moa.edu.ph` (checked on the client for convenience and on the server for real).
- Password: at least 8 characters.
- Public signup always creates a `player`.
- Verification happens only at account creation. After clicking the emailed link the student logs in normally (no auto-login).

---

### POST /api/auth/signup
Who: public
Body: `{ "fullName", "email", "studentId", "department", "inGameName", "password" }`
Success: `201` `{ "message": "Check your email to confirm your account.", "email": "cruzj@students.nu-moa.edu.ph" }` (no login cookie)
Errors:
- `400` `VALIDATION_ERROR` with `fields` (missing field, short password)
- `400` `INVALID_EMAIL_DOMAIN` with `fields.email`
- `409` `EMAIL_TAKEN` or `STUDENT_ID_TAKEN` (belongs to a verified account)

Note: if an unverified account with the same email exists, it is replaced and a new link is sent.

### POST /api/auth/verify-email
Who: public (called by the page the emailed link opens: `/verify-email/:token`)
Body: `{ "token" }`
Success: `200` `{ "message": "Email confirmed. You can now log in." }`
Errors: `400` `TOKEN_INVALID`, `400` `TOKEN_EXPIRED` (links last 24 hours)

### POST /api/auth/resend-verification
Who: public
Body: `{ "email" }`
Success: `200` `{ "message": "If this email needs confirmation, a new link was sent." }` (same response whether or not the email exists)
Errors: `429` `TOO_MANY_REQUESTS` (wait 60 seconds between resends)

### POST /api/auth/login
Who: public
Body: `{ "email", "password" }`
Success: `200` `{ "user": { ...user object } }` and sets the `leagueops_token` cookie
Errors:
- `401` `INVALID_CREDENTIALS`
- `403` `EMAIL_NOT_VERIFIED` (the login page offers to resend the link)
- `403` `ACCOUNT_DEACTIVATED`

### POST /api/auth/logout
Who: any logged-in user
Success: `200` `{ "message": "Logged out." }` and clears the cookie

### GET /api/auth/me
Who: any logged-in user
Success: `200` `{ "user": { ...user object } }`
Errors: `401` `NOT_LOGGED_IN`

### PATCH /api/auth/me
Who: any logged-in user
Body: any of `{ "fullName", "department", "inGameName" }` (email and student ID cannot be changed)
Success: `200` `{ "user": { ...user object } }`
Errors: `400` `VALIDATION_ERROR`

### POST /api/auth/forgot-password
Who: public
Body: `{ "email" }`
Success: `200` `{ "message": "If this email is registered, a reset link was sent." }` (same response whether or not the email exists)

### POST /api/auth/reset-password
Who: public (called by the page the emailed link opens: `/reset-password/:token`)
Body: `{ "token", "password" }`
Success: `200` `{ "message": "Password updated. You can now log in." }`
Errors: `400` `TOKEN_INVALID`, `400` `TOKEN_EXPIRED` (links last 1 hour), `400` `VALIDATION_ERROR`

## Mock data for the frontend (same shape as the real API)
Login success: `{ "user": { "_id": "mock1", "fullName": "Mock Player", "email": "mock@students.nu-moa.edu.ph", "studentId": "2024-000001", "department": "BSIT", "inGameName": "Mock", "role": "player", "isActive": true, "isEmailVerified": true } }`
Login error: `{ "message": "Email or password is incorrect.", "code": "INVALID_CREDENTIALS" }`
