# Myo Express API V2 Documentation for PC Frontend Migration

This document provides comprehensive API endpoint documentation for migrating the PC frontend from v1 to v2 routes. All v2 endpoints follow the `/api/v2/` pattern and use consistent request/response structures.

## Base URL and Authentication

- **Base URL**: `http://localhost:3000` (development) or your production API URL
- **Authentication**: Bearer token in Authorization header: `Authorization: Bearer <jwt_token>`
- **Content-Type**: `application/json` for all POST/PUT/PATCH requests

## Response Format Standards

All API responses follow this consistent structure:

```json
{
  "data": { /* actual response data */ },
  "message": "Success message"
}
```

Error responses:
```json
{
  "error": "Error type",
  "message": "Error description",
  "details": "Additional error details"
}
```

## 1. Authentication Endpoints

### Sign Up
```http
POST /api/v2/signup
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe", 
  "email": "john.doe@example.com",
  "password": "MySecure123!"
}
```

**Response:**
```json
{
  "data": {
    "message": "You've successfully created an account. Please verify your email."
  }
}
```

### Login
```http
POST /api/v2/login
```

**Request Body:**
```json
{
  "username": "john.doe@example.com",
  "password": "MySecure123!"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Password Reset
```http
POST /api/v2/forgot-password
```

**Request Body:**
```json
{
  "email": "john.doe@example.com"
}
```

**Response:**
```json
{
  "data": {
    "message": "Password reset email sent successfully."
  }
}
```

```http
POST /api/v2/reset-password
```

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "newPassword": "MyNewSecure123!"
}
```

## 2. User Management Endpoints

### Get All Users
```http
GET /api/v2/users
```

**Headers:** Authorization required

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "firstname": "John",
      "lastname": "Doe",
      "username": "john.doe@example.com",
      "role": "USER",
      "emailVerified": true,
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  ],
  "message": "Users fetched successfully"
}
```

### Get User by ID
```http
GET /api/v2/users/:id
```

**Headers:** Authorization required

**Response:**
```json
{
  "data": {
    "id": 1,
    "firstname": "John",
    "lastname": "Doe", 
    "username": "john.doe@example.com",
    "role": "USER",
    "emailVerified": true,
    "createdAt": "2023-01-01T00:00:00.000Z"
  },
  "message": "User details fetched successfully"
}
```

### Assign User to Trainer
```http
POST /api/v2/users/assign
```

**Headers:** Authorization required

**Request Body:**
```json
{
  "userId": 123
}
```

### Get Users Assigned to Current Trainer
```http
GET /api/v2/users/trainer/assigned
```

**Headers:** Authorization required

## 3. Program Management Endpoints

### Get User Programs
```http
GET /api/v2/programs
```

**Headers:** Authorization required

**Query Parameters:**
- `status` (optional): Filter by status - "PENDING", "ACTIVE", "COMPLETED", "ARCHIVED"

**Response:**
```json
{
  "data": {
    "programs": [
      {
        "id": 1,
        "name": "Beginner Strength Program",
        "goal": "STRENGTH",
        "programType": "AUTOMATED", 
        "status": "ACTIVE",
        "startDate": "2023-01-01T00:00:00.000Z",
        "endDate": null,
        "totalWorkouts": 12,
        "userId": 1
      }
    ],
    "programCounts": {
      "active": 1,
      "pending": 0,
      "completed": 2,
      "archived": 1
    },
    "activeProgram": {
      "id": 1,
      "name": "Beginner Strength Program"
    }
  },
  "message": "Programs fetched successfully"
}
```

### Get Programs for Specific User
```http
GET /api/v2/programs/:userId
```

**Headers:** Authorization required

### Get Next Workout
```http
GET /api/v2/programs/:programId/nextWorkout
```

**Headers:** Authorization required

**Response:**
```json
{
  "data": {
    "workout": {
      "id": 5,
      "name": "Day 1 - Upper Body",
      "programId": 1,
      "dayNumber": 1,
      "isCompleted": false,
      "exercises": [
        {
          "id": 1,
          "name": "Bench Press",
          "equipment": "BARBELL",
          "category": "COMPOUND",
          "sets": 3,
          "reps": 8,
          "weight": 80.0
        }
      ]
    },
    "isNewCycle": false,
    "cycleNumber": 1
  }
}
```

### Create Program
```http
POST /api/v2/programs
```

**Headers:** Authorization required

**Request Body:**
```json
{
  "name": "My Custom Program",
  "goal": "HYPERTROPHY",
  "programType": "MANUAL"
}
```

### Create Program with Workouts
```http
POST /api/v2/programs/create-with-workouts
```

**Headers:** Authorization required

**Request Body:**
```json
{
  "name": "Complete Program",
  "goal": "STRENGTH",
  "programType": "MANUAL",
  "userId": 123,
  "activateProgram": true,
  "workouts": [
    {
      "name": "Day 1 - Upper",
      "dayNumber": 1,
      "exercises": [
        {
          "exerciseId": 1,
          "sets": 3,
          "reps": 8,
          "weight": 80.0
        }
      ]
    }
  ]
}
```

### Update Program Status
```http
PATCH /api/v2/programs/:programId/status
```

**Headers:** Authorization required

**Request Body:**
```json
{
  "status": "ACTIVE"
}
```

### Delete Program
```http
DELETE /api/v2/programs/:programId
```

**Headers:** Authorization required

## 4. Workout Management Endpoints

### Get Program Workouts
```http
GET /api/v2/programs/:programId/workouts
```

**Headers:** Authorization required

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Day 1 - Upper Body",
      "dayNumber": 1,
      "programId": 1,
      "isCompleted": false,
      "exercises": [
        {
          "id": 1,
          "exerciseId": 1,
          "name": "Bench Press",
          "sets": 3,
          "reps": 8,
          "weight": 80.0,
          "equipment": "BARBELL",
          "category": "COMPOUND"
        }
      ]
    }
  ]
}
```

### Get Workout Exercises with Completion Data
```http
GET /api/v2/workouts/:workoutId/exercises
```

**Headers:** Authorization required

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "exerciseId": 1,
      "name": "Bench Press",
      "sets": 3,
      "reps": 8,
      "weight": 80.0,
      "equipment": "BARBELL",
      "category": "COMPOUND",
      "lastCompleted": {
        "weight": 75.0,
        "reps": 8,
        "sets": 3,
        "rating": 4,
        "completedAt": "2023-01-01T00:00:00.000Z"
      },
      "progression": {
        "suggestedWeight": 82.5,
        "suggestedReps": 8,
        "progressionType": "WEIGHT_INCREASE"
      }
    }
  ]
}
```

### Complete Full Workout
```http
POST /api/v2/workouts/completeWorkout
```

**Headers:** Authorization required

**Request Body:**
```json
[
  {
    "userId": 1,
    "workoutId": 5,
    "exerciseId": 1,
    "sets": 3,
    "reps": 8,
    "weight": 80.0,
    "rating": 4,
    "useAdaptiveIncrements": true,
    "programGoal": "STRENGTH"
  },
  {
    "userId": 1,
    "workoutId": 5,
    "exerciseId": 2,
    "sets": 3,
    "reps": 10,
    "weight": 25.0,
    "rating": 3,
    "useAdaptiveIncrements": true,
    "programGoal": "STRENGTH"
  }
]
```

### Rate Individual Exercise
```http
POST /api/v2/workouts/rate-exercise
```

**Headers:** Authorization required

**Request Body:**
```json
{
  "exerciseId": 1,
  "workoutId": 5,
  "sets": 3,
  "reps": 8,
  "weight": 80.0,
  "rating": 4,
  "equipment_type": "BARBELL",
  "is_compound": true,
  "useAdaptiveIncrements": true,
  "programGoal": "STRENGTH"
}
```

### Add Workout to Program
```http
POST /api/v2/workouts/addworkout
```

**Headers:** Authorization required

**Request Body:**
```json
{
  "name": "Day 4 - Arms",
  "programId": 1
}
```

## 5. Exercise Management Endpoints

### Get All Exercises
```http
GET /api/v2/exercises
```

**Headers:** Authorization required

**Response:**
```json
[
  {
    "id": 1,
    "name": "Bench Press",
    "equipment": "BARBELL",
    "category": "COMPOUND",
    "defaultIncrementKg": 2.5,
    "minWeight": 20.0,
    "maxWeight": 200.0,
    "notes": "Keep shoulder blades retracted",
    "videoUrl": "https://example.com/video.mp4",
    "muscle_groups": [
      {
        "muscle_group": {
          "id": 1,
          "name": "Chest",
          "description": "Pectoral muscles"
        }
      }
    ]
  }
]
```

### Get Exercise by ID
```http
GET /api/v2/exercises/:id
```

**Headers:** Authorization required

### Create Exercise
```http
POST /api/v2/exercises
```

**Headers:** Authorization required

**Request Body:**
```json
{
  "name": "Incline Dumbbell Press",
  "equipment": "DUMBBELL",
  "category": "COMPOUND",
  "defaultIncrementKg": 2.5,
  "minWeight": 5.0,
  "maxWeight": 50.0,
  "notes": "Incline bench at 30-45 degrees",
  "videoUrl": "https://example.com/video.mp4",
  "muscleGroupIds": [1, 2]
}
```

### Update Exercise
```http
PUT /api/v2/exercises/:id
```

**Headers:** Authorization required

### Delete Exercise
```http
DELETE /api/v2/exercises/:id
```

**Headers:** Authorization required

### Upsert Exercises to Workout
```http
POST /api/v2/exercises/upsertExercisesToWorkout
```

**Headers:** Authorization required

**Request Body:**
```json
{
  "workoutId": 5,
  "exercises": [
    {
      "exerciseId": 1,
      "sets": 3,
      "reps": 8,
      "weight": 80.0
    }
  ]
}
```

## 6. Muscle Groups Endpoints

### Get All Muscle Groups
```http
GET /api/v2/muscle-groups
```

**Headers:** Authorization required

**Response:**
```json
[
  {
    "id": 1,
    "name": "Chest",
    "description": "Pectoral muscles",
    "exercises": [
      {
        "id": 1,
        "name": "Bench Press"
      }
    ]
  }
]
```

### Get Muscle Group by ID
```http
GET /api/v2/muscle-groups/:id
```

**Headers:** Authorization required

### Create Muscle Group
```http
POST /api/v2/muscle-groups
```

**Headers:** Authorization required

**Request Body:**
```json
{
  "name": "Upper Back",
  "description": "Latissimus dorsi, rhomboids, middle traps"
}
```

### Update Muscle Group
```http
PUT /api/v2/muscle-groups/:id
```

**Headers:** Authorization required

### Delete Muscle Group
```http
DELETE /api/v2/muscle-groups/:id
```

**Headers:** Authorization required

## 7. User Settings Endpoints

### Get User Settings
```http
GET /api/v2/user-settings
```

**Headers:** Authorization required

**Response:**
```json
{
  "data": {
    "userId": 1,
    "theme": "DARK",
    "units": "METRIC",
    "notifications": {
      "workoutReminders": true,
      "progressUpdates": true
    },
    "defaultRestTime": 120,
    "autoProgressWeight": true
  }
}
```

### Update User Settings
```http
PATCH /api/v2/user-settings
```

**Headers:** Authorization required

**Request Body:**
```json
{
  "theme": "LIGHT",
  "units": "IMPERIAL", 
  "notifications": {
    "workoutReminders": false,
    "progressUpdates": true
  },
  "defaultRestTime": 180
}
```

### Get Default Settings
```http
GET /api/v2/user-settings/defaults
```

**Headers:** Authorization required

### Reset Settings to Defaults
```http
POST /api/v2/user-settings/reset
```

**Headers:** Authorization required

## 8. Statistics and Progress Endpoints

### Get Exercise Progression
```http
GET /api/v2/progression/programs/:programId/exercises
```

**Headers:** Authorization required

**Response:**
```json
{
  "data": [
    {
      "exerciseId": 1,
      "exerciseName": "Bench Press",
      "baseline": {
        "weight": 60.0,
        "reps": 8,
        "sets": 3
      },
      "progressionHistory": [
        {
          "date": "2023-01-01",
          "weight": 65.0,
          "reps": 8,
          "sets": 3,
          "rating": 4
        }
      ],
      "lastCompleted": {
        "weight": 80.0,
        "reps": 8,
        "sets": 3,
        "rating": 4,
        "completedAt": "2023-01-15T00:00:00.000Z"
      }
    }
  ]
}
```

### Get Completed Exercises Volume Data
```http
GET /api/v2/completed-exercises/programs/:programId
```

**Headers:** Authorization required

**Query Parameters:**
- `timeframe` (optional): "week", "month", "program", "all" (default: "program")

**Response:**
```json
{
  "data": {
    "volumeByDate": [
      {
        "date": "2023-01-01",
        "totalVolume": 2400,
        "exerciseCount": 4
      }
    ],
    "volumeByMuscleGroup": [
      {
        "muscleGroup": "Chest",
        "totalVolume": 1200,
        "percentage": 50.0
      }
    ],
    "topExercisesByVolume": [
      {
        "exerciseName": "Bench Press",
        "totalVolume": 960,
        "sessions": 3
      }
    ],
    "weeklyTrend": {
      "currentWeek": 2400,
      "previousWeek": 2200,
      "changePercentage": 9.1
    }
  }
}
```

### Get Workout Progress
```http
GET /api/v2/workout-progress/programs/:programId
```

**Headers:** Authorization required

**Query Parameters:**
- `timeframe` (optional): "week", "month", "program", "all" (default: "program")

**Response:**
```json
{
  "data": {
    "currentStreak": 5,
    "longestStreak": 12,
    "totalWorkouts": 24,
    "weeklyFrequency": 3.2,
    "consistencyPercentage": 87.5,
    "workoutDates": [
      "2023-01-01",
      "2023-01-03",
      "2023-01-05"
    ]
  }
}
```

### Get Program Statistics
```http
GET /api/v2/programs/:programId/statistics
```

**Headers:** Authorization required

**Response:**
```json
{
  "data": {
    "program": {
      "id": 1,
      "name": "Beginner Strength Program",
      "goal": "STRENGTH",
      "startDate": "2023-01-01T00:00:00.000Z"
    },
    "completionPercentage": 65.2,
    "totalWorkouts": 12,
    "completedWorkouts": 8,
    "strengthGains": [
      {
        "exerciseName": "Bench Press",
        "startingWeight": 60.0,
        "currentWeight": 80.0,
        "gainPercentage": 33.3,
        "totalSessions": 8
      }
    ],
    "totalVolumeLifted": 45600,
    "averageSessionDuration": 72
  }
}
```

## 9. Program Templates Endpoints

### Get All Templates
```http
GET /api/v2/templates
```

**Query Parameters:**
- `category` (optional): "STRENGTH", "HYPERTROPHY", "POWERLIFTING", "GENERAL"
- `difficulty` (optional): "BEGINNER", "INTERMEDIATE", "ADVANCED"
- `goal` (optional): "STRENGTH", "HYPERTROPHY"
- `frequency` (optional): Number of weekly sessions

**Response:**
```json
[
  {
    "id": 1,
    "name": "Starting Strength",
    "description": "A beginner-friendly strength program",
    "category": "STRENGTH",
    "difficulty": "BEGINNER",
    "goal": "STRENGTH",
    "frequency": 3,
    "programType": "AUTOMATED",
    "durationWeeks": 12,
    "isActive": true
  }
]
```

### Get Template by ID
```http
GET /api/v2/templates/:id
```

**Response:**
```json
{
  "id": 1,
  "name": "Starting Strength",
  "description": "A beginner-friendly strength program",
  "category": "STRENGTH",
  "difficulty": "BEGINNER",
  "goal": "STRENGTH",
  "frequency": 3,
  "durationWeeks": 12,
  "workouts": [
    {
      "id": 1,
      "name": "Workout A",
      "dayNumber": 1,
      "exercises": [
        {
          "id": 1,
          "exerciseId": 1,
          "exerciseName": "Squat",
          "sets": 3,
          "reps": 5,
          "weight": null,
          "restTimeSeconds": 180
        }
      ]
    }
  ]
}
```

### Create Program from Template
```http
POST /api/v2/templates/:id/create-program
```

**Headers:** Authorization required

**Request Body:**
```json
{
  "customName": "My Starting Strength Program"
}
```

### Create Template (Admin)
```http
POST /api/v2/templates
```

**Headers:** Authorization required (Admin role)

**Request Body:**
```json
{
  "name": "Custom Template",
  "description": "A custom program template",
  "category": "STRENGTH",
  "difficulty": "INTERMEDIATE",
  "goal": "STRENGTH",
  "frequency": 4,
  "durationWeeks": 16,
  "workouts": [
    {
      "name": "Upper Power",
      "dayNumber": 1,
      "exercises": [
        {
          "exerciseId": 1,
          "sets": 4,
          "reps": 5,
          "restTimeSeconds": 180
        }
      ]
    }
  ]
}
```

### Update Template (Admin)
```http
PUT /api/v2/templates/:id
```

**Headers:** Authorization required (Admin role)

### Delete Template (Admin)
```http
DELETE /api/v2/templates/:id
```

**Headers:** Authorization required (Admin role)

## Common Data Types and Enums

### Equipment Types
- `DUMBBELL`
- `BARBELL`
- `CABLE`
- `MACHINE`
- `BODYWEIGHT`

### Exercise Categories
- `COMPOUND`
- `ISOLATION`

### Program Goals
- `STRENGTH`
- `HYPERTROPHY`

### Program Status
- `PENDING`
- `ACTIVE`
- `COMPLETED`
- `ARCHIVED`

### Program Types
- `MANUAL`
- `AUTOMATED`

### Difficulty Levels
- `BEGINNER`
- `INTERMEDIATE`
- `ADVANCED`

### Program Categories
- `STRENGTH`
- `HYPERTROPHY`
- `POWERLIFTING`
- `GENERAL`

## Migration Notes for PC Frontend

1. **URL Pattern**: Change all endpoints from `/endpoint` to `/api/v2/endpoint`
2. **Authentication**: Ensure Bearer token is included in Authorization header
3. **Response Structure**: Update response handling to expect `{ data: ..., message: ... }` format
4. **Error Handling**: Update error handling for consistent error response format
5. **Data Types**: Update TypeScript interfaces to match the response structures above
6. **Query Parameters**: Some endpoints now support additional query parameters for filtering

## Example JavaScript/TypeScript Usage

```typescript
// Authentication header setup
const authHeaders = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

// Fetch user programs
const response = await fetch('/api/v2/programs', {
  headers: authHeaders
});
const { data, message } = await response.json();

// Complete workout
const workoutData = [
  {
    userId: 1,
    workoutId: 5,
    exerciseId: 1,
    sets: 3,
    reps: 8,
    weight: 80.0,
    rating: 4
  }
];

const completeResponse = await fetch('/api/v2/workouts/completeWorkout', {
  method: 'POST',
  headers: authHeaders,
  body: JSON.stringify(workoutData)
});
```

This documentation should provide everything needed to migrate the PC frontend to use the V2 API endpoints. Each endpoint includes example requests and responses with realistic data structures that match the actual API implementation.