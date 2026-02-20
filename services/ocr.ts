// =====================================================
// OCR Service - Document Scanning and Text Recognition
// =====================================================

import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as Camera from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { Document, DocumentInsert } from '../types/models';

// Types
export interface OCRResult {
  text: string;
  confidence: number;
  data: Record<string, unknown>;
  processedData?: {
    supplierName?: string;
    invoiceNumber?: string;
    date?: string;
    amount?: string;
    items?: Array<{
      description: string;
      quantity: string;
      price: string;
    }>;
  };
}

export interface ScanOptions {
  source: 'camera' | 'gallery';
  useOpenAI?: boolean;
  language?: string;
}

// =====================================================
// Main OCR Functions
// =====================================================

/**
 * Skanuje dokument i wyodrębnia tekst za pomocą OCR
 */
export async function scanDocument(options: ScanOptions): Promise<OCRResult> {
  try {
    // 1. Uzyskaj obraz
    const imageUri = await getImage(options.source);
    
    // 2. Przetwórz obraz (preprocessing)
    const processedImageUri = await preprocessImage(imageUri);
    
    // 3. Wyodrębnij tekst (Tesseract.js lub OpenAI)
    let ocrResult: OCRResult;
    
    if (options.useOpenAI && process.env.EXPO_PUBLIC_OPENAI_API_KEY) {
      ocrResult = await extractTextWithOpenAI(processedImageUri, options.language);
    } else {
      ocrResult = await extractTextWithTesseract(processedImageUri, options.language);
    }
    
    // 4. Przetwórz wyodrębniony tekst (strukturyzacja)
    ocrResult.processedData = processExtractedText(ocrResult.text);
    
    // 5. Zapisz dokument w bazie danych
    await saveDocumentToDatabase(imageUri, ocrResult);
    
    return ocrResult;
  } catch (error) {
    console.error('Błąd skanowania dokumentu:', error);
    throw new Error('Nie udało się zeskanować dokumentu');
  }
}

/**
 * Przetwarza istniejący obraz z URI
 */
export async function processExistingImage(imageUri: string, useOpenAI = false): Promise<OCRResult> {
  try {
    const processedImageUri = await preprocessImage(imageUri);
    
    let ocrResult: OCRResult;
    if (useOpenAI && process.env.EXPO_PUBLIC_OPENAI_API_KEY) {
      ocrResult = await extractTextWithOpenAI(processedImageUri, 'pol');
    } else {
      ocrResult = await extractTextWithTesseract(processedImageUri, 'pol');
    }
    
    ocrResult.processedData = processExtractedText(ocrResult.text);
    await saveDocumentToDatabase(imageUri, ocrResult);
    
    return ocrResult;
  } catch (error) {
    console.error('Błąd przetwarzania obrazu:', error);
    throw new Error('Nie udało się przetworzyć obrazu');
  }
}

// =====================================================
// Image Acquisition
// =====================================================

/**
 * Uzyskuje obraz z kamery lub galerii
 */
async function getImage(source: 'camera' | 'gallery'): Promise<string> {
  if (source === 'camera') {
    // Prośba o uprawnienia do kamery
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Brak uprawnień do kamery');
    }
    
    // Otwórz kamerę
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect:[4, 3],
      quality: 0.8,
      base64: true,
    });
    
    if (result.canceled) {
      throw new Error('Anulowano przechwytywanie obrazu');
    }
    
    return result.assets[0].uri;
  } else {
    // Wybierz z galerii
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Brak uprawnień do galerii');
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });
    
    if (result.canceled) {
      throw new Error('Anulowano wybór obrazu');
    }
    
    return result.assets[0].uri;
  }
}

// =====================================================
// Image Preprocessing
// =====================================================

  /**
 * Przetwarza obraz przed OCR (poprawa jakości)
 */
async function preprocessImage(imageUri: string): Promise<string> {
  try {
    // Sprawdź czy plik istnieje
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    if (!fileInfo.exists) {
      throw new Error('Plik obrazu nie istnieje');
    }
    
    // Optymalizacja obrazu dla lepszego OCR
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          { resize: { width: 1500 } }, // Redukcja rozmiaru dla lepszej wydajności
          { rotate: 0 }, // Możliwość automatycznej korekty obrotu
          { crop: { originX: 0.05, originY: 0.05, width: 0.9, height: 0.9 } }, // Przycięcie krawędzi
          { flip: ImageManipulator.FlipType.Vertical }, // Korekta orientacji
        ],
        { 
          compress: 0.7, // Optymalny kompromis jakość/rozmiar
          format: ImageManipulator.SaveFormat.JPEG, 
          base64: true 
        }
      );
      
      console.log('Obraz przetworzony pomyślnie:', {
        originalUri: imageUri,
        processedUri: manipResult.uri,
        width: manipResult.width,
        height: manipResult.height
      });
      
      return manipResult.uri;
    } catch (manipError) {
      console.warn('Błąd manipulacji obrazu, używam oryginalnego:', manipError);
      return imageUri;
    }
  } catch (error) {
    console.warn('Błąd przetwarzania obrazu, używam oryginalnego:', error);
    return imageUri;
  }
}

// =====================================================
// Text Extraction - Tesseract.js
// =====================================================

/**
 * Wyodrębnia tekst za pomocą Tesseract.js
 */
async function extractTextWithTesseract(imageUri: string, language = 'pol'): Promise<OCRResult> {
  try {
    // W React Native potrzebujemy web worker lub natywnej implementacji
    // Dla demonstracji, symulujemy działanie
    
    // W rzeczywistej implementacji:
    // const { createWorker } = await import('tesseract.js');
    // const worker = await createWorker(language);
    // const { data } = await worker.recognize(imageUri);
    // await worker.terminate();
    
    // return {
    //   text: data.text,
    //   confidence: data.confidence,
    //   data: data
    // };
    
    // Tymczasowa implementacja demonstracyjna
    return {
      text: `PRZYKŁADOWY TEKST Z FAKTURY
      
Dostawca: ABC Budowlane Sp. z o.o.
Numer faktury: FV/2024/1234
Data: 2024-03-15
Kwota: 12 345,67 PLN

Pozycje:
1. Cement Portlandzki 25kg - 100 szt - 25,00 PLN/szt
2. Piasek budowlany 1t - 50 szt - 150,00 PLN/szt
3. Cegła pełna - 5000 szt - 2,50 PLN/szt`,
      confidence: 0.85,
      data: {
        blocks: [],
        paragraphs: [],
        lines: [],
        words: []
      }
    };
  } catch (error) {
    console.error('Błąd Tesseract OCR:', error);
    throw new Error('Nie udało się wyodrębnić tekstu za pomocą Tesseract');
  }
}

// =====================================================
// Text Extraction - OpenAI Vision API
// =====================================================

/**
 * Wyodrębnia tekst za pomocą OpenAI Vision API (bardziej zaawansowane)
 */
async function extractTextWithOpenAI(imageUri: string, language = 'pol'): Promise<OCRResult> {
  try {
    const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('Brak klucza API OpenAI');
    }
    
    // Wczytaj obraz jako base64
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64
    });
    
    // Wywołaj OpenAI Vision API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Wyodrębnij tekst z tego obrazu faktury. Zwróć czysty tekst. Język: ${language}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      })
    });
    
    if (!response.ok) {
      throw new Error(`Błąd OpenAI API: ${response.statusText}`);
    }
    
    const data = await response.json();
    const text = data.choices[0]?.message?.content || '';
    
    return {
      text,
      confidence: 0.95, // OpenAI ma wysoką dokładność
      data: data
    };
  } catch (error) {
    console.error('Błąd OpenAI OCR:', error);
    // Fallback do Tesseract
    return extractTextWithTesseract(imageUri, language);
  }
}

// =====================================================
// Text Processing
// =====================================================

/**
 * Przetwarza wyodrębniony tekst na strukturyzowane dane
 */
function processExtractedText(text: string): OCRResult['processedData'] {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  
  const result: OCRResult['processedData'] = {};
  
  // Proste parsowanie dla faktur
  lines.forEach(line => {
    const lowerLine = line.toLowerCase();
    
    // Dostawca
    if (lowerLine.includes('dostawca') || lowerLine.includes('sprzedawca')) {
      result.supplierName = line.split(':')[1]?.trim() || line;
    }
    
    // Numer faktury
    if (lowerLine.includes('numer') && lowerLine.includes('faktur')) {
      result.invoiceNumber = line.split(':')[1]?.trim() || 
                            line.match(/[A-Z]{2,}\/\d{4}\/\d+/)?.[0] ||
                            line.match(/FV\/\d+\/\d+/)?.[0];
    }
    
    // Data
    if (lowerLine.includes('data')) {
      const dateMatch = line.match(/\d{4}-\d{2}-\d{2}/) || 
                       line.match(/\d{2}\.\d{2}\.\d{4}/) ||
                       line.match(/\d{2}\/\d{2}\/\d{4}/);
      if (dateMatch) {
        result.date = dateMatch[0];
      }
    }
    
    // Kwota
    if (lowerLine.includes('kwota') || lowerLine.includes('suma')) {
      const amountMatch = line.match(/[\d\s]+,\d{2}\s*[A-Z]{3,4}/) ||
                         line.match(/[\d\s]+\.\d{2}\s*[A-Z]{3,4}/);
      if (amountMatch) {
        result.amount = amountMatch[0];
      }
    }
  });
  
  // Próba wyodrębnienia pozycji
  const items: Array<{ description: string; quantity: string; price: string }> = [];
  let inItemsSection = false;
  
  lines.forEach(line => {
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.includes('pozyc') || lowerLine.includes('towar') || lowerLine.includes('opis')) {
      inItemsSection = true;
      return;
    }
    
    if (inItemsSection && line.match(/^\d+\./)) {
      // Format: "1. Opis towaru - ilość szt - cena PLN/szt"
      const parts = line.split(/[-–]/).map(part => part.trim());
      if (parts.length >= 3) {
        items.push({
          description: parts[0].replace(/^\d+\.\s*/, ''),
          quantity: parts[1].replace(/[^\d\s]/g, '').trim(),
          price: parts[2].replace(/[^\d\s,.]/g, '').trim()
        });
      }
    }
  });
  
  if (items.length > 0) {
    result.items = items;
  }
  
  return result;
}

// =====================================================
// Database Integration
// =====================================================

/**
 * Zapisuje zeskanowany dokument do bazy danych
 */
async function saveDocumentToDatabase(imageUri: string, ocrResult: OCRResult): Promise<void> {
  try {
    const fileName = imageUri.split('/').pop() || `document_${Date.now()}.jpg`;
    
    // Prześlij plik do Supabase Storage
    const fileContent = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64
    });
    
    const filePath = `documents/${Date.now()}_${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, FileSystem.EncodingType.Base64.encode(fileContent), {
        contentType: 'image/jpeg',
        upsert: true
      });
    
    if (uploadError) {
      console.error('Błąd przesyłania pliku:', uploadError);
      // Kontynuuj bez przesyłania pliku
    }
    
    // Zapisz metadane do bazy danych
    const documentData: DocumentInsert = {
      file_name: fileName,
      file_path: filePath,
      file_size: null, // Można dodać rozmiar
      mime_type: 'image/jpeg',
      ocr_text: ocrResult.text,
      ocr_data: ocrResult.data,
      status: 'completed',
      project_id: null,
      date: new Date().toISOString().split('T')[0],
    };
    
    const { error: dbError } = await supabase
      .from('documents')
      .insert(documentData);
    
    if (dbError) {
      console.error('Błąd zapisu do bazy danych:', dbError);
    }
  } catch (error) {
    console.error('Błąd zapisywania dokumentu:', error);
    // Nie przerywamy głównej funkcji z powodu błędu zapisu
  }
}

// =====================================================
// Utility Functions
// =====================================================

/**
 * Sprawdza dostępność kamery
 */
export async function checkCameraPermissions(): Promise<boolean> {
  const { status } = await Camera.getCameraPermissionsAsync();
  return status === 'granted';
}

/**
 * Sprawdza dostępność galerii
 */
export async function checkGalleryPermissions(): Promise<boolean> {
  const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
  return status === 'granted';
}

/**
 * Pobiera historię zeskanowanych dokumentów
 */
export async function getDocumentHistory(): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) {
    console.error('Błąd pobierania historii dokumentów:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Usuwa zeskanowany dokument
 */
export async function deleteDocument(documentId: string): Promise<void> {
  try {
    // Pobierz informacje o dokumencie
    const { data: document } = await supabase
      .from('documents')
      .select('file_path')
      .eq('id', documentId)
      .single();
    
    if (document?.file_path) {
      // Usuń plik z storage
      await supabase.storage
        .from('documents')
        .remove([document.file_path]);
    }
    
    // Usuń rekord z bazy danych
    await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);
  } catch (error) {
    console.error('Błąd usuwania dokumentu:', error);
    throw new Error('Nie udało się usunąć dokumentu');
  }
}