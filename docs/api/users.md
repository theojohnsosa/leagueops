# Users API

Owner: Theo.

All endpoints require authentication and the `admin` role, except profile endpoints documented in `auth.md`.

## User object

```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
  "firstName": "Juan",
  "lastName": "Cruz",
  "fullName": "Juan Cruz",
  "studentEmail": "cruzj@students.nu-moa.edu.ph",
  "studentId": "2024-123456",
  "department": "BSIT",
  "inGameName": "JuanTheGreat",
  "role": "player",
  "isActive": true,
  "isEmailVerified": true
}
```

Password hashes are never returned.

## GET /api/users

List users with pagination and optional filters.

Query parameters:

- `search`: searches first name, last name, student email, student ID, and in-game name.
- `role`: `admin`, `head`, `committee`, or `player`.
- `status`: `active` or `inactive`.
- `page`: page number; defaults to `1`.
- `limit`: page size; defaults to `20`, maximum `100`.

Success: `200`

```json
{
  "users": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

Errors: `400 INVALID_ROLE`, `400 INVALID_STATUS`.

## GET /api/users/:id

Retrieve a user by MongoDB ID.

Success: `200` `{ "user": { "...": "user object" } }`

Errors: `400 INVALID_USER_ID`, `404 USER_NOT_FOUND`.

## PATCH /api/users/:id/role

Change a user's role.

Body:

```json
{ "role": "committee" }
```

Allowed roles: `admin`, `head`, `committee`, `player`.

Success: `200` `{ "message": "User role updated successfully.", "user": {} }`

Errors: `400 INVALID_USER_ID`, `400 INVALID_ROLE`, `400 SELF_ROLE_CHANGE`, `404 USER_NOT_FOUND`.

## POST /api/users/:id/deactivation-request

Submit an account deactivation request. The target account remains active while the request is pending.

Body:

```json
{ "reason": "Account requires review under organization policy." }
```

Success: `201`

```json
{
  "message": "Deactivation request submitted for approval.",
  "request": {
    "type": "user_deactivation",
    "status": "pending"
  }
}
```

Errors: `400 INVALID_USER_ID`, `400 REASON_REQUIRED`, `400 SELF_DEACTIVATION`, `404 USER_NOT_FOUND`, `409 USER_ALREADY_INACTIVE`, `409 DEACTIVATION_ALREADY_PENDING`.

## PATCH /api/users/:id/status

Reactivate an inactive account.

Body:

```json
{ "isActive": true }
```

Deactivation through this endpoint is prohibited; use the approval-request endpoint instead.

Success: `200` `{ "message": "User activated successfully.", "user": {} }`

Errors: `400 INVALID_USER_ID`, `400 DEACTIVATION_REQUIRES_APPROVAL`, `404 USER_NOT_FOUND`.

## Deactivation approval workflow

### PATCH /api/approvals/:id/user-deactivation-review

Review a pending user-deactivation request. Requires an administrator who did not submit the request.

Body:

```json
{
  "decision": "approved",
  "reviewNote": "Reviewed and approved."
}
```

`decision` must be `approved` or `rejected`. `reviewNote` is optional.

- **Approved:** the account is deactivated and the reviewer and timestamp are recorded.
- **Rejected:** the account remains active and the rejection is recorded.
- Both decisions are recorded in the approval request and audit log.

Success: `200` with `success`, `message`, and `data` containing the request and updated user.

Errors: `400 INVALID_APPROVAL_ID`, `400 INVALID_DECISION`, `400 INVALID_REVIEW_NOTE`, `403 SELF_APPROVAL_FORBIDDEN`, `404 PENDING_APPROVAL_NOT_FOUND`, `404 USER_NOT_FOUND`, `409 USER_ALREADY_INACTIVE`.

## Authorization

Unauthenticated requests return `401`. Non-admin requests return `403`. Role and status changes must be performed through the documented endpoints; clients must not assume that hiding a UI control enforces authorization.
