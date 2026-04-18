# Auth Testing Playbook (Emergent OAuth)

## Step 1: Create Test User & Session via mongosh
```
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  auth_provider: 'google',
  subscription_tier: 'free',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Step 2: Test Backend API
```
curl -X GET "$BACKEND/api/auth/me" \
  -H "Authorization: Bearer $SESSION_TOKEN"
```

## Step 3: Browser Testing
```javascript
await page.context.add_cookies([{
  "name": "session_token",
  "value": "YOUR_SESSION_TOKEN",
  "domain": "audio-enhance-34.preview.emergentagent.com",
  "path": "/",
  "httpOnly": true,
  "secure": true,
  "sameSite": "None"
}]);
```

## Success Indicators
- /api/auth/me returns user data
- Dashboard loads without redirect
