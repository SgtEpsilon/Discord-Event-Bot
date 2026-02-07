# Preset Management API Reference

## Endpoints

### GET /api/presets
Get all presets (default + custom)

**Response:**
```json
{
  "overwatch": {
    "name": "Overwatch",
    "description": "5v5 competitive match",
    "duration": 90,
    "maxParticipants": 5,
    "roles": [
      { "name": "Tank", "emoji": "🛡️", "maxSlots": 1 }
    ]
  },
  "my-game": {
    "name": "My Game",
    "description": "Custom game preset",
    "duration": 120,
    "maxParticipants": 4,
    "roles": [...]
  }
}
```

---

### POST /api/presets
Create a new preset

**Request:**
```json
{
  "key": "my-game",
  "name": "My Game Name",
  "description": "Game description",
  "duration": 90,
  "maxParticipants": 4,
  "roles": [
    {
      "name": "Player",
      "emoji": "🎮",
      "maxSlots": 4
    }
  ]
}
```

**Success Response:**
```json
{
  "success": true,
  "preset": {
    "name": "My Game Name",
    "description": "Game description",
    "duration": 90,
    "maxParticipants": 4,
    "roles": [...]
  },
  "key": "my-game"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Preset already exists"
}
```

**Validation Rules:**
- `key`: Required, lowercase letters/numbers/hyphens only, pattern: `^[a-z0-9-]+$`
- `name`: Required, any text
- `duration`: Required, positive integer
- `roles`: Required, must have at least one role
- `maxParticipants`: Optional, defaults to 0 (unlimited)

---

### PUT /api/presets/:key
Update an existing preset

**Request:**
```json
{
  "name": "Updated Name",
  "description": "New description",
  "duration": 120,
  "maxParticipants": 6,
  "roles": [...]
}
```

**Success Response:**
```json
{
  "success": true,
  "preset": { ... }
}
```

**Note:** All fields optional, only provided fields are updated

---

### DELETE /api/presets/:key
Delete a preset

**Success Response:**
```json
{
  "success": true,
  "message": "Preset deleted"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Preset not found"
}
```

---

## Example Usage with JavaScript

### Create Preset
```javascript
async function createPreset() {
  const response = await fetch('http://localhost:3000/api/presets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key: 'lethal-company',
      name: 'Lethal Company',
      description: 'Meet the quota',
      duration: 90,
      maxParticipants: 4,
      roles: [
        { name: 'Employee', emoji: '👷', maxSlots: 4 }
      ]
    })
  });
  
  const data = await response.json();
  console.log(data);
}
```

### Delete Preset
```javascript
async function deletePreset(key) {
  const response = await fetch(`http://localhost:3000/api/presets/${key}`, {
    method: 'DELETE'
  });
  
  const data = await response.json();
  console.log(data);
}
```

### Update Preset
```javascript
async function updatePreset(key) {
  const response = await fetch(`http://localhost:3000/api/presets/${key}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      duration: 120,  // Update just the duration
      description: 'New description'
    })
  });
  
  const data = await response.json();
  console.log(data);
}
```

---

## Using with curl

### Create
```bash
curl -X POST http://localhost:3000/api/presets \
  -H "Content-Type: application/json" \
  -d '{
    "key": "my-game",
    "name": "My Game",
    "description": "Fun game",
    "duration": 90,
    "maxParticipants": 4,
    "roles": [
      {"name": "Player", "emoji": "🎮", "maxSlots": 4}
    ]
  }'
```

### Delete
```bash
curl -X DELETE http://localhost:3000/api/presets/my-game
```

### Get All
```bash
curl http://localhost:3000/api/presets
```

---

## Storage

Presets are stored in:
```
Discord-Event-Bot/presets.json
```

Changes via API are immediate and persistent.

---

## Error Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request (validation error) |
| 404 | Preset not found |
| 500 | Server error |

---

## Common Errors

### "Preset already exists"
- A preset with that key exists
- Choose different key or delete existing

### "Key must be lowercase..."
- Invalid characters in key
- Use only: a-z, 0-9, hyphens

### "Preset not found"
- Key doesn't exist
- Check spelling/capitalization

### "Key, name, duration, and roles are required"
- Missing required fields
- Include all required data
