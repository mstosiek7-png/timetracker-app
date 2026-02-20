// =====================================================
// Sync Service - Offline Synchronization
// =====================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';
import { SyncQueueItem, SyncOperation, SyncStatus } from '../types/models';

// Constants
const SYNC_QUEUE_KEY = 'sync_queue';
const LAST_SYNC_KEY = 'last_sync';
const MAX_RETRY_COUNT = 3;

// Types
export interface SyncOptions {
  force?: boolean;
  silent?: boolean;
  maxRetries?: number;
}

export interface SyncResult {
  success: boolean;
  syncedItems: number;
  failedItems: number;
  errors: Array<{ itemId: string; error: string }>;
}

// =====================================================
// Main Sync Functions
// =====================================================

/**
 * Synchronizuje kolejkę offline z serwerem
 */
export async function syncOfflineQueue(options: SyncOptions = {}): Promise<SyncResult> {
  try {
    // Sprawdź połączenie sieciowe
    const isConnected = await checkNetworkConnection();
    if (!isConnected && !options.force) {
      throw new Error('Brak połączenia sieciowego');
    }
    
    // Pobierz kolejkę z AsyncStorage
    const queue = await getSyncQueue();
    if (queue.length === 0) {
      return {
        success: true,
        syncedItems: 0,
        failedItems: 0,
        errors:[]
      };
    }
    
    const result: SyncResult = {
      success: true,
      syncedItems: 0,
      failedItems: 0,
      errors: []
    };
    
    // Synchronizuj każdy element kolejki
    for (const item of queue) {
      try {
        await syncQueueItem(item);
        await markItemAsSynced(item.id);
        result.syncedItems++;
      } catch (error) {
        result.failedItems++;
        result.errors.push({
          itemId: item.id,
          error: error instanceof Error ? error.message : 'Nieznany błąd'
        });
        
        // Zwiększ licznik prób
        await incrementRetryCount(item.id);
        
        // Jeśli przekroczono maksymalną liczbę prób, oznacz jako failed
        if (item.retry_count >= (options.maxRetries || MAX_RETRY_COUNT)) {
          await markItemAsFailed(item.id, error instanceof Error ? error.message : 'Przekroczono maksymalną liczbę prób');
        }
      }
    }
    
    // Zaktualizuj timestamp ostatniej synchronizacji
    if (result.syncedItems > 0) {
      await updateLastSyncTimestamp();
    }
    
    result.success = result.failedItems === 0;
    return result;
  } catch (error) {
    console.error('Błąd synchronizacji:', error);
    return {
      success: false,
      syncedItems: 0,
      failedItems: 0,
      errors: [{
        itemId: 'global',
        error: error instanceof Error ? error.message : 'Nieznany błąd synchronizacji'
      }]
    };
  }
}

/**
 * Synchronizuje pojedynczy element kolejki
 */
async function syncQueueItem(item: SyncQueueItem): Promise<void> {
  switch (item.operation) {
    case 'INSERT':
      await performInsert(item);
      break;
    case 'UPDATE':
      await performUpdate(item);
      break;
    case 'DELETE':
      await performDelete(item);
      break;
    default:
      throw new Error(`Nieobsługiwana operacja: ${item.operation}`);
  }
}

// =====================================================
// Queue Management
// =====================================================

/**
 * Dodaje operację do kolejki synchronizacji
 */
export async function addToSyncQueue(
  operation: SyncOperation,
  tableName: string,
  recordId: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const queue = await getSyncQueue();
    
    const newItem: SyncQueueItem = {
      id: generateId(),
      operation,
      table_name: tableName,
      record_id: recordId,
      data,
      status: 'pending',
      retry_count: 0,
      error_message: null,
      created_at: new Date().toISOString(),
      synced_at: null,
      created_by: null // Można dodać ID użytkownika jeśli dostępne
    };
    
    queue.push(newItem);
    await saveSyncQueue(queue);
    
    // Automatyczna synchronizacja jeśli jest połączenie
    const isConnected = await checkNetworkConnection();
    if (isConnected) {
      // Rozpocznij synchronizację w tle
      syncOfflineQueue({ silent: true }).catch(console.error);
    }
  } catch (error) {
    console.error('Błąd dodawania do kolejki:', error);
    throw new Error('Nie udało się dodać operacji do kolejki synchronizacji');
  }
}

/**
 * Pobiera kolejkę synchronizacji z AsyncStorage
 */
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  try {
    const queueJson = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    if (!queueJson) {
      return [];
    }
    
    return JSON.parse(queueJson);
  } catch (error) {
    console.error('Błąd pobierania kolejki:', error);
    return [];
  }
}

/**
 * Zapisuje kolejkę synchronizacji do AsyncStorage
 */
async function saveSyncQueue(queue: SyncQueueItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Błąd zapisywania kolejki:', error);
    throw new Error('Nie udało się zapisać kolejki synchronizacji');
  }
}

/**
 * Oznacza element jako zsynchronizowany
 */
async function markItemAsSynced(itemId: string): Promise<void> {
  try {
    const queue = await getSyncQueue();
    const itemIndex = queue.findIndex(item => item.id === itemId);
    
    if (itemIndex !== -1) {
      queue[itemIndex].status = 'synced';
      queue[itemIndex].synced_at = new Date().toISOString();
      await saveSyncQueue(queue);
    }
  } catch (error) {
    console.error('Błąd oznaczania elementu jako zsynchronizowany:', error);
  }
}

/**
 * Oznacza element jako nieudany
 */
async function markItemAsFailed(itemId: string, errorMessage: string): Promise<void> {
  try {
    const queue = await getSyncQueue();
    const itemIndex = queue.findIndex(item => item.id === itemId);
    
    if (itemIndex !== -1) {
      queue[itemIndex].status = 'failed';
      queue[itemIndex].error_message = errorMessage;
      await saveSyncQueue(queue);
    }
  } catch (error) {
    console.error('Błąd oznaczania elementu jako nieudany:', error);
  }
}

/**
 * Zwiększa licznik prób dla elementu
 */
async function incrementRetryCount(itemId: string): Promise<void> {
  try {
    const queue = await getSyncQueue();
    const itemIndex = queue.findIndex(item => item.id === itemId);
    
    if (itemIndex !== -1) {
      queue[itemIndex].retry_count += 1;
      await saveSyncQueue(queue);
    }
  } catch (error) {
    console.error('Błąd zwiększania licznika prób:', error);
  }
}

/**
 * Usuwa zsynchronizowane elementy z kolejki
 */
export async function cleanupSyncedItems(): Promise<void> {
  try {
    const queue = await getSyncQueue();
    const pendingItems = queue.filter(item => item.status !== 'synced');
    await saveSyncQueue(pendingItems);
  } catch (error) {
    console.error('Błąd czyszczenia kolejki:', error);
  }
}

/**
 * Usuwa wszystkie elementy z kolejki (dla debugowania)
 */
export async function clearSyncQueue(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
  } catch (error) {
    console.error('Błąd czyszczenia całej kolejki:', error);
    throw new Error('Nie udało się wyczyścić kolejki synchronizacji');
  }
}

// =====================================================
// Database Operations
// =====================================================

/**
 * Wykonuje operację INSERT na serwerze
 */
async function performInsert(item: SyncQueueItem): Promise<void> {
  const { data, error } = await supabase
    .from(item.table_name)
    .insert(item.data);
  
  if (error) {
    throw new Error(`Błąd INSERT: ${error.message}`);
  }
  
  // Jeśli tabela ma klucz obcy do sync_queue, zaktualizuj record_id
  if (data && data?.id && data[0].id !== item.record_id) {
    // Można zaktualizować lokalny record_id jeśli potrzebne
  }
}

/**
 * Wykonuje operację UPDATE na serwerze
 */
async function performUpdate(item: SyncQueueItem): Promise<void> {
  const { error } = await supabase
    .from(item.table_name)
    .update(item.data)
    .eq('id', item.record_id);
  
  if (error) {
    throw new Error(`Błąd UPDATE: ${error.message}`);
  }
}

/**
 * Wykonuje operację DELETE na serwerze
 */
async function performDelete(item: SyncQueueItem): Promise<void> {
  const { error } = await supabase
    .from(item.table_name)
    .delete()
    .eq('id', item.record_id);
  
  if (error) {
    throw new Error(`Błąd DELETE: ${error.message}`);
  }
}

// =====================================================
// Network & Connection
// =====================================================

/**
 * Sprawdza połączenie sieciowe
 */
export async function checkNetworkConnection(): Promise<boolean> {
  try {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected ?? false;
  } catch (error) {
    console.error('Błąd sprawdzania połączenia sieciowego:', error);
    return false;
  }
}

/**
 * Ustawia listener na zmiany połączenia sieciowego
 */
export function setupNetworkListener(
  onConnected: () => void,
  onDisconnected: () => void
): () => void {
  const unsubscribe = NetInfo.addEventListener(state => {
    if (state.isConnected) {
      onConnected();
    } else {
      onDisconnected();
    }
  });
  
  return unsubscribe;
}

/**
 * Automatyczna synchronizacja przy przywróceniu połączenia
 */
export async function setupAutoSync(): Promise<void> {
  const unsubscribe = setupNetworkListener(
    async () => {
      console.log('Połączenie sieciowe przywrócone, rozpoczynam synchronizację...');
      try {
        await syncOfflineQueue({ silent: true });
        console.log('Automatyczna synchronizacja zakończona');
      } catch (error) {
        console.error('Błąd automatycznej synchronizacji:', error);
      }
    },
    () => {
      console.log('Utracono połączenie sieciowe, praca w trybie offline');
    }
  );
  
  // Zwróć funkcję do czyszczenia listenera
  return unsubscribe;
}

// =====================================================
// Sync Status & Monitoring
// =====================================================

/**
 * Pobiera timestamp ostatniej synchronizacji
 */
export async function getLastSyncTimestamp(): Promise<Date | null> {
  try {
    const timestamp = await AsyncStorage.getItem(LAST_SYNC_KEY);
    return timestamp ? new Date(timestamp) : null;
  } catch (error) {
    console.error('Błąd pobierania timestamp ostatniej synchronizacji:', error);
    return null;
  }
}

/**
 * Aktualizuje timestamp ostatniej synchronizacji
 */
async function updateLastSyncTimestamp(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  } catch (error) {
    console.error('Błąd aktualizacji timestamp synchronizacji:', error);
  }
}

/**
 * Pobiera statystyki synchronizacji
 */
export async function getSyncStats(): Promise<{
  pending: number;
  synced: number;
  failed: number;
  total: number;
  lastSync: Date | null;
}> {
  try {
    const queue = await getSyncQueue();
    const lastSync = await getLastSyncTimestamp();
    
    const stats = {
      pending: queue.filter(item => item.status === 'pending').length,
      synced: queue.filter(item => item.status === 'synced').length,
      failed: queue.filter(item => item.status === 'failed').length,
      total: queue.length,
      lastSync
    };
    
    return stats;
  } catch (error) {
    console.error('Błąd pobierania statystyk synchronizacji:', error);
    return {
      pending: 0,
      synced: 0,
      failed: 0,
      total: 0,
      lastSync: null
    };
  }
}

/**
 * Sprawdza czy są jakieś oczekujące operacje
 */
export async function hasPendingOperations(): Promise<boolean> {
  const queue = await getSyncQueue();
  return queue.some(item => item.status === 'pending');
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Generuje unikalne ID dla elementów kolejki
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Konwertuje lokalne dane do formatu kolejki synchronizacji
 */
export function prepareForSync<T extends Record<string, unknown>>(
  operation: SyncOperation,
  tableName: string,
  data: T
): { recordId: string; syncData: Record<string, unknown> } {
  const recordId = data.id as string || generateId();
  
  // Usuń pola systemowe z danych
  const { id, created_at, updated_at, created_by, ...syncData } = data;
  
  return {
    recordId,
    syncData
  };
}

/**
 * Wrapper dla operacji bazodanowych z automatyczną synchronizacją offline
 */
export async function withOfflineSync<T>(
  operation: SyncOperation,
  tableName: string,
  performOnline: () => Promise<T>,
  getLocalData: () => Record<string, unknown>
): Promise<T> {
  try {
    // Spróbuj wykonać operację online
    const isConnected = await checkNetworkConnection();
    
    if (isConnected) {
      return await performOnline();
    }
    
    // Jeśli brak połączenia, dodaj do kolejki offline
    const localData = getLocalData();
    const { recordId, syncData } = prepareForSync(operation, tableName, localData);
    
    await addToSyncQueue(operation, tableName, recordId, syncData);
    
    // Zwróć dane lokalne (symulacja sukcesu)
    return localData as T;
  } catch (error) {
    // Jeśli błąd online, również dodaj do kolejki offline
    if (await checkNetworkConnection()) {
      const localData = getLocalData();
      const { recordId, syncData } = prepareForSync(operation, tableName, localData);
      
      await addToSyncQueue(operation, tableName, recordId, syncData);
      return localData as T;
    }
    
    throw error;
  }
}