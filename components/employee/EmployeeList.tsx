// =====================================================
// EmployeeList Component - Lista pracowników z funkcją usuwania
// =====================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useEmployees, useDeleteEmployee } from '../../hooks/useEmployees';
import { Employee } from '../../types/models';
import { EmployeeForm } from './EmployeeForm';

interface EmployeeListProps {
  onEmployeePress?: (employee: Employee) => void;
  showActions?: boolean;
  filterActive?: boolean;
}

export function EmployeeList({
  onEmployeePress,
  showActions = true,
  filterActive,
}: EmployeeListProps) {
  const { data: employees, isLoading, error, refetch } = useEmployees({
    active: filterActive,
  });

  const deleteMutation = useDeleteEmployee();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handleDeleteEmployee = (employee: Employee) => {
    Alert.alert(
      'Usuń pracownika',
      `Czy na pewno chcesz usunąć pracownika "${employee.name}"?`,
      [
        {
          text: 'Anuluj',
          style: 'cancel',
        },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(employee.id);
              Alert.alert('Sukces', 'Pracownik został usunięty');
            } catch (error) {
              Alert.alert(
                'Błąd',
                error instanceof Error ? error.message : 'Wystąpił błąd podczas usuwania'
              );
            }
          },
        },
      ]
    );
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
  };

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Ładowanie pracowników...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Błąd: {error.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Spróbuj ponownie</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!employees || employees.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Brak pracowników</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>Dodaj pierwszego pracownika</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {employees.map((employee) => (
          <View key={employee.id} style={styles.employeeCard}>
            <TouchableOpacity
              style={styles.employeeContent}
              onPress={() => onEmployeePress?.(employee)}
              disabled={!onEmployeePress}
            >
              <View style={styles.employeeInfo}>
                <Text style={styles.employeeName}>{employee.name}</Text>
                <Text style={styles.employeePosition}>{employee.position}</Text>
                <View style={styles.employeeStatusContainer}>
                  <View
                    style={[
                      styles.statusDot,
                      employee.active
                        ? styles.statusActive
                        : styles.statusInactive,
                    ]}
                  />
                  <Text
                    style={[
                      styles.employeeStatus,
                      employee.active
                        ? styles.statusTextActive
                        : styles.statusTextInactive,
                    ]}
                  >
                    {employee.active ? 'Aktywny' : 'Nieaktywny'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {showActions && (
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => handleEditEmployee(employee)}
                >
                  <Text style={styles.editButtonText}>Edytuj</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteEmployee(employee)}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.deleteButtonText}>Usuń</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {showActions && (
        <TouchableOpacity
          style={styles.floatingAddButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.floatingAddButtonText}>+</Text>
        </TouchableOpacity>
      )}

      <EmployeeForm
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        mode="create"
      />

      <EmployeeForm
        visible={!!editingEmployee}
        onClose={() => setEditingEmployee(null)}
        employee={editingEmployee || undefined}
        mode="edit"
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 18,
    color: '#6b7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  employeeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  employeeContent: {
    flex: 1,
  },
  employeeInfo: {
    marginBottom: 12,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  employeePosition: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  employeeStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusActive: {
    backgroundColor: '#10b981',
  },
  statusInactive: {
    backgroundColor: '#ef4444',
  },
  employeeStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusTextActive: {
    color: '#10b981',
  },
  statusTextInactive: {
    color: '#ef4444',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  editButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  floatingAddButtonText: {
    fontSize: 32,
    color: '#fff',
    lineHeight: 32,
  },
});

export default EmployeeList;