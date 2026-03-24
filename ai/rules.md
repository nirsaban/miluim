# Development Rules & Best Practices

## Code Organization

### Backend (NestJS)
1. Each module has: controller, service, module file, DTOs
2. Business logic in services, not controllers
3. Use `@UseGuards(JwtAuthGuard)` for protected routes
4. Use `@Roles()` decorator for role requirements
5. Validate input with class-validator DTOs

### Frontend (Next.js)
1. App Router with server/client components
2. 'use client' directive for interactive components
3. API calls through `lib/api.ts` instance
4. React Query for server state
5. Zustand for client state

## Role-Based Access Patterns

### Backend Verification
```typescript
// For department-scoped access
if (userRole === 'ADMIN' || hasAdminMilitaryRole) {
  // Full access
} else if (userRole === 'OFFICER') {
  // Check department ownership
  if (soldier.departmentId !== officer.departmentId) {
    throw new ForbiddenException();
  }
}
```

### Frontend Navigation
```typescript
// Dynamic nav based on role
if (user.role === 'OFFICER') {
  // Show department link
} else if (user.role === 'ADMIN' || user.role === 'LOGISTICS') {
  // Show admin link
}
```

## Database Guidelines

1. Use UUID for all IDs
2. Include `createdAt` and `updatedAt` timestamps
3. Use enums for status fields
4. Soft delete with `isActive` flag when needed
5. Department scoping via `departmentId` field

## Push Notifications

### When to Send
- Leave request created → notify department officers + admins
- Leave request approved/rejected → notify soldier
- Urgent messages → notify by target audience
- Shift assignments published → notify assigned soldiers

### Implementation
```typescript
// Always try-catch push notifications
try {
  await this.pushService.sendToUser(userId, { title, body });
} catch (error) {
  console.error('Push failed:', error);
  // Don't throw - notification failure shouldn't break flow
}
```

## UI Guidelines

### Hebrew RTL
- All text in Hebrew
- Use `dir="rtl"` on root elements
- TailwindCSS RTL utilities where needed
- Icons on right side of text

### Military Theme Colors
```
military-50:  #f0fdf4
military-100: #dcfce7
military-500: #22c55e
military-600: #16a34a
military-700: #15803d
military-800: #166534
military-900: #14532d
```

### Component Patterns
- Cards with shadows: `shadow-card`
- Rounded corners: `rounded-xl` or `rounded-2xl`
- Consistent spacing: `p-4`, `gap-4`
- Mobile-first responsive design

## Error Handling

### Backend
```typescript
// Use NestJS exceptions
throw new NotFoundException('Resource not found');
throw new ForbiddenException('Access denied');
throw new BadRequestException('Invalid input');
```

### Frontend
```typescript
// React Query error handling
const { data, error, isLoading } = useQuery(...);
if (error) {
  return <ErrorMessage error={error} />;
}
```

## Testing Guidelines

### Test Setup Module (dev only)
- Reset database to known states
- Scenarios: basic, with-service-cycle, with-shifts
- Disabled in production via environment check

## Security Rules

1. Never expose passwordHash
2. Validate all user input
3. Check department ownership for OFFICER actions
4. Use prepared statements (Prisma handles this)
5. Sanitize file uploads
6. Rate limit sensitive endpoints
