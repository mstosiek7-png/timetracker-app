# Code Conventions & Best Practices

## TypeScript Standards

### Strict Mode
Always use TypeScript strict mode:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

### Naming Conventions
- **Interfaces**: PascalCase, no `I` prefix (e.g., `EmployeeData`)
- **Types**: PascalCase (e.g., `ApiResponse<T>`)
- **Enums**: PascalCase (e.g., `TimeEntryStatus`)
- **Variables**: camelCase (e.g., `employeeName`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)
- **Files**: kebab-case (e.g., `employee-service.ts`)

### Type Definitions
```typescript
// Good
interface Employee {
  id: string;
  name: string;
  email: string;
  position: Position;
  active: boolean;
  createdAt: Date;
}

// Avoid
type Employee = {
  id: string;
  name: string;
}
```

## React Native Conventions

### Component Structure
```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Employee } from '../../types';

interface EmployeeCardProps {
  employee: Employee;
  onPress?: () => void;
}

export const EmployeeCard: React.FC<EmployeeCardProps> = ({
  employee,
  onPress,
}) => {
  return (
    <View style={styles.container} onPress={onPress}>
      <Text style={styles.name}>{employee.name}</Text>
      <Text style={styles.position}>{employee.position}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  position: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
});
```

### Hooks Usage
- **Custom hooks**: Prefix with `use` (e.g., `useEmployees`)
- **Dependency arrays**: Always specify dependencies
- **Cleanup**: Return cleanup function if needed
- **Memoization**: Use `useMemo`, `useCallback` appropriately

```typescript
// Good hook example
export const useEmployeeData = (employeeId: string) => {
  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => employeeService.getById(employeeId),
  });

  const { mutate: updateEmployee } = useMutation({
    mutationFn: employeeService.update,
  });

  return { employee, isLoading, updateEmployee };
};
```

## State Management Patterns

### Zustand Store Structure
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: async (email, password) => {
        // Login logic
      },
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },
      setUser: (user) => {
        set({ user });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
```

### React Query Configuration
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

## File Organization

### Component Files
```
components/
├── employee/
│   ├── EmployeeCard.tsx
│   ├── EmployeeList.tsx
│   ├── EmployeeForm.tsx
│   └── index.ts
├── time/
│   ├── TimeEntryCard.tsx
│   ├── TimeEntryForm.tsx
│   └── index.ts
└── shared/
    ├── Button.tsx
    ├── Input.tsx
    └── index.ts
```

### Service Files
```
services/
├── employeeService.ts
├── timeEntryService.ts
├── documentService.ts
├── authService.ts
└── index.ts
```

### Export Pattern
```typescript
// index.ts
export { EmployeeCard } from './EmployeeCard';
export { EmployeeList } from './EmployeeList';
export { EmployeeForm } from './EmployeeForm';
export type { EmployeeCardProps } from './EmployeeCard';
```

## Error Handling

### Try-Catch Pattern
```typescript
try {
  const data = await employeeService.getAll();
  return data;
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API Error:', error.message);
    throw new Error('Failed to fetch employees');
  }
  throw error;
}
```

### Error Boundaries
```typescript
import React, { ErrorInfo } from 'react';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

## Testing Standards

### Unit Tests
```typescript
import { render, screen, fireEvent } from '@testing-library/react-native';
import { EmployeeCard } from './EmployeeCard';

describe('EmployeeCard', () => {
  const mockEmployee = {
    id: '1',
    name: 'John Doe',
    position: 'Developer',
    active: true,
  };

  it('renders employee name and position', () => {
    render(<EmployeeCard employee={mockEmployee} />);
    
    expect(screen.getByText('John Doe')).toBeTruthy();
    expect(screen.getByText('Developer')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<EmployeeCard employee={mockEmployee} onPress={onPress} />);
    
    fireEvent.press(screen.getByText('John Doe'));
    expect(onPress).toHaveBeenCalled();
  });
});
```

### Integration Tests
```typescript
describe('EmployeeService', () => {
  it('fetches all employees', async () => {
    const employees = await employeeService.getAll();
    expect(employees).toBeInstanceOf(Array);
    expect(employees[0]).toHaveProperty('id');
    expect(employees[0]).toHaveProperty('name');
  });
});
```

## Code Quality

### ESLint Rules
```json
{
  "extends": [
    "@react-native",
    "airbnb",
    "airbnb-typescript",
    "prettier"
  ],
  "rules": {
    "react/react-in-jsx-scope": "off",
    "import/prefer-default-export": "off",
    "@typescript-eslint/explicit-function-return-type": "off",
    "react/require-default-props": "off",
    "@typescript-eslint/no-unused-vars": "error",
    "no-console": ["error", { "allow": ["warn", "error"] }]
  }
}
```

### Prettier Configuration
```json
{
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "jsxBracketSameLine": false,
  "arrowParens": "always"
}
```

## Git & Commit Standards

### Commit Message Format
```
type(scope): description

[optional body]

[optional footer]
```

### Commit Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting, missing semi colons, etc.
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance tasks

### Branch Naming
- `feature/employee-management`
- `bugfix/login-validation`
- `hotfix/critical-bug`
- `release/v1.2.0`

## Performance Guidelines

### Memoization
- Use `React.memo` for expensive components
- Use `useMemo` for expensive calculations
- Use `useCallback` for function props

```typescript
// Good
const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);
const memoizedCallback = useCallback(() => doSomething(a, b), [a, b]);

const MemoizedComponent = React.memo(ExpensiveComponent);
```

### Image Optimization
```typescript
import { Image } from 'expo-image';

<Image
  source={{ uri: 'https://example.com/image.jpg' }}
  style={{ width: 100, height: 100 }}
  cachePolicy="memory-disk"
  placeholder={require('./placeholder.png')}
/>
```

## Security Practices

### Input Validation
```typescript
import { z } from 'zod';

const employeeSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  position: z.enum(['worker', 'supervisor', 'manager']),
});

const validateEmployee = (data: unknown) => {
  return employeeSchema.parse(data);
};
```

### Secure Storage
```typescript
import * as SecureStore from 'expo-secure-store';

const storeToken = async (token: string) => {
  await SecureStore.setItemAsync('auth_token', token);
};

const getToken = async () => {
  return await SecureStore.getItemAsync('auth_token');
};
```

## Documentation Standards

### JSDoc Comments
```typescript
/**
 * Fetches all active employees from the database
 * @param options - Optional query parameters
 * @returns Promise resolving to array of employees
 * @throws {ApiError} If the API request fails
 */
async function getAllEmployees(options?: QueryOptions): Promise<Employee[]> {
  // implementation
}
```

### Component Documentation
```typescript
/**
 * Displays an employee card with basic information
 * 
 * @example
 * ```tsx
 * <EmployeeCard 
 *   employee={employee}
 *   onPress={() => navigation.navigate('EmployeeDetails', { id: employee.id })}
 * />
 * ```
 */
export const EmployeeCard: React.FC<EmployeeCardProps> = ({ /* ... */ }) => {
  // implementation
};
```

## Accessibility Guidelines

### Screen Reader Support
```typescript
<Text accessible={true} accessibilityLabel="Employee name">
  {employee.name}
</Text>

<Button
  accessible={true}
  accessibilityLabel="Edit employee"
  accessibilityHint="Navigates to edit employee screen"
  onPress={handleEdit}
>
  <Text>Edit</Text>
</Button>
```

### Color Contrast
- Minimum contrast ratio: 4.5:1 for normal text
- Minimum contrast ratio: 3:1 for large text
- Use accessibility-focused color palettes

## Development Workflow

### Before Committing
1. Run TypeScript compiler: `npx tsc --noEmit`
2. Run ESLint: `npm run lint`
3. Run tests: `npm test`
4. Check for console logs (remove debug logs)
5. Update documentation if needed

### Code Review Checklist
- [ ] TypeScript types are correct
- [ ] Tests are included and passing
- [ ] No console.log statements in production code
- [ ] Error handling is implemented
- [ ] Accessibility considerations
- [ ] Performance implications considered
- [ ] Documentation updated
- [ ] Follows established patterns