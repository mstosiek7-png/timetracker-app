// =====================================================
// Ekran logowania
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

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Logowanie przez email i hasło
  const handleSignIn = async () => {
    if (!email.trim()) {
      Alert.alert('Błąd', 'Podaj adres email');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Błąd', 'Podaj hasło');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) throw error;

      // Po udanym logowaniu przekieruj do głównego ekranu
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Błąd logowania:', error);
      Alert.alert(
        'Błąd logowania',
        error.message || 'Nie udało się zalogować. Sprawdź dane.'
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
      Alert.alert('Błąd', 'Nie udało się zalogować przez Google');
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
          <Text style={styles.subtitle}>Zaloguj się do konta</Text>
        </View>

        {/* Formularz logowania */}
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
          </View>

          {/* Przycisk logowania */}
          <TouchableOpacity
            style={[styles.signInButton, isLoading && styles.disabledButton]}
            onPress={handleSignIn}
            disabled={isLoading}
          >
            {isLoading ? (
              <Text style={styles.signInButtonText}>Logowanie...</Text>
            ) : (
              <Text style={styles.signInButtonText}>Zaloguj się</Text>
            )}
          </TouchableOpacity>

          {/* Separator */}
          <View style={styles.separator}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>lub</Text>
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
              {isGoogleLoading ? 'Łączenie...' : 'Kontynuuj przez Google'}
            </Text>
          </TouchableOpacity>

          {/* Linki pomocnicze */}
          <View style={styles.linksContainer}>
            <Link href="/auth/forgot-password" style={styles.link}>
              <Text style={styles.linkText}>Zapomniałeś hasła?</Text>
            </Link>
            
            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Nie masz konta? </Text>
              <Link href="/auth/sign-up" style={styles.signupLink}>
                <Text style={styles.signupLinkText}>Zarejestruj się</Text>
              </Link>
            </View>
          </View>
        </View>

        {/* Informacja o prywatności */}
        <View style={styles.privacyContainer}>
          <Text style={styles.privacyText}>
            Logując się akceptujesz{' '}
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