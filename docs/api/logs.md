# Logs API

Owner: Jasser. See README.md in this folder for conventions (error shape, cookie, status codes).

## Log objects

Audit log (who did what in the system):

```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
  "actorId": "64f1a2b3c4d5e6f7a8b9c0d2",
  "actorName": "Juan Cruz",
  "actorRole": "admin",
  "action": "USER_DEACTIVATED",
  "targetType": "User",
  "targetId": "64f1a2b3c4d5e6f7a8b9c0d3",
  "description": "Deactivated account 2024-123456",
  "createdAt": "2026-11-10T04:00:00.000Z"
}
```

Event log has the same actor and timestamp fields, plus `eventId` and `changes` describing what changed before and after. It does not have `targetType` or `targetId`.

Logs are append-only: they can be read but never edited or deleted.

### GET /api/logs/audit

Who: admin

Query: standard list params (`page`, `limit`, `search`, `sort`) plus `action`, `actorId`, `from`, `to` (ISO 8601 dates in UTC).

Success: `200`

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "totalPages": 1
}
```

Errors:

- `401` `NOT_LOGGED_IN` — no valid login.
- `403` `FORBIDDEN` — the logged-in user is not an admin.

### GET /api/logs/events

Who: admin, head

Query: standard list params plus `eventId`, `action`, `from`, `to` (ISO 8601 dates in UTC).

Success: `200`

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "totalPages": 1
}
```

Errors:

- `401` `NOT_LOGGED_IN` — no valid login.
- `403` `FORBIDDEN` — the logged-in user does not have permission to view event logs.

Owner: Jasser.

See README.md in this folder for conventions (error shape, cookie, status codes).