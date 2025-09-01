# V2 Migration Plan - Layered Architecture

## Overview
Migrate existing routes to V2 pattern following the exercisesV2.ts model:
- **Controller Layer**: HTTP request/response handling + validation
- **Service Layer**: Business logic
- **Repository Layer**: Database operations
- **Validation**: Express-validator middleware

## Migration Priority Queue

### 🔴 Phase 1 - Critical (Complex Business Logic)

#### 1. workouts.ts → workoutsV2.ts (986 lines)
**Complexity**: Very High - Complex workout management, progression calculations
**Issues**: 
- Massive route handlers with embedded business logic
- No input validation
- Direct database transactions in routes

**Migration Tasks**:
- Create `WorkoutController` with validation middleware
- Extract `WorkoutService` for business logic
- Create `WorkoutRepository` for database operations
- Add proper error handling and logging

#### 2. programs.ts → programsV2.ts (807 lines)  
**Complexity**: Very High - Program lifecycle management, status transitions
**Issues**:
- Complex state transition logic in routes
- Authorization mixed with business logic
- No standardized validation

**Migration Tasks**:
- Create `ProgramController` with role-based validation
- Extract `ProgramService` for state management
- Create `ProgramRepository` with transaction handling
- Implement proper status transition validation

#### 3. stats.ts → statsV2.ts (782 lines)
**Complexity**: High - Data aggregation and analytics
**Issues**:
- Heavy computation in route handlers
- Multiple database queries without optimization
- No caching layer

**Migration Tasks**:
- Create `StatsController` with query parameter validation
- Extract `StatsService` for data aggregation
- Create `StatsRepository` with optimized queries
- Consider adding caching layer

### 🟡 Phase 2 - Important (Moderate Complexity)

#### 4. template.ts → templateV2.ts (286 lines)
**Issues**: Template management with business rules mixed in routes

#### 5. userSettings.ts → userSettingsV2.ts (241 lines)  
**Issues**: User preference management, type validation needs improvement

#### 6. progression.ts → progressionV2.ts (282 lines)
**Issues**: Fitness progression calculations in route handlers

#### 7. users.ts → usersV2.ts (166 lines)
**Issues**: User management operations, needs proper validation

### 🟢 Phase 3 - Nice to Have (Simple Operations)

#### 8. muscleGroups.ts → muscleGroupsV2.ts (26 lines)
**Priority**: Low - Simple CRUD, but good for V2 pattern consistency

#### 9. password.ts → passwordV2.ts (159 lines)
**Priority**: Low - Mostly standalone operations, but security-sensitive

#### 10. auth.ts → authV2.ts (281 lines)
**Priority**: Special - Security-sensitive, migrate carefully

## V2 Implementation Template

### Directory Structure for Each Route
```
src/
  controllers/
    [routeName]Controller.ts     # HTTP layer + validation
  services/
    [routeName]Service.ts        # Business logic
  repositories/
    [routeName]Repository.ts     # Database operations
  routes/
    [routeName]V2.ts            # Route definitions only
```

### Standard V2 Controller Pattern
```typescript
// Controller responsibilities:
// - Request/response handling
// - Input validation (express-validator)
// - Authentication/authorization checks
// - Error response formatting
// - Call service layer

export const [routeName]Controller = {
  getAll: async (req: Request, res: Response) => {
    // Standard validation, service call, response pattern
  }
  // ... other CRUD operations
};

export const [routeName]Validators = {
  create: [/* express-validator rules */],
  update: [/* express-validator rules */]
};
```

### Standard V2 Service Pattern
```typescript
// Service responsibilities:
// - Business logic
// - Data transformation
// - Calling repositories
// - Cross-cutting concerns (logging, etc.)

export const [routeName]Service = {
  getAll: async () => {
    // Business logic + repository calls
  }
  // ... other business operations
};
```

### Standard V2 Repository Pattern
```typescript
// Repository responsibilities:
// - Database operations only
// - Query optimization
// - Transaction management
// - Data mapping

export const [routeName]Repository = {
  findAll: async () => prisma.[table].findMany(/* optimized query */),
  // ... other database operations
};
```

## Benefits Expected from V2 Migration

1. **Separation of Concerns**: Clear layer responsibilities
2. **Testability**: Easy to unit test each layer independently  
3. **Maintainability**: Easier to modify business logic without touching HTTP code
4. **Consistency**: Standardized error handling and validation
5. **Performance**: Optimized database queries in repository layer
6. **Security**: Centralized validation and authorization

## Migration Strategy Per Route

1. **Create Repository Layer First** - Extract all database operations
2. **Create Service Layer** - Move business logic from routes  
3. **Create Controller Layer** - Add validation and error handling
4. **Create V2 Route** - Wire everything together
5. **Update index.ts** - Replace old route with V2
6. **Remove Old Route** - After testing V2 works correctly

## Testing Strategy
- Unit tests for each service function
- Integration tests for repository layer
- API tests for controller layer
- Migration testing: ensure V2 API matches V1 behavior

## Timeline Estimate
- **Phase 1**: 2-3 weeks (3 complex routes)
- **Phase 2**: 2 weeks (4 moderate routes) 
- **Phase 3**: 1 week (3 simple routes)
- **Total**: ~6 weeks for full migration