import { useState } from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, Appbar, TextInput, Button, HelperText, useTheme } from 'react-native-paper';
import { AppCard } from '@/components/ui/app-card';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { AuthApiError } from '@/services/auth-api';

export default function LoginMfaScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const auth = useAuth();
  const { challengeId, email } = useLocalSearchParams<{ challengeId: string; email: string }>();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleVerify = async () => {
    setApiError(null);
    setLoading(true);
    try {
      await auth.verifyMfa(challengeId, code.trim());
      router.replace('/(tabs)');
    } catch (err) {
      if (err instanceof AuthApiError && err.status === 401) {
        setApiError(t('loginMfa.errorInvalidCode'));
      } else {
        setApiError(t('loginMfa.errorGeneric'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#f8f9ff' }]} edges={['bottom']}>
      <Appbar.Header style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={t('loginMfa.title')} style={{ alignItems: 'center' }} />
      </Appbar.Header>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppCard style={styles.card}>
            <Text variant="headlineSmall" style={[styles.heading, { color: theme.colors.onBackground }]}>
              {t('loginMfa.heading')}
            </Text>

            <Text variant="bodyMedium" style={[styles.subheading, { color: theme.colors.onSurfaceVariant }]}>
              {t('loginMfa.subheading', { email: email ?? '' })}
            </Text>

            {apiError ? (
              <HelperText type="error" visible style={styles.apiError}>{apiError}</HelperText>
            ) : null}

            <TextInput
              label={t('loginMfa.code')}
              value={code}
              onChangeText={setCode}
              mode="outlined"
              keyboardType="number-pad"
              maxLength={6}
              autoComplete="one-time-code"
              left={<TextInput.Icon icon="shield-key-outline" />}
              style={styles.input}
              testID="input-code"
            />

            <Button
              mode="contained"
              onPress={handleVerify}
              loading={loading}
              disabled={loading || code.trim().length < 6}
              buttonColor={theme.colors.primary}
              textColor={theme.colors.onPrimary}
              contentStyle={styles.btnContent}
              style={styles.btn}
              testID="btn-verify"
            >
              {t('loginMfa.submit')}
            </Button>
          </AppCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 16, flexGrow: 1 },
  card: { padding: 24 },
  heading: { fontWeight: '700', marginBottom: 8 },
  subheading: { marginBottom: 20 },
  apiError: { marginBottom: 8, fontSize: 14 },
  input: { backgroundColor: '#fff', marginBottom: 24 },
  btnContent: { paddingVertical: 6 },
  btn: { borderRadius: 10 },
});
