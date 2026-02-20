// =====================================================
// useOCR Hook - OCR Scanning and Document Management
// =====================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import {
  scanDocument,
  processExistingImage,
  getDocumentHistory,
  deleteDocument,
  ScanOptions,
  OCRResult,
} from '../services/ocr';
import { Document } from '../types/models';

// =====================================================
// Query Keys
// =====================================================

const ocrKeys = {
  all: ['ocr'] as const,
  documents: () => [...ocrKeys.all, 'documents'] as const,
  document: (id: string) => [...ocrKeys.documents(), id] as const,
  scan: () => [...ocrKeys.all, 'scan'] as const,
};

// =====================================================
// API Functions
// =====================================================

/**
 * Skanuje dokument (mutation)
 */
async function scanDocumentWithOptions(options: ScanOptions): Promise<OCRResult> {
  return scanDocument(options);
}

/**
 * Przetwarza istniejący obraz
 */
async function processImageWithUri(imageUri: string): Promise<OCRResult> {
  return processExistingImage(imageUri);
}

/**
 * Pobiera historię dokumentów
 */
async function fetchDocumentHistory(): Promise<Document[]> {
  return getDocumentHistory();
}

/**
 * Usuwa dokument
 */
async function removeDocument(documentId: string): Promise<void> {
  return deleteDocument(documentId);
}

// =====================================================
// React Query Hooks
// =====================================================

/**
 * Hook do skanowania dokumentów
 */
export function useScanDocument() {
  return useMutation({
    mutationFn: scanDocumentWithOptions,
    onSuccess: (data) => {
      console.log('Dokument zeskanowany pomyślnie:', data);
    },
    onError: (error: Error) => {
      console.error('Błąd skanowania dokumentu:', error);
      Alert.alert('Błąd', `Nie udało się zeskanować dokumentu: ${error.message}`);
    },
  });
}

/**
 * Hook do przetwarzania istniejącego obrazu
 */
export function useProcessImage() {
  return useMutation({
    mutationFn: processImageWithUri,
    onSuccess: (data) => {
      console.log('Obraz przetworzony pomyślnie:', data);
    },
    onError: (error: Error) => {
      console.error('Błąd przetwarzania obrazu:', error);
      Alert.alert('Błąd', `Nie udało się przetworzyć obrazu: ${error.message}`);
    },
  });
}

/**
 * Hook do pobierania historii dokumentów
 */
export function useDocumentHistory() {
  return useQuery({
    queryKey: ocrKeys.documents(),
    queryFn: fetchDocumentHistory,
    staleTime: 2 * 60 * 1000, // 2 minuty
    gcTime: 5 * 60 * 1000, // 5 minut
  });
}

/**
 * Hook do usuwania dokumentów
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeDocument,
    onSuccess: (_, documentId) => {
      // Inwaliduj zapytania związane z dokumentami
      queryClient.invalidateQueries({ queryKey: ocrKeys.documents() });
      queryClient.removeQueries({ queryKey: ocrKeys.document(documentId) });
    },
    onError: (error: Error) => {
      console.error('Błąd usuwania dokumentu:', error);
      Alert.alert('Błąd', `Nie udało się usunąć dokumentu: ${error.message}`);
    },
  });
}

/**
 * Hook do pobierania konkretnego dokumentu
 */
export function useDocument(documentId: string) {
  return useQuery({
    queryKey: ocrKeys.document(documentId),
    queryFn: async () => {
      const history = await fetchDocumentHistory();
      return history.find(doc => doc.id === documentId);
    },
    enabled: !!documentId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook do resetowania stanu OCR
 */
export function useResetOCR() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.removeQueries({ queryKey: ocrKeys.all });
  };
}

/**
 * Hook do statusu skanowania (loading/error/success)
 */
export function useScanStatus() {
  const scanMutation = useScanDocument();
  
  return {
    isScanning: scanMutation.isPending,
    scanError: scanMutation.error,
    scanData: scanMutation.data,
    resetScan: scanMutation.reset,
  };
}

/**
 * Hook do zarządzania uprawnieniami i stanem OCR
 */
export function useOCRManager() {
  const { mutateAsync: scan } = useScanDocument();
  const { mutateAsync: processImage } = useProcessImage();
  const { data: documents, isLoading: isLoadingDocuments } = useDocumentHistory();
  const { mutateAsync: deleteDoc } = useDeleteDocument();
  
  return {
    // Operations
    scanDocument: scan,
    processExistingImage: processImage,
    deleteDocument: deleteDoc,
    
    // Data
    documents: documents || [],
    isLoadingDocuments,
    
    // Status
    hasDocuments: (documents || []).length > 0,
    recentDocuments: (documents || []).slice(0, 5),
  };
}