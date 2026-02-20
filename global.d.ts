// =====================================================
// TimeTracker - Global Type Declarations
// =====================================================

// Declare module types for external packages
declare module 'text-encoding' {
  export class TextDecoder {
    constructor(encoding?: string, options?: { fatal?: boolean; ignoreBOM?: boolean });
    decode(input?: ArrayBuffer | ArrayBufferView, options?: { stream?: boolean }): string;
    readonly encoding: string;
    readonly fatal: boolean;
    readonly ignoreBOM: boolean;
  }
  export class TextEncoder {
    constructor(encoding?: string);
    encode(input?: string): Uint8Array;
    readonly encoding: string;
  }
}


// Environment variables type declarations
declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_SUPABASE_URL: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
    EXPO_PUBLIC_OPENAI_API_KEY?: string;
    EXPO_PUBLIC_APP_VERSION: string;
    EXPO_PUBLIC_ENV: 'development' | 'production' | 'test';
  }
}

// Global types for React Native
declare global {
  // Add any additional global type declarations here
}