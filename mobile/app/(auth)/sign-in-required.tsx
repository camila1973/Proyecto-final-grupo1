import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { Button, Divider, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '@/components/ui/app-header';
import { AppCard } from '@/components/ui/app-card';
import { LoginForm } from '@/components/auth/login-form';

export default function SignInRequiredScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#f8f9ff' }]} edges={['bottom']}>
      <AppHeader title={t('signInRequired.title')} showBack />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppCard style={styles.card}>
            <Text variant="headlineSmall" style={[styles.heading, { color: theme.colors.onBackground }]}>
              {t('signInRequired.heading')}
            </Text>
            <Text variant="bodyMedium" style={[styles.subheading, { color: theme.colors.onSurfaceVariant }]}>
              {t('signInRequired.subheading')}
            </Text>

            <LoginForm />

            <Divider style={styles.divider} />

            <Text variant="bodyMedium" style={[styles.noAccount, { color: theme.colors.onSurfaceVariant }]}>
              {t('signInRequired.noAccount')}
            </Text>
            <Button
              mode="contained"
              onPress={() => router.push('/register')}
              textColor={theme.colors.onPrimary}
              contentStyle={styles.btnContent}
              style={[styles.btn, { borderColor: theme.colors.primary }]}
              testID="btn-create-account"
            >
              {t('signInRequired.createAccount')}
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
  divider: { marginVertical: 20 },
  noAccount: { textAlign: 'center', marginBottom: 12 },
  btnContent: { paddingVertical: 6 },
  btn: { borderRadius: 10 },
});
