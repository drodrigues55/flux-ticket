# Auth Environment Configuration Guide

This runbook covers configuring authentication, cookies, and signing secrets.

## 1. Environment Variables
- `JWT_SECRET`: HS256 symmetric signing secret key.
  - MUST be set to a secure 32+ character random string in staging/production.
  - Defaults to `dev-jwt-secret-key` in development mode.

## 2. Session and Cookie Hardening
When configuring session cookies:
- Ensure `Secure` flag is enabled (requires HTTPS).
- Enforce `HttpOnly` to block cross-site scripting (XSS) read access.
- Configure `SameSite=Lax` or `Strict` to prevent CSRF risks.
