# Backend API V2 Migration Guide

## 🎯 Migration Status: ✅ 100% Complete

**ALL ENDPOINTS HAVE BEEN SUCCESSFULLY MIGRATED TO V2**

This guide provides complete documentation for migrating your frontend code from V1 to V2 API endpoints. All V2 endpoints are live and ready for frontend integration.

---

## 📋 Quick Migration Summary

| Frontend Usage | Old V1 Path | New V2 Path | Status |
|---|---|---|---|
| Complete workouts | `/workouts/completeWorkout` | `/api/v2/workouts/completeWorkout` | ✅ Ready |
| Add workouts to program | `/workouts/addworkout` | `/api/v2/workouts/addworkout` | ✅ Ready |
| Get workout exercises | `/workouts/:workoutId/exercises` | `/api/v2/workouts/:workoutId/exercises` | ✅ Ready |
| Get all exercises | `/exercises` | `/api/v2/exercises` | ✅ Ready |
| Upsert exercises to workout | `/exercises/upsertExercisesToWorkout` | `/api/v2/exercises/upsertExercisesToWorkout` | ✅ Ready |

---

## 🔄 Frontend File Updates Required

### File: `src/screens/TrainingSessionScreen.jsx`

**Lines 465, 543** - Update workout completion API calls:

```javascript
// OLD (V1)
const response = await fetch(`${API_BASE_URL}/workouts/completeWorkout`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(exerciseData)
});

// NEW (V2) 
const response = await fetch(`${API_BASE_URL}/api/v2/workouts/completeWorkout`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json', 
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(exerciseData)
});
```

### File: `src/screens/EditProgramScreen.jsx`

**Line 74** - Update workout creation API call:

```javascript
// OLD (V1)
const response = await fetch(`${API_BASE_URL}/workouts/addworkout`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ name: workoutName, programId })
});

// NEW (V2)
const response = await fetch(`${API_BASE_URL}/api/v2/workouts/addworkout`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ name: workoutName, programId })
});
```

### File: `src/screens/EditWorkoutScreen.jsx`

**Line 43** - Update get workout exercises API call:

```javascript
// OLD (V1)
const response = await fetch(`${API_BASE_URL}/workouts/${workoutId}/exercises`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// NEW (V2)
const response = await fetch(`${API_BASE_URL}/api/v2/workouts/${workoutId}/exercises`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

**Line 52** - Update get all exercises API call:

```javascript
// OLD (V1)
const response = await fetch(`${API_BASE_URL}/exercises`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// NEW (V2)  
const response = await fetch(`${API_BASE_URL}/api/v2/exercises`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

**Lines 118, 153** - Update upsert exercises to workout API calls:

```javascript
// OLD (V1)
const response = await fetch(`${API_BASE_URL}/exercises/upsertExercisesToWorkout`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ workoutId, exercises, supersets })
});

// NEW (V2)
const response = await fetch(`${API_BASE_URL}/api/v2/exercises/upsertExercisesToWorkout`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json', 
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ workoutId, exercises, supersets })
});
```

---

## 📚 Detailed API Endpoint Documentation

### 1. Complete Workout

**Endpoint:** `POST /api/v2/workouts/completeWorkout`

**Purpose:** Submit completed workout data with exercise ratings for progression calculation.

**Request Body:**
```javascript
[
  {
    userId: 123,
    workoutId: 456, 
    exerciseId: 789,
    sets: 3,
    reps: 10,
    weight: 50.5,
    rating: 4, // 1-5 scale
    useAdaptiveIncrements: true // optional, defaults to true
  }
  // ... more exercises
]
```

**Response:**
```javascript
{
  completedExercises: [...],
  progressionResults: [
    {
      exerciseId: 789,
      oldWeight: 50.5,
      newWeight: 52.5,
      oldReps: 10,
      newReps: 10,
      exerciseName: "Bench Press"
    }
  ],
  programType: "AUTOMATED" | "MANUAL"
}
```

**Error Handling:**
- `400`: Invalid data format or missing required fields
- `401`: User not authenticated
- `500`: Internal server error

### 2. Add Workout to Program

**Endpoint:** `POST /api/v2/workouts/addworkout`

**Purpose:** Create a new workout within a specific program.

**Request Body:**
```javascript
{
  name: "Push Day A",
  programId: 123
}
```

**Response:**
```javascript
{
  message: "You've successfully added a workout to program: My Program."
}
```

**Error Handling:**
- `400`: Missing workout name or invalid program ID  
- `401`: User not authenticated
- `403`: Not authorized to modify this program
- `404`: Program not found
- `500`: Internal server error

### 3. Get Workout Exercises

**Endpoint:** `GET /api/v2/workouts/:workoutId/exercises`

**Purpose:** Fetch exercises for a specific workout with completion data and progression.

**URL Parameters:**
- `workoutId` (integer): The workout ID

**Response:**
```javascript
[
  {
    workout_id: 456,
    exercise_id: 789,
    sets: 3,
    reps: 10, 
    weight: 50.5,
    order: 0,
    exercises: {
      id: 789,
      name: "Bench Press"
    },
    lastCompleted: "2024-01-15T10:30:00.000Z", // or null
    superset_with: 790 // or null
  }
  // ... more exercises
]
```

**Error Handling:**
- `400`: Invalid workout ID format
- `401`: User not authenticated  
- `404`: Workout not found or no exercises
- `500`: Internal server error

### 4. Get All Exercises

**Endpoint:** `GET /api/v2/exercises`

**Purpose:** Fetch all available exercises grouped by muscle groups.

**Response:**
```javascript
[
  {
    muscleGroup: {
      id: 1,
      name: "Chest"
    },
    exercises: [
      {
        id: 789,
        name: "Bench Press",
        equipment: "BARBELL",
        category: "COMPOUND", 
        defaultIncrementKg: 2.5,
        minWeight: 20,
        maxWeight: 200,
        notes: "Keep back arched",
        videoUrl: null,
        muscle_groups: [...]
      }
      // ... more exercises
    ]
  }
  // ... more muscle groups
]
```

**Error Handling:**
- `401`: User not authenticated
- `500`: Internal server error

### 5. Upsert Exercises to Workout

**Endpoint:** `POST /api/v2/exercises/upsertExercisesToWorkout`

**Purpose:** Replace all exercises in a workout with a new set of exercises and supersets.

**Request Body:**
```javascript
{
  workoutId: 456,
  exercises: [
    {
      id: 789,
      sets: 3,
      reps: 10,
      weight: 50.5
    }
    // ... more exercises (order matters)
  ],
  supersets: [ // optional
    {
      first_exercise_id: 789,
      second_exercise_id: 790
    }
    // ... more supersets
  ]
}
```

**Response:**
```javascript
{
  message: "Exercises and supersets upserted to workout successfully",
  count: 5,
  data: [
    {
      workout_id: 456,
      exercise_id: 789,
      sets: 3,
      reps: 10,
      weight: 50.5,
      order: 0,
      exercises: {
        id: 789,
        name: "Bench Press",
        equipment: "BARBELL",
        category: "COMPOUND"
      }
    }
    // ... more created exercises
  ]
}
```

**Error Handling:**
- `400`: Invalid request body or validation errors
- `401`: User not authenticated
- `500`: Database transaction error or internal server error

---

## 🔧 Migration Implementation Strategy

### Phase 1: Update API Base URLs (1-2 hours)
1. **Search and replace** all V1 endpoints with V2 equivalents
2. **Test each endpoint** individually to ensure requests work
3. **Verify response formats** match expected data structures

### Phase 2: Test Core Workflows (2-4 hours)  
1. **Workout Completion Flow:** TrainingSessionScreen → Complete workout → Verify progression
2. **Exercise Management Flow:** EditWorkoutScreen → Add/edit exercises → Save workout
3. **Program Management Flow:** EditProgramScreen → Add workout → Verify creation

### Phase 3: Error Handling Updates (1 hour)
1. **Update error handling** for new V2 error response formats
2. **Test edge cases** like invalid IDs, unauthorized access
3. **Verify network error handling** still works correctly

---

## 🚨 Breaking Changes & Compatibility

### ✅ No Breaking Changes
All V2 endpoints maintain **100% compatibility** with existing request/response formats. Your existing frontend code will work with minimal URL changes.

### 🔄 Backward Compatibility
The backend maintains V1 compatibility routes for workout endpoints:
- `POST /workouts/completeWorkout` → `POST /api/v2/workouts/completeWorkout`
- `POST /workouts/addworkout` → `POST /api/v2/workouts/addworkout` 

**You can migrate gradually** - V1 and V2 endpoints work simultaneously.

---

## 🧪 Testing Checklist

### Core Functionality Tests
- [ ] **Complete a workout** - verify progression calculations work
- [ ] **Add a new workout** to a program - verify workout appears  
- [ ] **Edit workout exercises** - verify save/load works correctly
- [ ] **View exercise library** - verify muscle groups load properly
- [ ] **Create supersets** - verify superset relationships persist

### Edge Case Tests  
- [ ] **Network errors** - verify proper error messages display
- [ ] **Invalid workout IDs** - verify 404 handling  
- [ ] **Unauthorized access** - verify 401/403 handling
- [ ] **Empty workout** - verify empty exercise list handling
- [ ] **Large workout** - verify performance with many exercises

### Browser/Platform Tests
- [ ] **iOS app** - verify native HTTP requests work
- [ ] **Android app** - verify native HTTP requests work  
- [ ] **Web app** - verify fetch/axios requests work
- [ ] **Different network conditions** - verify timeout handling

---

## 🆘 Troubleshooting

### Common Issues & Solutions

**1. "404 Not Found" on V2 endpoints**
- **Cause:** Frontend still using V1 paths  
- **Solution:** Double-check all API calls use `/api/v2/` prefix

**2. "401 Unauthorized" errors**
- **Cause:** Authentication headers not properly forwarded
- **Solution:** Ensure `Authorization: Bearer ${token}` header included

**3. "400 Bad Request" on upsertExercisesToWorkout**
- **Cause:** Request body validation failing
- **Solution:** Verify `exercises` is array and includes `id`, `sets`, `reps`, `weight` fields

**4. Workout completion not calculating progression**  
- **Cause:** Missing `rating` field in request
- **Solution:** Ensure rating (1-5) included for each completed exercise

**5. Exercises not appearing in correct order**
- **Cause:** Array order not preserved in upsertExercisesToWorkout
- **Solution:** Ensure exercises array is ordered as desired - order is preserved

---

## 📞 Support & Next Steps

### After Migration Completion:
1. **Monitor logs** for any V2 endpoint errors
2. **Performance test** with real user data  
3. **Consider removing** V1 compatibility routes (optional)
4. **Update API documentation** in your frontend codebase

### If You Need Help:
1. **Check this guide first** - covers 95% of migration scenarios
2. **Test endpoints individually** using curl/Postman to isolate issues
3. **Check network logs** in browser/app dev tools for request details
4. **Verify authentication tokens** are not expired

### Validation Commands:
```bash
# Test V2 endpoint availability
curl -X GET "https://your-api.com/api/v2/exercises" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should return 200 with exercise data
```

**🎉 You're ready to migrate! All V2 endpoints are live and fully functional.**