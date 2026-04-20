import { useState } from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Text, Appbar, TextInput, Button, TouchableRipple, Icon , useTheme } from 'react-native-paper';
import { AppCard } from '@/components/ui/app-card';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function AccountScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#f8f9ff' }]} edges={[]}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
        <Appbar.Content title={t('account.title')} style={{ alignItems: 'center' }} />
      </Appbar.Header>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppCard style={styles.card}>
          <Text variant="headlineSmall" style={[styles.heading, { color: theme.colors.onBackground }]}>
            {t('account.heading')}
          </Text>

          <TextInput
            label={t('account.email')}
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            left={<TextInput.Icon icon="email-outline" />}
            style={styles.input}
            testID="input-email"
          />

          <TextInput
            label={t('account.password')}
            value={password}
            onChangeText={setPassword}
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
            testID="input-password"
          />

          <Button
            mode="contained"
            onPress={() => {}}
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
  input: { marginBottom: 12, backgroundColor: '#fff' },
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
