# Myo Project Code Guidelines

## Architecture & Project Structure

### Backend (Express/Prisma)
**CRITICAL: Follow the layered architecture pattern strictly**

The backend uses a strict layered architecture with clear separation of concerns:

```
Request Flow:
Routes → Controllers → Services → Repositories → Database
                                              ↓
                                    Response back up
```

#### Layer Responsibilities

1. **Routes** (`/src/routes`) 
   - Define API endpoints only
   - Connect endpoints to controllers
   - Apply middleware (authentication, validation)
   - Example: `/src/routes/workoutsV2.ts`

2. **Controllers** (`/src/controllers`)
   - Handle HTTP requests and responses
   - Extract parameters from request
   - Call appropriate service methods
   - Format responses with consistent structure
   - Handle HTTP-level errors
   - Example: `/src/controllers/workoutController.ts`

3. **Services** (`/src/services`)
   - Implement business logic
   - Orchestrate repository calls
   - Handle business-level errors
   - Transform data between layers
   - Example: `/src/services/workoutService.ts`

4. **Repositories** (`/src/services/repositories`)
   - Handle ALL database operations
   - Use Prisma client
   - Return raw database results
   - Handle database-level errors
   - Example: `/src/services/repositories/workoutRepository.ts`

#### Creating New Backend Features

**Always follow this order:**

1. **Create Repository** - `/src/services/repositories/[feature]Repository.ts`
   ```typescript
   export class FeatureRepository {
     async findById(id: number) {
       return await prisma.feature.findUnique({ where: { id } });
     }
   }
   ```

2. **Create Service** - `/src/services/[feature]Service.ts`
   ```typescript
   import { featureRepository } from './repositories';
   
   export class FeatureService {
     async getFeature(id: number) {
       const feature = await featureRepository.findById(id);
       // Business logic here
       return transformedFeature;
     }
   }
   ```

3. **Create Controller** - `/src/controllers/[feature]Controller.ts`
   ```typescript
   import { featureService } from '../services';
   
   export const getFeature = async (req, res) => {
     try {
       const data = await featureService.getFeature(req.params.id);
       res.json({ data, message: 'Success' });
     } catch (error) {
       res.status(500).json({ message: error.message });
     }
   };
   ```

4. **Create Routes** - `/src/routes/[feature]V2.ts`
   ```typescript
   import { featureController } from '../controllers';
   
   router.get('/api/v2/features/:id', 
     authenticateToken,
     featureController.getFeature
   );
   ```

5. **Export from index files** and register in `src/index.ts`

### Mobile App (React Native)

#### File Organization
```
src/
├── screens/          # Screen components (PascalCase.jsx)
├── components/       # Reusable UI components
├── context/          # Global state (AuthProvider, ModalContext)
├── utils/
│   ├── api/         # API utility functions (CRITICAL)
│   ├── styles.jsx   # Central styles
│   └── [helpers]    # Other utilities
└── i18n/            # Translations
```

#### API Integration Pattern (StatsScreen.jsx Standard)

**CRITICAL: Keep components free of API calls**

✅ **CORRECT Pattern** (StatsScreen.jsx):
```jsx
// In /src/utils/api/statsApi.js
export const fetchPrograms = async () => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(`${apiUrl}/api/v2/programs`, {
    method: 'GET',
    headers,
  });
  return await handleApiResponse(response);
};

// In /src/screens/StatsScreen.jsx
import * as statsApi from '../utils/api/statsApi';

function StatsScreen() {
  const fetchData = async () => {
    const programs = await statsApi.fetchPrograms();
    setPrograms(programs);
  };
  
  // ... rest of component
}
```

❌ **INCORRECT Pattern**:
```jsx
// DON'T do this in components
function StatsScreen() {
  const fetchData = async () => {
    const response = await fetch(`${apiUrl}/api/v2/programs`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    // ...
  };
}
```

#### API Utility File Structure

Every feature should have its own API utility file:

**File**: `/src/utils/api/[feature]Api.js`

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const apiUrl = Constants.expoConfig.extra.apiUrl;
const FETCH_TIMEOUT = 10000;

// Helper: Fetch with timeout
const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw err;
  }
};

// Helper: Get auth headers
const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem('userToken');
  if (!token) throw new Error('No auth token');
  
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

// Helper: Handle API response
const handleApiResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}`);
  }
  
  const result = await response.json();
  return result.data !== undefined ? result.data : result;
};

// Export API functions
export const fetchItems = async () => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(`${apiUrl}/api/v2/items`, {
    method: 'GET',
    headers,
  });
  return await handleApiResponse(response);
};

export const createItem = async (itemData) => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(`${apiUrl}/api/v2/items`, {
    method: 'POST',
    headers,
    body: JSON.stringify(itemData),
  });
  return await handleApiResponse(response);
};
```

## TypeScript & Code Quality

### Typing Guidelines
- Use **strict TypeScript typing** - avoid `any` types
- Export interfaces/types from dedicated type files
- Use descriptive names in PascalCase (e.g., `ExerciseData`, `ProgressionResult`)
- Prefer explicit types over implicit inference for public APIs

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Variables/Functions | camelCase | `calculateProgression`, `userSettings` |
| Classes/Interfaces/Types | PascalCase | `UserService`, `WorkoutData` |
| Constants | UPPER_SNAKE_CASE | `MAX_REPS`, `DEFAULT_CONFIG` |
| Database fields | snake_case | `user_id`, `created_at` |
| Backend files | camelCase.ts | `userService.ts`, `authController.ts` |
| Mobile screens | PascalCase.jsx | `WorkoutScreen.jsx`, `StatsScreen.jsx` |
| Mobile components | PascalCase.jsx | `ExerciseCard.jsx`, `Button.jsx` |
| Mobile utilities | camelCase.js | `statsApi.js`, `helpers.js` |

## Error Handling & Validation

### Backend Error Handling

**Controllers**:
```typescript
export const getItem = async (req: Request, res: Response) => {
  try {
    const data = await itemService.getItem(req.params.id);
    res.json({ data, message: 'Success' });
  } catch (error) {
    logger.error('Failed to get item', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
```

**Services**:
```typescript
export class ItemService {
  async getItem(id: number) {
    const item = await itemRepository.findById(id);
    if (!item) {
      throw new Error('Item not found');
    }
    return item;
  }
}
```

### Request Validation

Always use `express-validator` for API endpoints:

```typescript
import { body, param, validationResult } from 'express-validator';

export const itemValidators = {
  createItem: [
    body('name').isString().notEmpty(),
    body('value').isNumeric(),
  ],
  
  getItem: [
    param('id').isInt(),
  ],
};

// In controller
export const createItem = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
  }
  // ... proceed with logic
};
```

### Mobile Error Handling

```javascript
// In component
const handleAction = async () => {
  try {
    const result = await featureApi.performAction();
    // Success handling
  } catch (error) {
    Alert.alert('Error', error.message);
    console.error('Action failed:', error);
  }
};
```

## API Design Patterns

### Response Structure

**Always return consistent JSON**:

```typescript
// Success
{ data: result, message: 'Success' }

// Error
{ message: 'Error description' }

// With metadata
{ data: result, message: 'Success', meta: { total: 100 } }
```

### Authentication

- Use `authenticateToken` middleware for protected routes
- Token available in `req.user` after authentication
- Always validate user ownership when accessing resources

## Database & Prisma

### Migration Workflow

**IMPORTANT**: Claude Code cannot run Prisma migrations from WSL environment.

When database changes are needed:
1. Claude modifies the Prisma schema
2. Claude documents required migration in the implementation guide
3. **User runs**: `npx prisma migrate dev --name descriptive_name` manually from Windows terminal
4. Claude continues with code implementation

### Repository Pattern

```typescript
export class ItemRepository {
  // Clear, descriptive method names
  async findById(id: number) {
    return await prisma.item.findUnique({
      where: { id },
      select: { id: true, name: true, value: true },
    });
  }
  
  async findByUserId(userId: number) {
    return await prisma.item.findMany({
      where: { userId },
    });
  }
  
  async create(data: CreateItemInput) {
    return await prisma.item.create({ data });
  }
}
```

## React Native Best Practices

### Component Structure

```jsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, mainStyles } from '../utils/styles';
import { t } from '../i18n';
import * as featureApi from '../utils/api/featureApi';

const MyComponent = ({ prop1, prop2 }) => {
  const navigation = useNavigation();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    setLoading(true);
    try {
      const result = await featureApi.fetchData();
      setData(result);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <View style={mainStyles.container}>
      <Text style={mainStyles.title}>{t('feature.title')}</Text>
      {/* Component JSX */}
    </View>
  );
};

export default MyComponent;
```

### State Management
- Use Context API for global state (`AuthProvider`, `ModalContext`, `SettingsContext`)
- Use React hooks for local component state (`useState`, `useEffect`, `useCallback`)
- Prefer functional components over class components

### Styling
- **Always use central styles** from `src/utils/styles.jsx`
- Avoid inline styles unless component-specific
- Use the predefined color, spacing, and typography constants

```javascript
import { colors, spacing, typography, mainStyles } from '../utils/styles';

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    padding: spacing.md,
  },
  title: {
    fontSize: typography.sizes.xl,
    color: colors.text.primary,
    fontWeight: typography.weights.bold,
  },
});
```

### Internationalization (i18n)

- Use `t('key')` function for all user-facing text
- **Never translate exercise names** - keep them in original language
- Add new keys to **both** `en.js` and `no.js`

```javascript
import { t } from '../i18n';

// In component
<Text>{t('workout.completed')}</Text>

// Adding new translations
// en.js
export default {
  workout: {
    completed: 'Workout Completed!',
    exercises: 'Exercises',
  },
};

// no.js
export default {
  workout: {
    completed: 'Økt fullført!',
    exercises: 'Øvelser',
  },
};
```

## Import Organization

Group imports in this order:

```javascript
// 1. React/React Native imports
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';

// 2. Third-party library imports
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';

// 3. Internal imports
import { userService } from '../services/userService';
import * as statsApi from '../utils/api/statsApi';
import { colors, spacing } from '../utils/styles';
import { t } from '../i18n';
```

## Performance & Optimization

### Database Queries
- Use appropriate Prisma methods (`findUnique`, `findMany`, etc.)
- Include only necessary fields with `select`
- Use proper indexing for frequently queried fields
- Avoid N+1 queries with `include` relationships

### Mobile Performance
- Use central styles from `src/utils/styles.jsx`
- Implement list virtualization for large datasets (`FlatList`)
- Optimize image loading with proper sizing
- Memoize expensive computations with `useMemo`
- Prevent unnecessary re-renders with `useCallback`

## Testing & Documentation

### Code Documentation

Use JSDoc comments for exported functions:

```typescript
/**
 * Calculate progression for an exercise based on user rating
 * @param {number} exerciseId - The exercise ID
 * @param {number} rating - User rating (1-5)
 * @param {Object} currentParams - Current sets/reps/weight
 * @returns {Promise<Object>} Updated exercise parameters
 */
export const calculateProgression = async (
  exerciseId: number,
  rating: number,
  currentParams: ExerciseParams
): Promise<ExerciseParams> => {
  // Implementation
};
```

### Function Design
- Write pure functions when possible
- Functions should handle their own error cases
- Keep functions focused on a single responsibility
- Use descriptive parameter names

## Development Workflow

### Backend Commands
```bash
npm run build          # Build TypeScript
npm run dev           # Development server with hot reload
npm run start         # Production server
npm run migrate:deploy # Deploy migrations (production)
npm run seed          # Seed database
```

### Mobile Commands
```bash
npm start            # Start Expo development server
npm run android      # Run on Android device/emulator
npm run ios          # Run on iOS simulator
npm run web          # Run in web browser
```

### Prisma Commands
```bash
# User runs these manually from Windows terminal
npx prisma migrate dev --name migration_name  # Create new migration
npx prisma migrate deploy                      # Deploy migrations
npx prisma generate                           # Generate Prisma client
npx prisma studio                             # Open database GUI
```

## Code Style

### General
- Use **2-space indentation**
- Include trailing commas in multi-line objects/arrays
- Use single quotes for strings
- Add semicolons at end of statements

### Comments
- Use `// biome-ignore` with explanations when needed
- Write clear, concise comments explaining "why" not "what"
- Document complex logic with inline comments

### File Organization
```typescript
// 1. Imports
import { ... } from '...';

// 2. Type definitions
interface UserData { ... }

// 3. Constants
const MAX_RETRIES = 3;

// 4. Helper functions
const formatDate = (date) => { ... };

// 5. Main exports
export class UserService { ... }
export const userService = new UserService();
```

## Critical Reminders

### Backend
- ✅ **Always follow layered architecture**: Routes → Controllers → Services → Repositories
- ✅ Use TypeScript with strict typing
- ✅ Validate all inputs with express-validator
- ✅ Return consistent response format
- ✅ Use middleware for authentication
- ✅ Log errors properly with Winston

### Mobile
- ✅ **Keep API calls in utility files** (like StatsScreen.jsx)
- ✅ Components should be focused on UI/UX only
- ✅ Use central styles from `utils/styles.jsx`
- ✅ Translate all user-facing text (except exercise names)
- ✅ Handle errors with user-friendly messages
- ✅ Use Context for global state

### Database
- ✅ User runs migrations manually - Claude cannot execute them
- ✅ Follow Prisma best practices
- ✅ Use repositories for all database operations
- ✅ Keep database logic out of controllers

## Common Pitfalls to Avoid

### Backend
- ❌ Don't put database calls in controllers
- ❌ Don't put business logic in repositories
- ❌ Don't skip input validation
- ❌ Don't use `any` type in TypeScript
- ❌ Don't forget error handling

### Mobile
- ❌ Don't make API calls directly in components
- ❌ Don't forget to handle loading states
- ❌ Don't skip error handling
- ❌ Don't hardcode user-facing text
- ❌ Don't create custom styles when central styles exist

### General
- ❌ Don't mix naming conventions
- ❌ Don't skip documentation for complex logic
- ❌ Don't commit without testing
- ❌ Don't ignore TypeScript errors

---

## Quick Reference: Creating a New Feature

### Backend Feature
1. ✅ Update Prisma schema if needed
2. ✅ User runs migration manually
3. ✅ Create repository in `/src/services/repositories/`
4. ✅ Create service in `/src/services/`
5. ✅ Create controller in `/src/controllers/`
6. ✅ Create routes in `/src/routes/`
7. ✅ Export from index files
8. ✅ Register routes in `src/index.ts`

### Mobile Feature
1. ✅ Create API utility file in `/src/utils/api/`
2. ✅ Create screen component in `/src/screens/`
3. ✅ Create reusable components in `/src/components/`
4. ✅ Add translations to `en.js` and `no.js`
5. ✅ Add navigation route if needed
6. ✅ Use central styles from `utils/styles.jsx`

---

**Remember**: The goal is maintainable, scalable, and consistent code. When in doubt, follow existing patterns in similar files (especially StatsScreen.jsx for mobile components).