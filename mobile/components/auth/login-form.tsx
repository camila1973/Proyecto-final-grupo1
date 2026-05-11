import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, TextInput, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useBookingFlow } from '@/hooks/useBookingFlow';
import { AuthApiError } from '@/services/auth-api';

export function LoginForm() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { login } = useAuth();
  const { resumeAfterAuth } = useBookingFlow();

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
      if (result.mfaRequired) {
        router.push(`/login-mfa?challengeId=${result.challengeId}&email=${encodeURIComponent(result.email)}`);
      } else {
        resumeAfterAuth();
      }
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
    <View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 12 },
  input: { backgroundColor: '#fff' },
  apiError: { marginBottom: 8, fontSize: 14 },
  btnContent: { paddingVertical: 6 },
  btn: { borderRadius: 10 },
});
