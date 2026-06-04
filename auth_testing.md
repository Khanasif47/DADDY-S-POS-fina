# Auth Testing Playbook (DADDY's Bakery POS)

## MongoDB Verification
```
mongosh
use test_database
db.users.find({role: "admin"}).pretty()
db.users.findOne({role: "admin"}, {password_hash: 1})
```
Verify:
- bcrypt hash starts with `$2b$`
- indexes exist on:
  - users.email (unique)
  - login_attempts.identifier
  - password_reset_tokens.expires_at (TTL, expireAfterSeconds: 0)

## API Testing
```
curl -c cookies.txt -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@daddysbakery.com","password":"admin123"}'

cat cookies.txt
curl -b cookies.txt http://localhost:8001/api/auth/me
```

Expected:
- Login returns user JSON (no password_hash)
- access_token + refresh_token cookies set
- /me returns the same user using those cookies
- /api/auth/logout clears cookies
