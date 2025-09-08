# Program Templates API Documentation

## Base URL
```
http://localhost:3000/api/v2/templates
```

## Public Endpoints (No Authentication Required)

### 1. Get All Templates
**GET** `/api/v2/templates`

Browse all available program templates with optional filtering.

**Query Parameters:**
- `category` (optional): Filter by category (`STRENGTH`, `HYPERTROPHY`, `POWERLIFTING`, `GENERAL`)
- `difficulty` (optional): Filter by difficulty (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`)
- `goal` (optional): Filter by goal (`HYPERTROPHY`, `STRENGTH`)
- `frequency_per_week` (optional): Filter by weekly frequency (1-7)
- `program_type` (optional): Filter by type (`MANUAL`, `AUTOMATED`)

**Example Requests:**
```bash
# Get all templates
curl http://localhost:3000/api/v2/templates

# Get beginner templates
curl "http://localhost:3000/api/v2/templates?difficulty=BEGINNER"

# Get strength-focused templates
curl "http://localhost:3000/api/v2/templates?category=STRENGTH&goal=STRENGTH"

# Get 3-day templates
curl "http://localhost:3000/api/v2/templates?frequency_per_week=3"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Beginner Full Body",
      "description": "Perfect for those new to strength training...",
      "difficulty_level": "BEGINNER",
      "frequency_per_week": 3,
      "category": "GENERAL",
      "goal": "HYPERTROPHY",
      "program_type": "AUTOMATED",
      "duration_weeks": 12,
      "is_active": true,
      "created_by_admin": true,
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-01T00:00:00.000Z"
    }
  ],
  "message": "Templates retrieved successfully"
}
```

### 2. Get Template Details
**GET** `/api/v2/templates/:id`

Get detailed information about a specific template including all workouts and exercises.

**Path Parameters:**
- `id` (required): Template ID (integer)

**Example Request:**
```bash
curl http://localhost:3000/api/v2/templates/1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Beginner Full Body",
    "description": "Perfect for those new to strength training...",
    "difficulty_level": "BEGINNER",
    "frequency_per_week": 3,
    "category": "GENERAL",
    "goal": "HYPERTROPHY",
    "program_type": "AUTOMATED",
    "duration_weeks": 12,
    "is_active": true,
    "created_by_admin": true,
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T00:00:00.000Z",
    "template_workouts": [
      {
        "id": 1,
        "template_id": 1,
        "name": "Full Body A",
        "order": 1,
        "created_at": "2025-01-01T00:00:00.000Z",
        "template_exercises": [
          {
            "id": 1,
            "template_workout_id": 1,
            "exercise_id": 1,
            "sets": 3,
            "reps": 8,
            "weight": 20.0,
            "order": 1,
            "notes": null,
            "exercise": {
              "id": 1,
              "name": "Squat",
              "equipment": "BARBELL",
              "category": "COMPOUND"
            }
          }
        ]
      }
    ]
  },
  "message": "Template details retrieved successfully"
}
```

## Authenticated Endpoints (Requires JWT Token)

### 3. Create Program from Template
**POST** `/api/v2/templates/:id/create-program`

Create a new user program based on a template.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Path Parameters:**
- `id` (required): Template ID (integer)

**Request Body:**
```json
{
  "name": "My Custom Program Name",
  "start_date": "2025-01-01T00:00:00.000Z"  // optional, defaults to now
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/v2/templates/1/create-program \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Starting Strength Program"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "program_id": 42,
    "program_name": "My Starting Strength Program",
    "workouts_created": 3,
    "exercises_created": 15
  },
  "message": "Program created successfully from template"
}
```

## Admin-Only Endpoints (Requires Admin Role)

### 4. Create New Template
**POST** `/api/v2/templates`

Create a new program template (admin only).

**Headers:**
```
Authorization: Bearer <ADMIN_JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "New Custom Template",
  "description": "Description of the new template",
  "difficulty_level": "INTERMEDIATE",
  "frequency_per_week": 4,
  "duration_weeks": 8,
  "category": "HYPERTROPHY",
  "goal": "HYPERTROPHY",
  "program_type": "MANUAL",
  "template_workouts": [
    {
      "name": "Upper Body",
      "order": 1,
      "template_exercises": [
        {
          "exercise_id": 1,
          "sets": 4,
          "reps": 8,
          "weight": 50.0,
          "order": 1,
          "notes": "Focus on form"
        }
      ]
    }
  ]
}
```

### 5. Update Template
**PUT** `/api/v2/templates/:id`

Update an existing template (admin only).

**Headers:**
```
Authorization: Bearer <ADMIN_JWT_TOKEN>
Content-Type: application/json
```

**Request Body:** (all fields optional for partial updates)
```json
{
  "name": "Updated Template Name",
  "description": "Updated description",
  "difficulty_level": "ADVANCED",
  "is_active": false
}
```

### 6. Deactivate Template
**DELETE** `/api/v2/templates/:id`

Deactivate (soft delete) a template (admin only).

**Headers:**
```
Authorization: Bearer <ADMIN_JWT_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Template Name",
    "is_active": false
  },
  "message": "Template deactivated successfully"
}
```

## Error Responses

### Validation Errors (400)
```json
{
  "success": false,
  "errors": [
    {
      "type": "field",
      "value": "invalid_value",
      "msg": "Invalid difficulty level",
      "path": "difficulty",
      "location": "query"
    }
  ],
  "message": "Validation failed"
}
```

### Authentication Required (401)
```json
{
  "success": false,
  "error": "Authentication required",
  "message": "User not authenticated"
}
```

### Access Denied (403)
```json
{
  "success": false,
  "error": "Access denied",
  "message": "Admin privileges required"
}
```

### Not Found (404)
```json
{
  "success": false,
  "error": "Not found",
  "message": "Template not found"
}
```

### Template No Longer Available (410)
```json
{
  "success": false,
  "error": "Gone",
  "message": "Template is no longer available"
}
```

### Server Error (500)
```json
{
  "success": false,
  "error": "Internal server error",
  "message": "Failed to retrieve templates"
}
```

## Testing Commands

### Complete Test Suite
```bash
# 1. Test server health
curl http://localhost:3000/health

# 2. Run integration tests
node test-templates.js

# 3. Manual endpoint testing
curl http://localhost:3000/api/v2/templates
curl http://localhost:3000/api/v2/templates/1
curl "http://localhost:3000/api/v2/templates?difficulty=BEGINNER"
curl "http://localhost:3000/api/v2/templates?category=STRENGTH"
curl http://localhost:3000/api/v2/templates/99999  # Should return 404
```

### With Authentication (requires valid JWT token)
```bash
# Get JWT token from login endpoint first
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password"}' \
  | jq -r '.token')

# Create program from template
curl -X POST http://localhost:3000/api/v2/templates/1/create-program \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Test Program"}'
```

## Data Models

### Template Difficulty Levels
- `BEGINNER`: New to training
- `INTERMEDIATE`: 6+ months experience
- `ADVANCED`: 2+ years experience

### Program Categories
- `STRENGTH`: Focus on maximal strength
- `HYPERTROPHY`: Focus on muscle growth
- `POWERLIFTING`: Powerlifting-specific training
- `GENERAL`: General fitness and conditioning

### Program Types
- `MANUAL`: Requires manual progression
- `AUTOMATED`: Automatic progression built-in

### Goals
- `HYPERTROPHY`: Muscle growth primary goal
- `STRENGTH`: Strength development primary goal