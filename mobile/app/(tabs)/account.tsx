import { useState } from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Text, TextInput, Button, HelperText, TouchableRipple, Icon , useTheme } from 'react-native-paper';
import { AppHeader } from '@/components/ui/app-header';
import { AppCard } from '@/components/ui/app-card';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { AuthApiError } from '@/services/auth-api';

export default function AccountScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { user, login, logout } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setApiError(null);
    const emailMissing = !email.trim();
    const passwordMissing = !password;
    setEmailError(emailMissing ? t('account.errorEmailRequired') : null);
    setPasswordError(passwordMissing ? t('account.errorPasswordRequired') : null);
    if (emailMissing || passwordMissing) return;
    setLoading(true);
    try {
      const result = await login(email.trim().toLowerCase(), password);
      router.push(`/login-mfa?challengeId=${result.challengeId}&email=${encodeURIComponent(result.email)}`);
    } catch (err) {
      if (err instanceof AuthApiError && err.status === 401) {
        setApiError(t('account.errorInvalidCredentials'));
      } else {
        setApiError(t('account.errorGeneric'));
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#f8f9ff' }]} edges={[]}>
      <AppHeader title={t('account.title')} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppCard style={styles.card}>
          {user ? (
            <>
              <Text variant="headlineSmall" style={[styles.heading, { color: theme.colors.onBackground }]}>
                {t('account.greeting', { name: user.email.split('@')[0] })}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 24 }}>
                {user.email}
              </Text>
              <Button
                mode="outlined"
                onPress={logout}
                textColor={theme.colors.error}
                contentStyle={styles.btnContent}
                style={[styles.btn, { borderColor: theme.colors.error }]}
                testID="btn-signout"
              >
                {t('account.signout')}
              </Button>
            </>
          ) : (
            <>
              <Text variant="headlineSmall" style={[styles.heading, { color: theme.colors.onBackground }]}>
                {t('account.heading')}
              </Text>

              <View style={styles.field}>
                <TextInput
                  label={t('account.email')}
                  value={email}
                  onChangeText={v => { setEmail(v); setEmailError(null); }}
                  mode="outlined"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  left={<TextInput.Icon icon="email-outline" />}
                  style={styles.input}
                  error={!!emailError}
                  testID="input-email"
                />
                {emailError ? <HelperText type="error" visible>{emailError}</HelperText> : null}
              </View>

              <View style={styles.field}>
                <TextInput
                  label={t('account.password')}
                  value={password}
                  onChangeText={v => { setPassword(v); setPasswordError(null); }}
                  mode="outlined"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  left={<TextInput.Icon icon="lock-outline" />}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      onPress={() => setShowPassword(v => !v)}
                    />
                  }
                  style={styles.input}
                  error={!!passwordError}
                  testID="input-password"
                />
                {passwordError ? <HelperText type="error" visible>{passwordError}</HelperText> : null}
              </View>

              {apiError ? (
                <HelperText type="error" visible style={styles.apiError}>{apiError}</HelperText>
              ) : null}

              <Button
                mode="contained"
                onPress={handleSignIn}
                loading={loading}
                disabled={loading}
                buttonColor={theme.colors.secondary}
                textColor={theme.colors.onSecondary}
                contentStyle={styles.btnContent}
                style={styles.btn}
                testID="btn-signin"
              >
                {t('account.signin')}
              </Button>

              <Button
                mode="contained"
                onPress={() => router.push('/register')}
                buttonColor={theme.colors.primary}
                textColor={theme.colors.onPrimary}
                contentStyle={styles.btnContent}
                style={styles.btn}
                testID="btn-signup"
              >
                {t('account.signup')}
              </Button>
            </>
          )}
          </AppCard>

          <View style={styles.spacer} />

          {[
            { icon: 'cog-outline', labelKey: 'account.settings', onPress: () => router.push('/settings') },
            { icon: 'shield-outline', labelKey: 'account.privacy', onPress: () => {} },
            { icon: 'file-document-outline', labelKey: 'account.terms', onPress: () => {} },
          ].map(({ icon, labelKey, onPress }) => (
            <TouchableRipple key={labelKey} onPress={onPress} borderless style={styles.outlinedItem}>
              <View style={styles.outlinedInner}>
                <Icon source={icon} size={20} color="#6e6e6e" />
                <Text style={styles.outlinedLabel}>{t(labelKey)}</Text>
                <Icon source="chevron-right" size={20} color="#6e6e6e" />
              </View>
            </TouchableRipple>
          ))}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 16, flexGrow: 1 },
  card: { padding: 24 },
  heading: { fontWeight: '700', marginBottom: 16 },
  apiError: { marginBottom: 8, fontSize: 14 },
  field: { marginBottom: 12 },
  input: { backgroundColor: '#fff' },
  btnContent: { paddingVertical: 6 },
  btn: { borderRadius: 10, marginBottom: 12 },
  spacer: { height: 48 },
  outlinedItem: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
  },
  outlinedInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  outlinedLabel: {
    flex: 1,
    color: '#6e6e6e',
    fontSize: 14,
    fontWeight: '500',
  },
});
