// =====================================================
// Scanner Screen - Document OCR Scanning
// =====================================================

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  Dimensions,
  TouchableOpacity,
  Text,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { OCRResult } from '../../services/ocr';
import {
  useScanDocument,
  useProcessImage,
  useDocumentHistory,
  useDeleteDocument,
} from '../../hooks/useOCR';
import { Document } from '../../types/models';
import { theme } from '../../constants/theme';
import { Card, PageHeader, SectionTitle, FAB } from '../../components/ui';

// Types
type ScanSource = 'camera' | 'gallery';
type ProcessingStatus = 'idle' | 'scanning' | 'completed' | 'error';

// =====================================================
// Main Component
// =====================================================

export default function ScannerScreen() {
  // State
  const [scanSource, setScanSource] = useState<ScanSource>('camera');
  const [useOpenAI, setUseOpenAI] = useState(false);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  // Hooks
  const { mutateAsync: scanDocument, isPending: isScanning } = useScanDocument();
  const { mutateAsync: processImage, isPending: isProcessingImage } = useProcessImage();
  const { data: documents = [], isLoading: isLoadingHistory, refetch: refetchHistory } = useDocumentHistory();
  const { mutateAsync: deleteDocument } = useDeleteDocument();

  // =====================================================
  // Camera & Gallery Functions
  // =====================================================

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Brak uprawnień', 'Aparat wymaga uprawnień do działania');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const uri = result.assets[0].uri;
        setImageUri(uri);
        await handleProcessImage(uri);
      }
    } catch (error) {
      console.error('Błąd przechwytywania zdjęcia:', error);
      Alert.alert('Błąd', 'Nie udało się przechwycić zdjęcia');
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Brak uprawnień', 'Galeria wymaga uprawnień do działania');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const uri = result.assets[0].uri;
        setImageUri(uri);
        await handleProcessImage(uri);
      }
    } catch (error) {
      console.error('Błąd wybierania zdjęcia:', error);
      Alert.alert('Błąd', 'Nie udało się wybrać zdjęcia');
    }
  };

  // =====================================================
  // OCR Processing
  // =====================================================

  const handleProcessImage = async (uri: string) => {
    setStatus('scanning');
    
    try {
      const options = {
        source: scanSource,
        useOpenAI,
        language: 'pol' as const,
      };

      const result = await processImage(uri);
      
      setOcrResult(result);
      setStatus('completed');
      setShowResultModal(true);
      
      // Odśwież historię
      refetchHistory();
    } catch (error) {
      console.error('Błąd przetwarzania obrazu:', error);
      setStatus('error');
      Alert.alert(
        'Błąd',
        error instanceof Error ? error.message : 'Nie udało się przetworzyć dokumentu'
      );
    }
  };

  const handleScanNew = () => {
    setImageUri(null);
    setOcrResult(null);
    setStatus('idle');
    setShowResultModal(false);
  };

  // =====================================================
  // Document History Management
  // =====================================================

  const handleViewDocument = (document: Document) => {
    if (document.ocr_text) {
      setOcrResult({
        text: document.ocr_text,
        confidence: 0.9,
        data: document.ocr_data || {},
        processedData: document.ocr_data as any,
      });
      setShowResultModal(true);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    Alert.alert(
      'Usuń dokument',
      'Czy na pewno chcesz usunąć ten dokument?',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDocument(documentId);
              refetchHistory();
              Alert.alert('Sukces', 'Dokument został usunięty');
            } catch (error) {
              Alert.alert('Błąd', 'Nie udało się usunąć dokumentu');
            }
          },
        },
      ]
    );
  };

  // =====================================================
  // Render OCR Result Modal
  // =====================================================

  const renderResultModal = () => {
    if (!showResultModal || !ocrResult) return null;

    return (
      <Modal
        visible={showResultModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowResultModal(false)}
      >
        <View style={styles.resultModalOverlay}>
          <View style={styles.resultModalContainer}>
            <View style={styles.resultModalHeader}>
              <Text style={styles.resultModalTitle}>Wynik skanowania</Text>
              <TouchableOpacity onPress={() => setShowResultModal(false)}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={theme.colors.dark}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.resultModalContent}>
              <Card style={styles.resultCard}>
                {/* Przetworzone dane */}
                {ocrResult.processedData && (
                  <>
                    <SectionTitle text="Wydobyte dane" />
                    
                    {ocrResult.processedData.supplierName && (
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>Dostawca:</Text>
                        <Text style={styles.dataValue}>
                          {ocrResult.processedData.supplierName}
                        </Text>
                      </View>
                    )}

                    {ocrResult.processedData.invoiceNumber && (
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>Numer faktury:</Text>
                        <Text style={styles.dataValue}>
                          {ocrResult.processedData.invoiceNumber}
                        </Text>
                      </View>
                    )}

                    {ocrResult.processedData.date && (
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>Data:</Text>
                        <Text style={styles.dataValue}>
                          {ocrResult.processedData.date}
                        </Text>
                      </View>
                    )}

                    {ocrResult.processedData.amount && (
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>Kwota:</Text>
                        <Text style={styles.dataValue}>
                          {ocrResult.processedData.amount}
                        </Text>
                      </View>
                    )}

                    <View style={styles.separator} />
                  </>
                )}

                {/* Surowy tekst */}
                <SectionTitle text="Rozpoznany tekst" />
                <View style={styles.textCard}>
                  <ScrollView style={styles.textScroll}>
                    <Text style={styles.ocrText}>{ocrResult.text}</Text>
                  </ScrollView>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.confidenceChip}>
                    <MaterialCommunityIcons
                      name="chart-line"
                      size={16}
                      color={theme.colors.accent}
                    />
                    <Text style={styles.confidenceText}>
                      Dokładność: {(ocrResult.confidence * 100).toFixed(1)}%
                    </Text>
                  </View>
                </View>

                <View style={styles.separator} />

                {/* Akcje */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalActionButton}
                    onPress={handleScanNew}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalActionText}>Nowe skanowanie</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.modalActionButtonPrimary]}
                    onPress={() => setShowResultModal(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.modalActionText, styles.modalActionTextPrimary]}>
                      Zamknij
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // =====================================================
  // Main Render
  // =====================================================

  const isProcessing = isScanning || isProcessingImage;
  const processingStatus = isProcessing ? 'scanning' : status;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 1. PageHeader */}
        <PageHeader title="" />

        {/* Status skanowania */}
        {processingStatus !== 'idle' && (
          <Card style={styles.statusCard}>
            <View style={styles.statusContent}>
              <ActivityIndicator
                size="small"
                color={theme.colors.accent}
                animating={processingStatus === 'scanning'}
              />
              <Text style={styles.statusText}>
                {processingStatus === 'scanning' && 'Skanowanie dokumentu...'}
                {processingStatus === 'completed' && 'Skanowanie zakończone!'}
                {processingStatus === 'error' && 'Błąd skanowania'}
              </Text>
            </View>
          </Card>
        )}

        {/* Wybór źródła */}
        <Card style={styles.cardSpacing}>
          <SectionTitle text="Źródło dokumentu" />
          
          <View style={styles.sourceButtons}>
            <TouchableOpacity
              style={[
                styles.sourceButton,
                scanSource === 'camera' && styles.sourceButtonActive,
              ]}
              onPress={() => setScanSource('camera')}
              disabled={isProcessing}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="camera"
                size={24}
                color={scanSource === 'camera' ? '#FFFFFF' : theme.colors.dark}
              />
              <Text
                style={[
                  styles.sourceButtonText,
                  scanSource === 'camera' && styles.sourceButtonTextActive,
                ]}
              >
                Aparat
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.sourceButton,
                scanSource === 'gallery' && styles.sourceButtonActive,
              ]}
              onPress={() => setScanSource('gallery')}
              disabled={isProcessing}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="image"
                size={24}
                color={scanSource === 'gallery' ? '#FFFFFF' : theme.colors.dark}
              />
              <Text
                style={[
                  styles.sourceButtonText,
                  scanSource === 'gallery' && styles.sourceButtonTextActive,
                ]}
              >
                Galeria
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.separator} />

          {/* Opcje OCR */}
          <SectionTitle text="Opcje OCR" />
          
          <View style={styles.optionRow}>
            <TouchableOpacity
              style={[
                styles.optionToggle,
                useOpenAI && styles.optionToggleActive,
              ]}
              onPress={() => !isProcessing && setUseOpenAI(!useOpenAI)}
              disabled={isProcessing}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={useOpenAI ? 'robot' : 'robot-outline'}
                size={20}
                color={useOpenAI ? '#FFFFFF' : theme.colors.dark}
              />
              <Text
                style={[
                  styles.optionToggleText,
                  useOpenAI && styles.optionToggleTextActive,
                ]}
              >
                {useOpenAI ? 'OpenAI (zaawansowane)' : 'Tesseract (podstawowe)'}
              </Text>
            </TouchableOpacity>
            
            {useOpenAI && (
              <View style={styles.infoBadge}>
                <MaterialCommunityIcons
                  name="information"
                  size={16}
                  color={theme.colors.dark}
                />
                <Text style={styles.infoBadgeText}>Wymaga klucza API</Text>
              </View>
            )}
          </View>

          <Text style={styles.hint}>
            {useOpenAI
              ? 'OpenAI Vision API zapewnia lepszą dokładność, ale wymaga klucza API'
              : 'Tesseract działa offline, ale może być mniej dokładny'}
          </Text>
        </Card>

        {/* 3. Obszar aparatu */}
        <Card style={styles.cardSpacing}>
          <SectionTitle text="Skanuj dokument" />
          
          <View style={styles.cameraArea}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
            ) : (
              <View style={styles.cameraPlaceholder}>
                <MaterialCommunityIcons
                  name={scanSource === 'camera' ? 'camera' : 'image'}
                  size={64}
                  color={theme.colors.muted}
                />
                <Text style={styles.cameraPlaceholderText}>
                  {scanSource === 'camera' 
                    ? 'Przygotuj dokument do skanowania'
                    : 'Wybierz zdjęcie dokumentu'}
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* 4. Przycisk "Skanuj" - FAB pełna szerokość */}
        <View style={styles.fabContainer}>
          <FAB
            label={isProcessing ? 'Przetwarzanie...' : 'Skanuj'}
            onPress={scanSource === 'camera' ? handleTakePhoto : handlePickFromGallery}
            disabled={isProcessing}
            fullWidth
          />
        </View>

        {/* 5. Historia dokumentów */}
        <Card style={styles.cardSpacing}>
          <View style={styles.sectionHeader}>
            <SectionTitle text="Ostatnie dokumenty" />
            <TouchableOpacity
              onPress={() => refetchHistory()}
              disabled={isProcessing || isLoadingHistory}
              activeOpacity={0.7}
              style={styles.refreshButton}
            >
              <MaterialCommunityIcons
                name="refresh"
                size={20}
                color={theme.colors.accent}
              />
            </TouchableOpacity>
          </View>

          {isLoadingHistory ? (
            <ActivityIndicator style={styles.historyLoading} color={theme.colors.accent} />
          ) : documents.length === 0 ? (
            <Text style={styles.emptyText}>
              Brak zeskanowanych dokumentów
            </Text>
          ) : (
            documents.map((document: Document) => (
              <View key={document.id} style={styles.documentItem}>
                <View style={styles.documentInfo}>
                  <Text style={styles.documentName}>
                    {document.file_name}
                  </Text>
                  <Text style={styles.documentDetails}>
                    {new Date(document.created_at).toLocaleDateString('pl-PL')} •{' '}
                    {document.status}
                  </Text>
                </View>
                <View style={styles.documentActions}>
                  <TouchableOpacity
                    onPress={() => handleViewDocument(document)}
                    disabled={isProcessing}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name="eye"
                      size={20}
                      color={theme.colors.dark}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteDocument(document.id)}
                    disabled={isProcessing}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name="delete"
                      size={20}
                      color={theme.colors.dark}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </Card>

        {/* 6. Wyniki OCR w Card z kremowym tłem */}
        {ocrResult && (
          <Card style={styles.resultsCard}>
            <SectionTitle text="Wyniki OCR" />
            <Card style={styles.ocrResultsCard}>
              {ocrResult.processedData && (
                <>
                  {ocrResult.processedData.supplierName && (
                    <Text style={styles.resultText}>
                      <Text style={styles.resultLabel}>Dostawca:</Text> {ocrResult.processedData.supplierName}
                    </Text>
                  )}
                  {ocrResult.processedData.invoiceNumber && (
                    <Text style={styles.resultText}>
                      <Text style={styles.resultLabel}>Numer faktury:</Text> {ocrResult.processedData.invoiceNumber}
                    </Text>
                  )}
                  {ocrResult.processedData.amount && (
                    <Text style={styles.resultText}>
                      <Text style={styles.resultLabel}>Kwota:</Text> {ocrResult.processedData.amount}
                    </Text>
                  )}
                </>
              )}
              <Text style={styles.confidenceTextSmall}>
                Dokładność: {(ocrResult.confidence * 100).toFixed(1)}%
              </Text>
            </Card>
          </Card>
        )}
      </ScrollView>

      {/* Modal wyników */}
      {renderResultModal()}
    </SafeAreaView>
  );
}

// =====================================================
// Styles
// =====================================================

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  cardSpacing: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },

  // ── Status ──
  statusCard: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.accentLight,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  statusText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.accent,
    fontWeight: '600',
  },

  // ── Source Buttons ──
  sourceButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  sourceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.background,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sourceButtonActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  sourceButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  sourceButtonTextActive: {
    color: '#FFFFFF',
  },

  // ── Separator ──
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.lg,
  },

  // ── Option Toggle ──
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  optionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.background,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flex: 1,
  },
  optionToggleActive: {
    backgroundColor: theme.colors.dark,
    borderColor: theme.colors.dark,
  },
  optionToggleText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  optionToggleTextActive: {
    color: '#FFFFFF',
  },

  // ── Info Badge ──
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.accentLight,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.pill,
  },
  infoBadgeText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.accent,
    fontWeight: '700',
  },

  // ── Hint ──
  hint: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.muted,
    fontStyle: 'italic',
    marginTop: theme.spacing.sm,
  },

  // ── Camera Area ──
  cameraArea: {
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: theme.spacing.sm,
  },
  cameraPlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  cameraPlaceholderText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.muted,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  previewImage: {
    width: '100%',
    height: 200,
  },

  // ── FAB ──
  fabContainer: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },

  // ── Section Header ──
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refreshButton: {
    padding: theme.spacing.xs,
  },

  // ── History ──
  historyLoading: {
    marginVertical: theme.spacing.xl,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.muted,
    fontStyle: 'italic',
    paddingVertical: theme.spacing.xl,
    fontSize: theme.fontSize.md,
  },
  documentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  documentDetails: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.muted,
  },
  documentActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },

  // ── Results Card ──
  resultsCard: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  ocrResultsCard: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
  },
  resultText: {
    fontSize: theme.fontSize.md,
    marginBottom: theme.spacing.sm,
  },
  resultLabel: {
    fontWeight: '700',
    color: theme.colors.dark,
  },
  confidenceTextSmall: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.accent,
    fontWeight: '700',
    marginTop: theme.spacing.sm,
  },

  // ── Result Modal ──
  resultModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  resultModalContainer: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    maxHeight: '90%',
  },
  resultModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  resultModalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '900',
    color: theme.colors.dark,
  },
  resultModalContent: {
    maxHeight: 500,
    padding: theme.spacing.xl,
  },
  resultCard: {
    gap: theme.spacing.md,
  },
  dataRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
  },
  dataLabel: {
    fontWeight: '700',
    width: 120,
    color: theme.colors.dark,
    fontSize: theme.fontSize.md,
  },
  dataValue: {
    flex: 1,
    color: theme.colors.dark,
    fontSize: theme.fontSize.md,
  },
  textCard: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    maxHeight: 200,
  },
  textScroll: {
    maxHeight: 180,
  },
  ocrText: {
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    color: theme.colors.dark,
    fontFamily: 'monospace',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  confidenceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.accentLight,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
  },
  confidenceText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.accent,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  modalActionButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalActionButtonPrimary: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  modalActionText: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  modalActionTextPrimary: {
    color: '#FFFFFF',
  },
});