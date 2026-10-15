# API contracts

One file per module. The backend owner of the module writes it before the frontend builds against it.

## Conventions (apply to every endpoint)

- Base URL: `/api`. JSON only. Field names are camelCase. Dates are ISO 8601 strings in UTC.
- Login uses an httpOnly cookie named `leagueops_token`. The frontend sends it with axios `withCredentials: true`.
- Error shape:
```
{ "message": "Readable text", "code": "EMAIL_TAKEN", "fields": { "email": "Already registered" } }
```
`fields` is only present for validation errors. Status codes: 400 validation, 401 not logged in, 403 not allowed, 404 not found, 409 conflict, 429 too many requests.
- Lists return:
```
{ "items": [], "total": 0, "page": 1, "totalPages": 1 }
```
List query parameters: `?page=1&limit=10&search=&sort=-createdAt` (default limit 10).
- Roles: `admin`, `head`, `committee`, `player`.

## Endpoint template

```
### METHOD /api/path
Who: public | any logged-in user | roles
Body: { ... }
Success: status + body
Errors: status + code + when
```

## Changing a contract

Open a PR that touches only the contract file, tag the people who consume it, and announce it in the group chat.

## Status

| Module | Owner | File |
|---|---|---|
| Auth | Theo | auth.md |
| Users | Theo | users.md |
| Events | Theo | events.md |
| Approvals | Theo | approvals.md |
| Registrations | Andrie | registrations.md |
| Matches (schedule and bracket) | Andrie | matches.md |
| Announcements | Andrie | announcements.md |
| Archive | Jasser | archive.md |
| Logs | Jasser | logs.md |
| Dashboard | Jasser | dashboard.md |
