# Frontend API V2 Integration Guide

## Overview

This document provides comprehensive guidance for integrating with the new V2 API endpoints. All V2 routes follow consistent patterns with improved validation, error handling, and response structures.

## Migration Status

### ✅ **Completed V2 Migrations (4/8)**
1. **muscleGroups** → **muscleGroupsV2** ✅
2. **users** → **usersV2** ✅  
3. **userSettings** → **userSettingsV2** ✅
4. **progression** → **progressionV2** ✅

### 🔄 **Remaining Migrations (4/8)**
5. **template** → **templateV2** (In Progress)
6. **programs** → **programsV2** (Planned)
7. **stats** → **statsV2** (Planned)  
8. **password** → **passwordV2** (Planned)

---

## Common V2 Patterns

### Authentication
All V2 endpoints require authentication via Bearer token:
```javascript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

### Response Format
All V2 endpoints return consistent response structures:

**Success Response:**
```json
{
  "data": { /* actual data */ },
  "message": "Success message"
}
```

**Error Response:**
```json
{
  "error": "Error type",
  "message": "Human readable message",
  "details": "Technical details (optional)"
}
```

**Validation Error Response:**
```json
{
  "errors": [
    {
      "msg": "Validation error message",
      "param": "fieldName",
      "location": "body"
    }
  ],
  "message": "Validation failed"
}
```

---

## 1. Muscle Groups API (V2)

### Endpoints

#### GET /api/v2/muscle-groups
Get all muscle groups
```javascript
const response = await fetch('/api/v2/muscle-groups', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data } = await response.json();
```

#### GET /api/v2/muscle-groups/:id
Get muscle group by ID
```javascript
const response = await fetch(`/api/v2/muscle-groups/${id}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data } = await response.json();
```

#### POST /api/v2/muscle-groups
Create new muscle group
```javascript
const response = await fetch('/api/v2/muscle-groups', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Chest'
  })
});
const { data } = await response.json();
```

#### PUT /api/v2/muscle-groups/:id
Update muscle group
```javascript
const response = await fetch(`/api/v2/muscle-groups/${id}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Updated Name'
  })
});
```

#### DELETE /api/v2/muscle-groups/:id
Delete muscle group
```javascript
const response = await fetch(`/api/v2/muscle-groups/${id}`, {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Backward Compatibility
- `GET /muscleGroups` → Use `GET /api/v2/muscle-groups`

---

## 2. Users API (V2)

### Endpoints

#### GET /api/v2/users
Get all users (transformed to UserDetail format)
```javascript
const response = await fetch('/api/v2/users', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data } = await response.json();
// data: Array<{ id, firstName, lastName, username }>
```

#### GET /api/v2/users/:id
Get user by ID (with authorization checks)
```javascript
const response = await fetch(`/api/v2/users/${id}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data } = await response.json();
// Full user profile with role, trainerId, etc.
```

#### POST /api/v2/users/assign
Assign user to trainer
```javascript
const response = await fetch('/api/v2/users/assign', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: 123
  })
});
```

#### GET /api/v2/users/trainer/assigned
Get users assigned to current trainer
```javascript
const response = await fetch('/api/v2/users/trainer/assigned', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data } = await response.json();
// Array of assigned users
```

### Authorization Rules
- **Admin**: Can access any user
- **User**: Can access own profile only
- **Trainer**: Can access assigned users only

### Backward Compatibility
- `GET /users` → Use `GET /api/v2/users`
- `GET /user/:id` → Use `GET /api/v2/users/:id`
- `POST /assign-user` → Use `POST /api/v2/users/assign`

---

## 3. User Settings API (V2)

### Endpoints

#### GET /api/v2/user-settings
Get user settings with program goal
```javascript
const response = await fetch('/api/v2/user-settings', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data } = await response.json();
```

**Response Structure:**
```json
{
  "data": {
    "experienceLevel": "BEGINNER",
    "barbellIncrement": 2.5,
    "dumbbellIncrement": 2.0,
    "cableIncrement": 2.5,
    "machineIncrement": 5.0,
    "useMetric": true,
    "darkMode": true,
    "programGoal": "HYPERTROPHY"
  }
}
```

#### PATCH /api/v2/user-settings
Update user settings
```javascript
const response = await fetch('/api/v2/user-settings', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    experienceLevel: 'INTERMEDIATE',
    barbellIncrement: 5.0,
    useMetric: false,
    darkMode: true
  })
});
```

**Validation Rules:**
- `experienceLevel`: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
- `*Increment`: 0.1 to 100 (float)
- `useMetric`, `darkMode`: boolean

#### GET /api/v2/user-settings/defaults
Get default settings structure
```javascript
const response = await fetch('/api/v2/user-settings/defaults', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data } = await response.json();
// Returns default values for all settings
```

#### POST /api/v2/user-settings/reset
Reset settings to defaults
```javascript
const response = await fetch('/api/v2/user-settings/reset', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Complex Business Logic
- **Auto Default Creation**: Creates defaults if none exist
- **Program Integration**: Updates program progression when experience level changes
- **Default Program Creation**: Creates program if none exists

### Backward Compatibility
- `GET /user-settings` → Use `GET /api/v2/user-settings`
- `PATCH /user-settings` → Use `PATCH /api/v2/user-settings`

---

## 4. Progression API (V2)

### Endpoints

#### GET /api/v2/progression/workouts/:workoutId/exercises/:exerciseId
Get progression history for specific exercise
```javascript
const response = await fetch(
  `/api/v2/progression/workouts/${workoutId}/exercises/${exerciseId}`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);
const { data } = await response.json();
```

**Response Structure:**
```json
{
  "data": {
    "baseline": {
      "sets": 3,
      "reps": 10,
      "weight": 50.0
    },
    "current": {
      "sets": 3,
      "reps": 12,
      "weight": 55.0
    },
    "lastCompleted": {
      "sets": 3,
      "reps": 12,
      "weight": "55.0",
      "rating": 4,
      "completedAt": "2025-09-01T10:00:00Z"
    },
    "progressionHistory": [
      {
        "id": 1,
        "oldWeight": 50.0,
        "newWeight": 55.0,
        "oldReps": 10,
        "newReps": 12,
        "reason": "Performance improvement",
        "createdAt": "2025-08-25T10:00:00Z"
      }
    ]
  }
}
```

#### GET /api/v2/progression/workouts/:workoutId
Get progression data for all exercises in workout
```javascript
const response = await fetch(`/api/v2/progression/workouts/${workoutId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data } = await response.json();
// Array of exercise progression data
```

#### GET /api/v2/progression/exercises/:exerciseId/programs/:programId/stats
Get progression statistics for an exercise
```javascript
const response = await fetch(
  `/api/v2/progression/exercises/${exerciseId}/programs/${programId}/stats`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);
const { data } = await response.json();
```

**Response Structure:**
```json
{
  "data": {
    "totalProgressions": 15,
    "averageWeightIncrease": 2.5,
    "averageRepsIncrease": 1.2,
    "lastProgressionDate": "2025-08-30T10:00:00Z"
  }
}
```

#### GET /api/v2/progression/overview
Get user progression overview (placeholder)
```javascript
const response = await fetch('/api/v2/progression/overview', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Performance Optimizations
- **Parallel Queries**: Baseline, history, and current data fetched simultaneously
- **Batch Processing**: Multiple exercises processed efficiently
- **Lookup Maps**: Fast data retrieval for large workout sets

### Backward Compatibility  
- `GET /workouts/:workoutId/exercises/:exerciseId/progression` → Use V2 path
- `GET /workouts/:workoutId/progression` → Use V2 path

---

## 5. Workouts API (V2) - Existing

These endpoints were previously migrated and have backward compatibility:

### Key Endpoints
- `POST /api/v2/workouts/completeWorkout` (was `/workouts/completeWorkout`)
- `POST /api/v2/workouts/rate-exercise` (was `/workouts/rate-exercise`)
- `GET /api/v2/workouts/:workoutId/exercises`
- `POST /api/v2/workouts/addworkout`

---

## 6. Exercises API (V2) - Existing

Previously migrated exercise endpoints:

### Key Endpoints
- `GET /api/v2/exercises`
- `POST /api/v2/exercises`
- Enhanced validation and error handling

---

## Migration Strategy for Frontend

### Phase 1: Update Existing API Calls
1. **Update Base URLs**: Change from legacy paths to `/api/v2/*` paths
2. **Update Response Handling**: Adapt to new consistent response format
3. **Update Error Handling**: Handle new structured error responses
4. **Add Validation**: Implement client-side validation matching API rules

### Phase 2: Enhance with New Features
1. **New Endpoints**: Utilize new endpoints like defaults, reset, stats
2. **Better UX**: Leverage improved error messages and validation
3. **Real-time Updates**: Use new progression statistics for better UI

### Phase 3: Remove Backward Compatibility
1. **Verify Migration**: Ensure all calls use V2 endpoints
2. **Test Thoroughly**: Validate all functionality works
3. **Clean Up**: Remove old API integration code

---

## Error Handling Best Practices

### Handle Different Error Types
```javascript
try {
  const response = await fetch('/api/v2/users/123', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    
    if (response.status === 400 && errorData.errors) {
      // Validation errors
      handleValidationErrors(errorData.errors);
    } else if (response.status === 401) {
      // Authentication error
      redirectToLogin();
    } else if (response.status === 403) {
      // Authorization error
      showUnauthorizedMessage();
    } else if (response.status === 404) {
      // Not found
      showNotFoundMessage();
    } else {
      // General server error
      showErrorMessage(errorData.message || 'Something went wrong');
    }
    return;
  }
  
  const { data } = await response.json();
  // Handle success
} catch (error) {
  // Network error
  showErrorMessage('Network error. Please try again.');
}
```

### Validation Error Handling
```javascript
function handleValidationErrors(errors) {
  errors.forEach(error => {
    // Show error next to specific field
    showFieldError(error.param, error.msg);
  });
}
```

---

## Testing Checklist

### For Each Migrated Route:
- [ ] **Authentication**: Verify token validation works
- [ ] **Authorization**: Test role-based access (Admin/Trainer/User)
- [ ] **Validation**: Test all validation rules with invalid data
- [ ] **Success Cases**: Verify all happy path scenarios
- [ ] **Error Handling**: Test all error conditions
- [ ] **Backward Compatibility**: Ensure old routes still work during transition
- [ ] **Response Format**: Verify consistent response structure
- [ ] **Performance**: Check response times are acceptable

---

## Next Steps

1. **Copy this file** to your frontend repository
2. **Start with muscle groups** - simplest migration to test the process
3. **Update one component at a time** to use V2 endpoints
4. **Test thoroughly** before proceeding to next component
5. **Coordinate with backend** for remaining migrations (template, programs, stats, password)

---

## Contact & Support

For questions or issues with the V2 API migration:
1. Check this documentation first
2. Test with the provided examples
3. Verify authentication and request format
4. Contact backend team for additional support

**Note**: This is a living document that will be updated as more routes are migrated to V2.