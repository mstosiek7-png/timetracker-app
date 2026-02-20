// Polyfill for TextDecoder/TextEncoder (required by jspdf/fast-png in React Native/Hermes)
import { TextDecoder as TextDecoderPolyfill, TextEncoder as TextEncoderPolyfill } from 'text-encoding';

if (typeof global.TextDecoder === 'undefined') {
  (global as any).TextDecoder = TextDecoderPolyfill;
}
if (typeof global.TextEncoder === 'undefined') {
  (global as any).TextEncoder = TextEncoderPolyfill;
}

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
