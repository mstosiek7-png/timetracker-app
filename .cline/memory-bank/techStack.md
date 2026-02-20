# Technology Stack - TimeTracker Mobile

## Core Technologies

### Frontend Framework
- **React Native**: 0.76.1 (Latest stable)
- **Expo**: 52.0.0 (Managed workflow)
- **TypeScript**: 5.7.3 (Strict mode enabled)

### State Management
- **Zustand**: Lightweight state management
- **React Query (TanStack Query)**: Server state management
- **React Context**: For theme and global UI state

### Backend & Database
- **Supabase**: Full backend platform
  - PostgreSQL Database
  - Authentication & Authorization
  - Storage (for documents)
  - Realtime subscriptions
  - Edge Functions
- **PostgreSQL**: 15+ with Row Level Security

### UI & Styling
- **React Native Paper**: Material Design components
- **Styled Components**: CSS-in-JS styling
- **React Navigation**: 7.0.0 (Stack, Tab, Drawer)
- **Expo Vector Icons**: Icon library

### Development Tools
- **ESLint**: Code linting with Airbnb config
- **Prettier**: Code formatting
- **Husky**: Git hooks
- **Commitizen**: Conventional commits

### Testing
- **Jest**: Unit testing framework
- **React Native Testing Library**: Component testing
- **Detox**: E2E testing
- **MSW (Mock Service Worker)**: API mocking

### Build & Deployment
- **EAS (Expo Application Services)**: Build and deployment
- **GitHub Actions**: CI/CD pipeline
- **Fastlane**: Automated deployment

## Development Environment

### Required Tools
- Node.js: 20.x LTS
- npm: 10.x or pnpm: 9.x
- Watchman: For file watching
- Android Studio: Android development
- Xcode: iOS development (macOS only)

### VS Code Extensions
- React Native Tools
- Expo Tools
- TypeScript and JavaScript
- ESLint
- Prettier
- GitLens

## Architecture Patterns

### Directory Structure
```
├── app/                    # Expo Router screens
├── components/            # Reusable UI components
│   ├── employee/
│   ├── time/
│   ├── shared/
│   └── ui/
├── services/             # Business logic and API calls
├── stores/              # Zustand stores
├── hooks/               # Custom React hooks
├── types/               # TypeScript definitions
├── utils/               # Utility functions
├── supabase/            # Supabase configuration
│   ├── migrations/
│   └── functions/
└── .cline/memory-bank/  # Project knowledge base
```

### Service Layer Pattern
All database operations go through service modules:
```typescript
// services/employeeService.ts
export const employeeService = {
  async getAll(): Promise<Employee[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('active', true);
    if (error) throw error;
    return data;
  },
};
```

### React Query Pattern
```typescript
// hooks/useEmployees.ts
export const useEmployees = () => {
  return useQuery({
    queryKey: ['employees'],
    queryFn: employeeService.getAll,
  });
};
```

## Database Schema

### Core Tables
```sql
-- employees
id, name, email, position, active, created_at

-- time_entries  
id, employee_id, project_id, clock_in, clock_out, hours, status

-- documents
id, employee_id, file_path, file_type, ocr_text, ocr_data, created_at

-- change_history
id, table_name, record_id, old_data, new_data, changed_by, changed_at

-- sync_queue
id, table_name, operation, data, status, created_at, synced_at
```

### Database Features
- **Row Level Security**: All tables have RLS enabled
- **Audit Triggers**: Automatic change history logging
- **Soft Deletes**: `deleted_at` column pattern
- **UUID Primary Keys**: Instead of serial integers

## API Integration

### Supabase Client Configuration
```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);
```

### Environment Variables
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=for-server-operations
```

## Performance Optimizations

### Image Handling
- **Expo Image**: Optimized image loading
- **Caching**: React Query cache for API responses
- **Lazy Loading**: Code splitting with dynamic imports

### State Management
- **Selectors**: Fine-grained Zustand state selection
- **Memoization**: React.memo and useMemo for expensive operations
- **Pagination**: Infinite scroll for large datasets

## Security Measures

### Authentication
- JWT-based authentication via Supabase Auth
- Session management with refresh tokens
- Biometric authentication (Touch ID/Face ID)

### Data Protection
- HTTPS for all API calls
- Encrypted local storage for sensitive data
- Input validation and sanitization

### Compliance
- GDPR compliance for user data
- Audit logging for all data changes
- Regular security audits

## Monitoring & Analytics

### Error Tracking
- **Sentry**: Error monitoring and reporting
- **Custom Logging**: Structured logging system

### Analytics
- **PostHog**: User behavior analytics
- **Custom Metrics**: Business KPIs tracking

## Development Workflow

### Branch Strategy
- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: New features
- `bugfix/*`: Bug fixes
- `release/*`: Release preparation

### Commit Convention
```
feat: add new feature
fix: bug fix
docs: documentation
style: formatting
refactor: code restructuring
test: adding tests
chore: maintenance
```

### Code Review Process
1. Self-review before creating PR
2. Automated checks (linting, tests)
3. Peer review with at least one reviewer
4. QA testing on physical devices

## Deployment Strategy

### Staging Environment
- Automatic deployment from `develop` branch
- TestFlight for iOS beta testing
- Google Play Internal Testing for Android

### Production Deployment
- Manual approval required
- Rollback plan in place
- Feature flags for gradual rollout

## Maintenance & Updates

### Dependency Updates
- Weekly dependency checks
- Security patch immediate application
- Major version upgrades in dedicated sprints

### Documentation
- Code documentation with JSDoc
- API documentation with OpenAPI
- User documentation in-app

## Known Technical Debt
1. Legacy code migration needed for older components
2. Test coverage needs improvement (currently 70%)
3. Some TypeScript any types need stricter typing
4. Bundle size optimization needed