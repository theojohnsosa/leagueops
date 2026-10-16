# Archive API

Owner: Jasser. See README.md in this folder for conventions (error shape, cookie, status codes).

Archive endpoint proposals. These should be reviewed with Theo because they affect the Event module.

### GET /api/archive

Who: admin, head

Query: standard list params (`page`, `limit`, `search`, `sort`) plus optional `from` and `to` (ISO 8601 dates in UTC).

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
- `403` `FORBIDDEN` — the user is not an admin or head.

### POST /api/archive/:eventId

Who: admin, head

Body:

```json
{
  "reason": "End of tournament"
}
```

Success: `200`

```json
{
  "message": "Event archived.",
  "event": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "isArchived": true,
    "archivedAt": "2026-11-10T04:00:00.000Z",
    "archivedBy": "64f1a2b3c4d5e6f7a8b9c0d2",
    "archiveReason": "End of tournament"
  }
}
```

Errors:

- `400` `VALIDATION_ERROR` — the reason is missing or invalid.
- `401` `NOT_LOGGED_IN` — no valid login.
- `403` `FORBIDDEN` — the user cannot archive events.
- `404` `EVENT_NOT_FOUND` — the event does not exist.
- `409` `EVENT_ALREADY_ARCHIVED` — the event is already archived.

### POST /api/archive/:eventId/restore

Who: admin, head

Success: `200`

```json
{
  "message": "Event restored.",
  "event": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "isArchived": false,
    "restoredAt": "2026-11-10T04:30:00.000Z",
    "restoredBy": "64f1a2b3c4d5e6f7a8b9c0d2"
  }
}
```

Errors:

- `401` `NOT_LOGGED_IN` — no valid login.
- `403` `FORBIDDEN` — the user cannot restore events.
- `404` `EVENT_NOT_FOUND` — the event does not exist.
- `409` `EVENT_NOT_ARCHIVED` — the event is not currently archived.

Event archive fields: `isArchived`, `archivedAt`, `archivedBy`, `archiveReason`, `restoredAt`, `restoredBy`.

These endpoints are proposed contracts and must be reviewed with Theo before implementation.

Owner: Jasser.

See README.md in this folder for conventions (error shape, cookie, status codes).