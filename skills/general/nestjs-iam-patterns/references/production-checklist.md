# Production checklist for NestJS IAM

Check whatever applies to the mechanism(s) actually implemented. This list spans all patterns, so not every item applies to every project.

- [ ] `JWT_SECRET` kept outside the repository.
- [ ] HTTPS enforced.
- [ ] Passwords hashed with an appropriate algorithm.
- [ ] Login error messages don't allow user enumeration.
- [ ] Access tokens have a limited lifetime.
- [ ] Refresh token rotation in place.
- [ ] Redis secured with authentication/TLS where applicable.
- [ ] TTLs set on refresh token IDs in Redis.
- [ ] Multi-device/session handling addressed if concurrent sessions are needed.
- [ ] Revocation/logout implemented.
- [ ] API keys stored hashed, never in plain text.
- [ ] API key scopes in place if keys shouldn't inherit full user access.
- [ ] API key expiration/rotation supported.
- [ ] Google `audience` explicitly verified during `verifyIdToken`.
- [ ] Linked Google/local accounts handled explicitly (no password on Google-only accounts).
- [ ] TOTP secret encrypted at rest.
- [ ] TOTP confirmed via a verify step before 2FA is enabled.
- [ ] Recovery codes available for MFA, if applicable.
- [ ] Rate limiting on login, refresh, and MFA endpoints.
- [ ] Sensitive access is audited/logged.
- [ ] CORS restricted in production.
- [ ] Cookies set with `HttpOnly`, `Secure`, and an appropriate `SameSite`.
- [ ] CSRF protection in place if authentication relies on cookies.
- [ ] JWTs, passwords, API keys, and TOTP secrets never written to logs.
- [ ] `401` and `403` used correctly (authentication failure vs. authorization failure).
- [ ] Unit and e2e tests cover guards and authentication flows.
