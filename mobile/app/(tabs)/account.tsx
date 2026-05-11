import { StyleSheet, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Text, Button, TouchableRipple, Icon , useTheme } from 'react-native-paper';
import { AppHeader } from '@/components/ui/app-header';
import { AppCard } from '@/components/ui/app-card';
import { LoginForm } from '@/components/auth/login-form';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

export default function AccountScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { user, logout } = useAuth();

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

              <LoginForm />

              <Button
                mode="contained"
                onPress={() => router.push('/register')}
                buttonColor={theme.colors.primary}
                textColor={theme.colors.onPrimary}
                contentStyle={styles.btnContent}
                style={[styles.btn, styles.signupBtn]}
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
  btnContent: { paddingVertical: 6 },
  btn: { borderRadius: 10, marginBottom: 12 },
  signupBtn: { marginTop: 12 },
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
