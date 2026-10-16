# Dashboard API

Owner: Jasser. See README.md in this folder for conventions (error shape, cookie, status codes).

Dashboard endpoint proposals. Confirm role visibility and data definitions with Theo and Jeff before implementation.

### GET /api/dashboard/summary

Who: admin, head, committee, player. The response is scoped to the logged-in user's permissions. Admin and head see system-wide counts; committee sees counts for events they manage; player sees counts relevant to their own registrations and upcoming matches.

Success: `200`

```json
{
  "totalEvents": 0,
  "activeEvents": 0,
  "pendingApprovals": 0,
  "totalRegistrations": 0,
  "upcomingMatches": 0
}
```

Errors:

- `401` `NOT_LOGGED_IN` — no valid login.
- `403` `FORBIDDEN` — the user's role cannot access the dashboard.

### GET /api/dashboard/recent-activity

Who: admin, head, committee. Admin and head see system-wide recent activity; committee sees activity for events they manage.

Query: optional `limit` (default 10, maximum 50), newest entries first.

Success: `200`

```json
{
  "items": [
    {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "actorName": "Juan Cruz",
      "actorRole": "admin",
      "action": "EVENT_UPDATED",
      "description": "Updated event details",
      "createdAt": "2026-11-10T04:00:00.000Z"
    }
  ]
}
```

Errors:

- `400` `VALIDATION_ERROR` — the limit is invalid.
- `401` `NOT_LOGGED_IN` — no valid login.
- `403` `FORBIDDEN` — the user's role cannot access recent activity.

The response fields, role visibility, and count definitions are proposed and should be agreed with Theo and Jeff before implementation.

Owner: Jasser.

See README.md in this folder for conventions (error shape, cookie, status codes).