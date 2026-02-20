// =====================================================
// ErrorBoundary Component - Global Error Handling
// =====================================================

import React, { Component, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // Tutaj można dodać logowanie błędów do zewnętrznego serwisu
    // np. Sentry, Firebase Crashlytics, etc.
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Text style={styles.title}>Coś poszło nie tak</Text>
          <Text style={styles.message}>
            {this.state.error?.message || 'Wystąpił nieoczekiwany błąd'}
          </Text>
          <Button 
            mode="contained" 
            onPress={this.handleReset}
            style={styles.button}
            icon="refresh"
          >
            Spróbuj ponownie
          </Button>
          <Button 
            mode="outlined" 
            onPress={() => {
              // Można dodać restart aplikacji
              console.log('Restart aplikacji');
            }}
            style={styles.button}
            icon="restart"
          >
            Restartuj aplikację
          </Button>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    marginTop: 12,
    width: '100%',
    maxWidth: 300,
  },
});

export default ErrorBoundary;