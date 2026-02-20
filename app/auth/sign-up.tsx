// =====================================================
// Ekran rejestracji
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

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Walidacja formularza
  const validateForm = () => {
    if (!email.trim()) {
      Alert.alert('Błąd', 'Podaj adres email');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Błąd', 'Podaj poprawny adres email');
      return false;
    }

    if (!password.trim()) {
      Alert.alert('Błąd', 'Podaj hasło');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Błąd', 'Hasło musi mieć co najmniej 6 znaków');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Błąd', 'Hasła nie są identyczne');
      return false;
    }

    return true;
  };

  // Rejestracja przez email i hasło
  const handleSignUp = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) throw error;

      // Gdy "Enable email confirmations" jest wyłączone w Supabase Dashboard,
      // signUp od razu zwraca aktywną sesję – przechodzimy do aplikacji.
      if (data.session) {
        router.replace('/(tabs)');
        return;
      }

      // Fallback: próba bezpośredniego logowania tymi samymi danymi
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (signInError) throw signInError;

      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Błąd rejestracji:', error);
      Alert.alert(
        'Błąd rejestracji',
        error.message || 'Nie udało się utworzyć konta. Spróbuj ponownie.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Rejestracja przez Google
  const handleGoogleSignUp = async () => {
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
      console.error('Błąd rejestracji przez Google:', error);
      Alert.alert('Błąd', 'Nie udało się zarejestrować przez Google');
    } finally {
      setIsGoogleLoading(false);
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
          <Text style={styles.title}>TimeTracker</Text>
          <Text style={styles.subtitle}>Utwórz nowe konto</Text>
        </View>

        {/* Formularz rejestracji */}
        <View style={styles.form}>
          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={setEmail}
              placeholder="twój@email.com"
              placeholderTextColor={theme.colors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Hasło */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Hasło</Text>
            <TextInput
              style={styles.textInput}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={theme.colors.muted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.passwordHint}>
              Minimum 6 znaków
            </Text>
          </View>

          {/* Potwierdzenie hasła */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Potwierdź hasło</Text>
            <TextInput
              style={styles.textInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              placeholderTextColor={theme.colors.muted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Przycisk rejestracji */}
          <TouchableOpacity
            style={[styles.signUpButton, isLoading && styles.disabledButton]}
            onPress={handleSignUp}
            disabled={isLoading}
          >
            {isLoading ? (
              <Text style={styles.signUpButtonText}>Rejestracja...</Text>
            ) : (
              <Text style={styles.signUpButtonText}>Zarejestruj się</Text>
            )}
          </TouchableOpacity>

          {/* Separator */}
          <View style={styles.separator}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>lub</Text>
            <View style={styles.separatorLine} />
          </View>

          {/* Google Sign Up */}
          <TouchableOpacity
            style={[styles.googleButton, isGoogleLoading && styles.disabledButton]}
            onPress={handleGoogleSignUp}
            disabled={isGoogleLoading}
          >
            <Ionicons name="logo-google" size={20} color={theme.colors.dark} />
            <Text style={styles.googleButtonText}>
              {isGoogleLoading ? 'Łączenie...' : 'Kontynuuj przez Google'}
            </Text>
          </TouchableOpacity>

          {/* Link do logowania */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Masz już konto? </Text>
            <Link href="/auth/sign-in" style={styles.loginLink}>
              <Text style={styles.loginLinkText}>Zaloguj się</Text>
            </Link>
          </View>
        </View>

        {/* Informacja o prywatności */}
        <View style={styles.privacyContainer}>
          <Text style={styles.privacyText}>
            Rejestrując się akceptujesz{' '}
            <Link href="/privacy" style={styles.privacyLink}>
              <Text style={styles.privacyLinkText}>Warunki korzystania</Text>
            </Link>{' '}
            i{' '}
            <Link href="/privacy" style={styles.privacyLink}>
              <Text style={styles.privacyLinkText}>Politykę prywatności</Text>
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
  passwordHint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.muted,
    marginTop: theme.spacing.xs,
  },
  signUpButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  signUpButtonText: {
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