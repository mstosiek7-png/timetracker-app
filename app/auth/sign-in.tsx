// =====================================================
// Ekran logowania
// =====================================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { theme } from '../../constants/theme';
import { supabase } from '../../services/supabase';
import { useI18n } from '../../i18n/I18nProvider';

export default function SignInScreen() {
  const BIOMETRIC_KEY = 'timetracker:biometric-enabled';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [biometricChecked, setBiometricChecked] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const { t } = useI18n();

  // Logowanie przez email i hasło
  const handleSignIn = async () => {
    if (!email.trim()) {
      Alert.alert(t('Blad'), t('Podaj adres email'));
      return;
    }
    if (!password.trim()) {
      Alert.alert(t('Blad'), t('Podaj haslo'));
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) throw error;

      await AsyncStorage.setItem(BIOMETRIC_KEY, '1');
      setBiometricEnabled(true);

      // Po udanym logowaniu przekieruj do głównego ekranu
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Błąd logowania:', error);
      Alert.alert(
        t('Blad logowania'),
        error.message || t('Nie udalo sie zalogowac. Sprawdz dane.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Logowanie przez Google
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${process.env.EXPO_PUBLIC_APP_SCHEME}://`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('Błąd logowania przez Google:', error);
      Alert.alert(t('Blad'), t('Nie udalo sie zalogowac przez Google'));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleBiometricSignIn = async () => {
    if (Platform.OS !== 'android') {
      return;
    }

    setIsBiometricLoading(true);
    try {
      const biometricEnabled = await AsyncStorage.getItem(BIOMETRIC_KEY);
      if (biometricEnabled !== '1') {
        Alert.alert(t('Blad'), t('Najpierw zaloguj sie haslem'));
        return;
      }

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        Alert.alert(t('Blad'), t('Brak czytnika odcisku palca'));
        return;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        Alert.alert(t('Blad'), t('Brak zapisanych odciskow palca'));
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('Potwierdz odciskiem palca'),
        cancelLabel: t('Anuluj'),
      });

      if (!result.success) {
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        Alert.alert(t('Blad'), t('Najpierw zaloguj sie haslem'));
        return;
      }

      router.replace('/(tabs)');
    } catch (error) {
      console.error('Blad biometrii:', error);
      Alert.alert(t('Blad'), t('Nie udalo sie uzyc odcisku palca. Sprobuj ponownie.'));
    } finally {
      setIsBiometricLoading(false);
    }
  };

  useEffect(() => {
    if (biometricChecked || Platform.OS !== 'android') {
      return;
    }

    let cancelled = false;

    const attemptBiometric = async () => {
      const biometricEnabled = await AsyncStorage.getItem(BIOMETRIC_KEY);
      if (cancelled) {
        return;
      }
      if (biometricEnabled !== '1') {
        setBiometricChecked(true);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) {
        return;
      }
      if (!data.session) {
        setBiometricChecked(true);
        return;
      }

      await handleBiometricSignIn();
      if (!cancelled) {
        setBiometricChecked(true);
      }
    };

    attemptBiometric();

    return () => {
      cancelled = true;
    };
  }, [biometricChecked, handleBiometricSignIn]);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    let cancelled = false;
    const loadBiometricFlag = async () => {
      const flag = await AsyncStorage.getItem(BIOMETRIC_KEY);
      if (!cancelled) {
        setBiometricEnabled(flag === '1');
      }
    };

    loadBiometricFlag();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Nagłówek */}
        <View style={styles.header}>
          <Text style={styles.title}>TimeTracker</Text>
          <Text style={styles.subtitle}>{t('Zaloguj sie do konta')}</Text>
        </View>

        {/* Formularz logowania */}
        <View style={styles.form}>
          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('Email')}</Text>
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={setEmail}
              placeholder={t('twoj@email.com')}
              placeholderTextColor={theme.colors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Hasło */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('Haslo')}</Text>
            <View style={styles.passwordField}>
              <TextInput
                style={[styles.textInput, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={theme.colors.muted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                style={styles.passwordToggle}
                accessibilityLabel={showPassword ? t('Ukryj haslo') : t('Pokaz haslo')}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={theme.colors.muted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Przycisk logowania */}
          <TouchableOpacity
            style={[styles.signInButton, isLoading && styles.disabledButton]}
            onPress={handleSignIn}
            disabled={isLoading}
          >
            {isLoading ? (
              <Text style={styles.signInButtonText}>{t('Logowanie...')}</Text>
            ) : (
              <Text style={styles.signInButtonText}>{t('Zaloguj sie')}</Text>
            )}
          </TouchableOpacity>

          {/* Separator */}
          <View style={styles.separator}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>{t('lub')}</Text>
            <View style={styles.separatorLine} />
          </View>

          {/* Google Sign In */}
          <TouchableOpacity
            style={[styles.googleButton, isGoogleLoading && styles.disabledButton]}
            onPress={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            <Ionicons name="logo-google" size={20} color={theme.colors.dark} />
            <Text style={styles.googleButtonText}>
              {isGoogleLoading ? t('Laczenie...') : t('Kontynuuj przez Google')}
            </Text>
          </TouchableOpacity>

          {Platform.OS === 'android' && (
            <View>
              <TouchableOpacity
                style={[styles.biometricButton, isBiometricLoading && styles.disabledButton]}
                onPress={handleBiometricSignIn}
                disabled={isBiometricLoading}
              >
                <Ionicons name="finger-print" size={20} color={theme.colors.dark} />
                <Text style={styles.biometricButtonText}>
                  {isBiometricLoading ? t('Sprawdzanie...') : t('Zaloguj odciskiem palca')}
                </Text>
              </TouchableOpacity>
              {!biometricEnabled && (
                <Text style={styles.biometricHint}>{t('Odcisk palca wymaga pierwszego logowania haslem')}</Text>
              )}
            </View>
          )}

          {/* Linki pomocnicze */}
          <View style={styles.linksContainer}>
            <Link href="/auth/forgot-password" style={styles.link}>
              <Text style={styles.linkText}>{t('Zapomniales hasla?')}</Text>
            </Link>
            
            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>{t('Nie masz konta?')} </Text>
              <Link href="/auth/sign-up" style={styles.signupLink}>
                <Text style={styles.signupLinkText}>{t('Zarejestruj sie')}</Text>
              </Link>
            </View>
          </View>
        </View>

        {/* Informacja o prywatności */}
        <View style={styles.privacyContainer}>
          <Text style={styles.privacyText}>
            {t('Logujac sie akceptujesz')}{' '}
            <Link href="/privacy" style={styles.privacyLink}>
              <Text style={styles.privacyLinkText}>{t('Warunki korzystania')}</Text>
            </Link>{' '}
            {t('i')}{' '}
            <Link href="/privacy" style={styles.privacyLink}>
              <Text style={styles.privacyLinkText}>{t('Polityke prywatnosci')}</Text>
            </Link>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: theme.colors.accent,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.muted,
  },
  form: {
    marginBottom: theme.spacing.xl,
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  textInput: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
  },
  passwordField: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 44,
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  signInButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  signInButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.card,
  },
  disabledButton: {
    opacity: 0.5,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.xl,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  separatorText: {
    marginHorizontal: theme.spacing.md,
    fontSize: theme.fontSize.sm,
    color: theme.colors.muted,
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  googleButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  biometricButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  biometricButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  biometricHint: {
    marginTop: theme.spacing.sm,
    fontSize: theme.fontSize.sm,
    color: theme.colors.muted,
    textAlign: 'center',
  },
  linksContainer: {
    marginTop: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  link: {
    alignSelf: 'center',
  },
  linkText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.accent,
    fontWeight: '700',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.muted,
  },
  signupLink: {
    marginLeft: theme.spacing.xs,
  },
  signupLinkText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.accent,
    fontWeight: '700',
  },
  privacyContainer: {
    marginTop: 'auto',
    paddingTop: theme.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  privacyText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  privacyLink: {
    display: 'flex',
  },
  privacyLinkText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.accent,
    fontWeight: '700',
  },
});