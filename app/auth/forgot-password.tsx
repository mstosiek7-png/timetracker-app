// =====================================================
// Ekran przypomnienia hasła
// =====================================================

import React, { useState } from 'react';
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

import { theme } from '../../constants/theme';
import { supabase } from '../../services/supabase';
import { useI18n } from '../../i18n/I18nProvider';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const { t } = useI18n();

  // Wysłanie linku resetującego hasło
  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert(t('Blad'), t('Podaj adres email'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert(t('Blad'), t('Podaj poprawny adres email'));
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${process.env.EXPO_PUBLIC_APP_SCHEME}://auth/reset-password`,
      });

      if (error) throw error;

      setIsEmailSent(true);
    } catch (error: any) {
      console.error('Błąd resetowania hasła:', error);
      Alert.alert(
        t('Blad'),
        error.message || t('Nie udalo sie wyslac linku resetujacego. Sprobuj ponownie.')
      );
    } finally {
      setIsLoading(false);
    }
  };

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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.dark} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('Zapomniales hasla?')}</Text>
          <Text style={styles.subtitle}>{t('Podaj email aby odzyskac dostep')}</Text>
        </View>

        {/* Formularz */}
        <View style={styles.form}>
          {!isEmailSent ? (
            <>
              {/* Instrukcja */}
              <View style={styles.instructionContainer}>
                <Ionicons name="key-outline" size={48} color={theme.colors.accent} style={styles.icon} />
                <Text style={styles.instructionText}>
                  {t('Podaj adres email powiazany z Twoim kontem. Wyslemy Ci link do zresetowania hasla.')}
                </Text>
              </View>

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

              {/* Przycisk wysłania */}
              <TouchableOpacity
                style={[styles.resetButton, isLoading && styles.disabledButton]}
                onPress={handleResetPassword}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Text style={styles.resetButtonText}>{t('Wysylanie...')}</Text>
                ) : (
                  <Text style={styles.resetButtonText}>{t('Wyslij link resetujacy')}</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            // Komunikat sukcesu
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle-outline" size={64} color={theme.colors.success} style={styles.icon} />
              <Text style={styles.successTitle}>{t('Sprawdz swoja skrzynke')}</Text>
              <Text style={styles.successText}>
                {t('Link resetujacy haslo zostal wyslany na adres')}{'\n'}
                <Text style={styles.emailHighlight}>{email}</Text>
              </Text>
              <Text style={styles.instructionText}>
                {t('Kliknij link w wiadomosci, aby ustawic nowe haslo. Jesli nie widzisz emaila, sprawdz folder spam.')}
              </Text>
              
              <TouchableOpacity
                style={styles.checkEmailButton}
                onPress={() => {
                  // Tu można dodać logikę otwierania aplikacji mailowej
                  Alert.alert(t('Info'), t('Otworz swoja aplikacje mailowa i sprawdz wiadomosc.'));
                }}
              >
                <Ionicons name="mail-outline" size={20} color={theme.colors.card} />
                <Text style={styles.checkEmailButtonText}>{t('Otworz email')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backToLoginButton}
                onPress={() => router.replace('/auth/sign-in')}
              >
                <Text style={styles.backToLoginButtonText}>{t('Wroc do logowania')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Link powrotu do logowania */}
          {!isEmailSent && (
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>{t('Pamietasz haslo?')} </Text>
              <Link href="/auth/sign-in" style={styles.loginLink}>
                <Text style={styles.loginLinkText}>{t('Zaloguj sie')}</Text>
              </Link>
            </View>
          )}
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
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    marginBottom: theme.spacing.xxl,
  },
  backButton: {
    marginBottom: theme.spacing.lg,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.muted,
  },
  form: {
    marginBottom: theme.spacing.xl,
  },
  instructionContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  icon: {
    marginBottom: theme.spacing.md,
  },
  instructionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: theme.spacing.xl,
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
  resetButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  resetButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.card,
  },
  disabledButton: {
    opacity: 0.5,
  },
  successContainer: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.successLight,
    marginBottom: theme.spacing.xl,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.success,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  successText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
  },
  emailHighlight: {
    fontWeight: '700',
    color: theme.colors.dark,
  },
  checkEmailButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    width: '100%',
  },
  checkEmailButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.card,
  },
  backToLoginButton: {
    padding: theme.spacing.md,
    alignItems: 'center',
    width: '100%',
  },
  backToLoginButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.accent,
    fontWeight: '700',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  loginText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.muted,
  },
  loginLink: {
    marginLeft: theme.spacing.xs,
  },
  loginLinkText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.accent,
    fontWeight: '700',
  },
});