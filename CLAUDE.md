# Myo Express Prisma Project Guide

## Build & Run Commands
- `npm run build` - Build TypeScript files
- `npm run dev` - Run development server with ts-node
- `npm run start` - Run production server
- `npm run migrate:deploy` - Deploy Prisma migrations
- `npm run seed` - Seed database
- `prisma migrate dev --name <migration_name>` - Create a new migration

## Code Style Guidelines
- **Typing**: Use strict TypeScript typing; avoid `any` types
- **Error Handling**: Use try/catch blocks with proper error logging
- **Imports**: Group imports by external packages, then internal modules
- **Naming**: 
  - Use camelCase for variables, functions, and methods
  - Use PascalCase for classes, interfaces, and types
  - Use snake_case for database fields (matching Prisma schema)
- **API Responses**: Return consistent JSON structures with data/message fields
- **Authentication**: Always use authenticateToken middleware for protected routes
- **Validation**: Use express-validator for request validation
- **Comments**: Use biome-ignore with explanations when needed

## Project Structure
- `/src/routes` - Express route definitions
- `/src/controllers` - Route handlers (HTTP request/response logic)
- `/src/services` - Business logic
- `/src/services/repositories` - Database operations
- `/src/middleware` - Express middleware
- `/src/utils` - Utility functions and helpers
- `/prisma` - Database schema and migrations
- `/types` - TypeScript type definitions

## Layered Architecture
The project is transitioning to a layered architecture:
1. **Routes** - Define API endpoints and connect them to controllers
2. **Controllers** - Handle HTTP requests/responses and call services
3. **Services** - Implement business logic
4. **Repositories** - Handle database operations

### New Module Creation Guide
To create a new module following the layered architecture:

1. Create a repository in `/src/services/repositories/[moduleName]Repository.ts`
2. Create a service in `/src/services/[moduleName]Service.ts`
3. Create a controller in `/src/controllers/[moduleName]Controller.ts`
4. Create routes in `/src/routes/[moduleName]V2.ts`
5. Add exports to the appropriate index.ts files
6. Register routes in src/index.ts