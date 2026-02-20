---
name: timetracker-rn-dev
description: Development skill for TimeTracker React Native mobile app. Use when building features, components, or services for the time tracking application with Expo, Supabase, and TypeScript.
---

# TimeTracker React Native Development Skill

This skill helps build the TimeTracker mobile application efficiently using React Native, Expo, Supabase, and TypeScript.

## When to Use This Skill

Use this skill when:
- Creating new screens or components for TimeTracker
- Building database operations with Supabase
- Implementing time tracking features
- Adding OCR/camera functionality
- Creating export features (Excel/PDF)
- Setting up offline sync
- Debugging React Native issues specific to TimeTracker

## Project Context

**App Purpose**: Mobile time tracking for construction workers with document OCR scanning.

**Tech Stack**:
- React Native + Expo (cross-platform)
- Supabase (Backend + Database)
- TypeScript (strict mode)
- Zustand (state management)
- React Query (server state)
- Expo Camera (OCR)

**Key Features**:
1. Employee management (CRUD)
2. Time entry logging (individual + bulk)
3. Monthly calendar view
4. Status types: work, sick, vacation, fza
5. Change history (audit log)
6. Export to Excel/PDF
7. OCR document scanning
8. Offline-first with sync

## Development Patterns

### 1. File Structure Convention

```
app/              → Expo Router screens
components/       → Reusable UI components
services/         → API and business logic
stores/           → Zustand state stores
hooks/            → Custom React hooks
utils/            → Helper functions
types/            → TypeScript definitions
```

### 2. Component Creation Pattern

Always create components with this structure:

```typescript
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface ComponentNameProps {
  // Props with TypeScript types
  title: string;
  onPress?: () => void;
  optional?: boolean;
}

export const ComponentName: React.FC<ComponentNameProps> = ({ 
  title, 
  onPress,
  optional = false 
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {optional && <TouchableOpacity onPress={onPress}>...</TouchableOpacity>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
```

### 3. Service Layer Pattern

All database operations go through services:

```typescript
// services/employees.ts
import { supabase } from './supabase';
import { Employee } from '@/types/models';

export const employeeService = {
  async getAll(): Promise<Employee[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('active', true)
      .order('name');
    
    if (error) throw error;
    return data;
  },

  async create(employee: Omit<Employee, 'id'>): Promise<Employee> {
    const { data, error } = await supabase
      .from('employees')
      .insert(employee)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Employee>): Promise<Employee> {
    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};
```

### 4. React Query Hook Pattern

Wrap services in React Query hooks:

```typescript
// hooks/useEmployees.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeService } from '@/services/employees';
import { Employee } from '@/types/models';

export const useEmployees = () => {
  return useQuery({
    queryKey: ['employees'],
    queryFn: employeeService.getAll,
  });
};

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: employeeService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Employee> }) =>
      employeeService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
};
```

### 5. Zustand Store Pattern

For local/UI state:

```typescript
// stores/uiStore.ts
import { create } from 'zustand';

interface UIState {
  selectedDate: Date;
  showModal: boolean;
  modalType: 'add' | 'edit' | null;
  setSelectedDate: (date: Date) => void;
  openModal: (type: 'add' | 'edit') => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedDate: new Date(),
  showModal: false,
  modalType: null,
  setSelectedDate: (date) => set({ selectedDate: date }),
  openModal: (type) => set({ showModal: true, modalType: type }),
  closeModal: () => set({ showModal: false, modalType: null }),
}));
```

### 6. Screen Pattern (Expo Router)

```typescript
// app/(tabs)/index.tsx
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useEmployees } from '@/hooks/useEmployees';
import { EmployeeCard } from '@/components/employee/EmployeeCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function DashboardScreen() {
  const { data: employees, isLoading } = useEmployees();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {employees?.map((emp) => (
          <EmployeeCard key={emp.id} employee={emp} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
});
```

## Database Operations

### Supabase Client Setup

```typescript
// services/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

### Common Queries

```typescript
// Get employee with time entries for a month
const { data } = await supabase
  .from('employees')
  .select(`
    *,
    time_entries!inner (
      *
    )
  `)
  .eq('id', employeeId)
  .gte('time_entries.date', startDate)
  .lte('time_entries.date', endDate);

// Bulk insert time entries
const { data } = await supabase
  .rpc('bulk_add_hours', {
    p_employee_ids: employeeIds,
    p_date: date,
    p_hours: hours,
    p_status: status,
  });

// Get change history
const { data } = await supabase
  .from('change_history')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(50);
```

## OCR Integration

### Camera Setup

```typescript
// components/scanner/DocumentScanner.tsx
import { Camera, CameraView } from 'expo-camera';
import { useState } from 'react';

export const DocumentScanner = () => {
  const [permission, requestPermission] = Camera.useCameraPermissions();

  const takePicture = async (camera: CameraView) => {
    const photo = await camera.takePictureAsync();
    // Process with OCR
    await processOCR(photo.uri);
  };

  // ... render camera UI
};
```

### OCR Processing

```typescript
// services/ocr.ts
import Tesseract from 'tesseract.js';

export const ocrService = {
  async processImage(imageUri: string): Promise<string> {
    const { data: { text } } = await Tesseract.recognize(
      imageUri,
      'pol', // Polish language
      {
        logger: (m) => console.log(m),
      }
    );
    
    return text;
  },

  async extractDeliveryData(text: string) {
    // Parse document structure
    // Extract: date, supplier, items, amounts
    // Return structured data
  },
};
```

## Export Features

### Excel Export

```typescript
// services/export.ts
import * as ExcelJS from 'exceljs';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export const exportService = {
  async exportToExcel(
    employees: Employee[],
    timeEntries: TimeEntry[],
    month: Date
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Czas pracy');

    // Headers
    worksheet.columns = [
      { header: 'Pracownik', key: 'employee', width: 30 },
      { header: 'Data', key: 'date', width: 15 },
      { header: 'Godziny', key: 'hours', width: 10 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    // Data
    timeEntries.forEach((entry) => {
      const employee = employees.find((e) => e.id === entry.employee_id);
      worksheet.addRow({
        employee: employee?.name,
        date: entry.date,
        hours: entry.hours,
        status: entry.status,
      });
    });

    // Save and share
    const buffer = await workbook.xlsx.writeBuffer();
    const fileUri = `${FileSystem.documentDirectory}timesheet.xlsx`;
    await FileSystem.writeAsStringAsync(
      fileUri,
      buffer.toString('base64'),
      { encoding: FileSystem.EncodingType.Base64 }
    );
    
    await Sharing.shareAsync(fileUri);
  },
};
```

## Offline Sync Strategy

### Sync Queue Implementation

```typescript
// services/sync.ts
import { supabase } from './supabase';
import NetInfo from '@react-native-community/netinfo';

export const syncService = {
  async queueOperation(
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    table: string,
    recordId: string,
    data: any
  ) {
    await supabase.from('sync_queue').insert({
      operation,
      table_name: table,
      record_id: recordId,
      data,
      status: 'pending',
    });
  },

  async processSyncQueue() {
    const isConnected = await NetInfo.fetch().then(
      (state) => state.isConnected
    );

    if (!isConnected) return;

    const { data: queue } = await supabase
      .from('sync_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at');

    for (const item of queue || []) {
      try {
        await this.executeOperation(item);
        await supabase
          .from('sync_queue')
          .update({ status: 'synced', synced_at: new Date() })
          .eq('id', item.id);
      } catch (error) {
        await supabase
          .from('sync_queue')
          .update({ 
            status: 'failed',
            error_message: error.message,
            retry_count: item.retry_count + 1,
          })
          .eq('id', item.id);
      }
    }
  },

  async executeOperation(item: any) {
    // Execute the queued operation
    // INSERT, UPDATE, or DELETE on the target table
  },
};
```

## Error Handling

### Global Error Boundary

```typescript
// components/ErrorBoundary.tsx
import React from 'react';
import { View, Text, Button } from 'react-native';

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log to error tracking service (e.g., Sentry)
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, marginBottom: 10 }}>
            Coś poszło nie tak
          </Text>
          <Text style={{ marginBottom: 20 }}>
            {this.state.error?.message}
          </Text>
          <Button
            title="Spróbuj ponownie"
            onPress={() => this.setState({ hasError: false, error: null })}
          />
        </View>
      );
    }

    return this.props.children;
  }
}
```

## Testing Patterns

### Component Testing

```typescript
// __tests__/EmployeeCard.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { EmployeeCard } from '@/components/employee/EmployeeCard';

describe('EmployeeCard', () => {
  it('renders employee name', () => {
    const employee = { id: '1', name: 'Jan Kowalski', position: 'Brukarz' };
    const { getByText } = render(<EmployeeCard employee={employee} />);
    expect(getByText('Jan Kowalski')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const employee = { id: '1', name: 'Jan Kowalski', position: 'Brukarz' };
    const { getByTestId } = render(
      <EmployeeCard employee={employee} onPress={onPress} />
    );
    
    fireEvent.press(getByTestId('employee-card'));
    expect(onPress).toHaveBeenCalledWith(employee);
  });
});
```

## Performance Optimization

### Memoization

```typescript
// Use React.memo for expensive components
export const EmployeeCard = React.memo<EmployeeCardProps>(({ employee }) => {
  // Component logic
}, (prevProps, nextProps) => {
  return prevProps.employee.id === nextProps.employee.id &&
         prevProps.employee.name === nextProps.employee.name;
});

// Use useMemo for expensive computations
const monthSummary = useMemo(() => {
  return calculateMonthSummary(timeEntries);
}, [timeEntries]);

// Use useCallback for callbacks
const handlePress = useCallback(() => {
  navigation.navigate('EmployeeDetail', { id: employee.id });
}, [employee.id, navigation]);
```

## Debugging Tips

1. **React Native Debugger**: Use for Redux/Zustand state inspection
2. **Flipper**: Network calls, database queries, layout inspector
3. **console.log with tags**: `console.log('[EmployeeService]', data)`
4. **Supabase Dashboard**: Monitor real-time database queries
5. **Expo Dev Tools**: Shake device to access dev menu

## Common Issues & Solutions

### Issue: "Network request failed" with Supabase
**Solution**: Check .env.local has correct SUPABASE_URL and key. Ensure phone is on same network for local dev.

### Issue: Camera not working on iOS
**Solution**: Add camera permissions to app.json:
```json
{
  "ios": {
    "infoPlist": {
      "NSCameraUsageDescription": "Potrzebujemy dostępu do kamery do skanowania dokumentów"
    }
  }
}
```

### Issue: "Module not found" errors
**Solution**: Clear Metro bundler cache:
```bash
npx expo start -c
```

### Issue: TypeScript errors after schema changes
**Solution**: Regenerate database types:
```bash
supabase gen types typescript --local > types/database.types.ts
```

## Quick Commands

```bash
# Start dev server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android

# Build for production
eas build --platform all

# Update Supabase types
supabase gen types typescript --project-ref YOUR_REF > types/database.types.ts

# Run tests
npm test

# Check TypeScript
npx tsc --noEmit
```

## Checklist dla nowych features

Przed commitem sprawdź:
- [ ] TypeScript errors: `npx tsc --noEmit`
- [ ] Tests pass: `npm test`
- [ ] Component has proper types
- [ ] Error handling implemented
- [ ] Loading states handled
- [ ] Offline mode considered
- [ ] Change history logged (if modifying data)
- [ ] Database indexes present (if new queries)
- [ ] Performance tested (for lists >100 items)

## Best Practices Summary

1. **Always use TypeScript** - No `any` types unless absolutely necessary
2. **Service layer for all data** - Never call Supabase directly from components
3. **React Query for server state** - Zustand only for UI/local state
4. **Offline-first** - Queue operations, sync when online
5. **Error boundaries** - Wrap critical sections
6. **Memoization** - For expensive renders and calculations
7. **Test critical paths** - Authentication, data sync, exports
8. **Consistent styling** - Use StyleSheet.create, no magic numbers
9. **Accessibility** - Add accessibilityLabel to touchables
10. **Performance monitoring** - Track slow screens and operations

---

## Next Steps

After setting up the project:

1. Implement authentication flow
2. Build employee management screens
3. Create time entry forms
4. Implement calendar view
5. Add OCR scanner
6. Build export functionality
7. Implement offline sync
8. Add change history viewer
9. Performance optimization
10. App store deployment preparation

Good luck building TimeTracker! 🚀
