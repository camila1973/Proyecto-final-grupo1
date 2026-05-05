import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, HelperText, Checkbox , useTheme } from 'react-native-paper';
import { AppHeader } from '@/components/ui/app-header';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppCard } from '@/components/ui/app-card';
import { validateRegisterFields, hasErrors } from '@/utils/register-validation';
import type { RegisterFields, RegisterErrors } from '@/utils/register-validation';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export default function RegisterScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();

  const [fields, setFields] = useState<RegisterFields>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<RegisterErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const update = (field: keyof RegisterFields) => (value: string) => {
    setFields(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async () => {
    setApiError(null);
    const validationErrors = validateRegisterFields(fields);
    if (hasErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: fields.email.trim().toLowerCase(),
          password: fields.password,
          firstName: fields.firstName.trim(),
          lastName: fields.lastName.trim(),
        }),
      });

      if (response.status === 409) {
        setApiError(t('register.errorEmailTaken'));
        return;
      }
      if (!response.ok) {
        setApiError(t('register.errorGeneric'));
        return;
      }

      router.replace('/register-success');
    } catch {
      setApiError(t('register.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#f8f9ff' }]} edges={['bottom']}>
      <AppHeader title={t('register.title')} showBack />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppCard style={styles.card}>

          <Text variant="headlineSmall" style={[styles.heading, { color: theme.colors.onBackground }]}>
            {t('register.heading')}
          </Text>

          {apiError ? (
            <HelperText type="error" visible style={styles.apiError}>{apiError}</HelperText>
          ) : null}

          <View style={styles.field}>
            <TextInput
              label={t('register.firstName')}
              value={fields.firstName}
              onChangeText={update('firstName')}
              mode="outlined"
              autoCapitalize="words"
              left={<TextInput.Icon icon="account-outline" />}
              style={styles.input}
              error={!!errors.firstName}
              testID="input-firstName"
            />
            {errors.firstName ? <HelperText type="error" visible>{errors.firstName}</HelperText> : null}
          </View>

          <View style={styles.field}>
            <TextInput
              label={t('register.lastName')}
              value={fields.lastName}
              onChangeText={update('lastName')}
              mode="outlined"
              autoCapitalize="words"
              left={<TextInput.Icon icon="account-outline" />}
              style={styles.input}
              error={!!errors.lastName}
              testID="input-lastName"
            />
            {errors.lastName ? <HelperText type="error" visible>{errors.lastName}</HelperText> : null}
          </View>

          <View style={styles.field}>
            <TextInput
              label={t('register.email')}
              value={fields.email}
              onChangeText={update('email')}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              left={<TextInput.Icon icon="email-outline" />}
              style={styles.input}
              error={!!errors.email}
              testID="input-email"
            />
            {errors.email ? <HelperText type="error" visible>{errors.email}</HelperText> : null}
          </View>

          <View style={styles.field}>
            <TextInput
              label={t('register.password')}
              value={fields.password}
              onChangeText={update('password')}
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
              error={!!errors.password}
              testID="input-password"
            />
            {errors.password ? <HelperText type="error" visible>{errors.password}</HelperText> : null}
          </View>

          <View style={styles.field}>
            <TextInput
              label={t('register.confirmPassword')}
              value={fields.confirmPassword}
              onChangeText={update('confirmPassword')}
              mode="outlined"
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
              autoCorrect={false}
              left={<TextInput.Icon icon="lock-check-outline" />}
              right={
                <TextInput.Icon
                  icon={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  onPress={() => setShowConfirm(v => !v)}
                />
              }
              style={styles.input}
              error={!!errors.confirmPassword}
              testID="input-confirmPassword"
            />
            {errors.confirmPassword ? <HelperText type="error" visible>{errors.confirmPassword}</HelperText> : null}
          </View>

          <View style={styles.checkboxRow}>
            <Checkbox.Android
              status={accepted ? 'checked' : 'unchecked'}
              onPress={() => setAccepted(v => !v)}
              color={theme.colors.primary}
              uncheckedColor="#9ca3af"
            />
            <Text variant="bodySmall" style={[styles.checkboxLabel, { color: theme.colors.onSurfaceVariant }]}>
              {t('register.acceptTerms')}
              <Text variant="bodySmall" style={{ color: theme.colors.primary, textDecorationLine: 'underline' }}>
                {t('register.termsLink')}
              </Text>
              {t('register.andThe')}
              <Text variant="bodySmall" style={{ color: theme.colors.primary, textDecorationLine: 'underline' }}>
                {t('register.privacyLink')}
              </Text>
              {t('register.ofTravelHub')}
            </Text>
          </View>

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || !accepted}
            buttonColor={theme.colors.primary}
            textColor={theme.colors.onPrimary}
            contentStyle={styles.btnContent}
            style={styles.btn}
            testID="btn-submit"
          >
            {t('register.submit')}
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
  heading: { fontWeight: '700', marginBottom: 20 },
  apiError: { marginBottom: 8, fontSize: 14 },
  field: { marginBottom: 20 },
  input: { backgroundColor: '#fff' },
  btnContent: { paddingVertical: 6 },
  btn: { borderRadius: 10, marginBottom: 12 },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24 },
  checkboxLabel: { flex: 1, paddingTop: 6, lineHeight: 20 },
  loginHint: { textAlign: 'center', marginTop: 4 },
});
