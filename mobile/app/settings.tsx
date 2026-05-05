import { StyleSheet, View } from 'react-native';
import { List, Divider, Portal, Modal, Text, TouchableRipple , useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/ui/app-header';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n, { saveLanguage } from '@/i18n';
import { AppCard } from '@/components/ui/app-card';

const LANGUAGES = [
  { label: 'Español', value: 'es' },
  { label: 'English', value: 'en' },
];

const CURRENCIES = [
  { label: 'USD — Dólar estadounidense', value: 'USD' },
  { label: 'EUR — Euro', value: 'EUR' },
  { label: 'COP — Peso colombiano', value: 'COP' },
  { label: 'MXN — Peso mexicano', value: 'MXN' },
];

const COUNTRIES = [
  { label: 'México', value: 'MX' },
  { label: 'Estados Unidos', value: 'US' },
  { label: 'Colombia', value: 'CO' },
  { label: 'España', value: 'ES' },
  { label: 'Argentina', value: 'AR' },
];

type PickerConfig = {
  title: string;
  options: { label: string; value: string }[];
  selected: string;
  onSelect: (value: string) => void;
};

export default function SettingsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();

  const [language, setLanguage] = useState(i18n.language.split('-')[0] ?? 'es');

  function handleLanguageSelect(value: string) {
    setLanguage(value);
    i18n.changeLanguage(value);
    saveLanguage(value);
  }
  const [currency, setCurrency] = useState('MXN');
  const [country, setCountry] = useState('MX');
  const [picker, setPicker] = useState<PickerConfig | null>(null);

  function openPicker(config: PickerConfig) {
    setPicker(config);
  }

  function closePicker() {
    setPicker(null);
  }

  const langLabel = LANGUAGES.find(l => l.value === language)?.label ?? '';
  const currLabel = CURRENCIES.find(c => c.value === currency)?.label ?? '';
  const countryLabel = COUNTRIES.find(c => c.value === country)?.label ?? '';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#f8f9ff' }]} edges={['bottom']}>
      <AppHeader title={t('settings.title')} showBack />

      <AppCard style={styles.card}>
      <List.Section style={{ marginBottom: 0 }}>
        <List.Subheader>{t('settings.regional')}</List.Subheader>
        <List.Item
          title={t('settings.language')}
          description={langLabel}
          left={props => <List.Icon {...props} icon="translate" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => openPicker({ title: t('settings.language'), options: LANGUAGES, selected: language, onSelect: handleLanguageSelect })}
        />
        <Divider />
        <List.Item
          title={t('settings.currency')}
          description={currLabel}
          left={props => <List.Icon {...props} icon="currency-usd" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => openPicker({ title: t('settings.currency'), options: CURRENCIES, selected: currency, onSelect: setCurrency })}
        />
        <Divider />
        <List.Item
          title={t('settings.country')}
          description={countryLabel}
          left={props => <List.Icon {...props} icon="earth" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => openPicker({ title: t('settings.country'), options: COUNTRIES, selected: country, onSelect: setCountry })}
        />
      </List.Section>
      </AppCard>

      <Portal>
        <Modal
          visible={!!picker}
          onDismiss={closePicker}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          {picker && (
            <>
              <Text variant="titleMedium" style={styles.modalTitle}>{picker.title}</Text>
              {picker.options.map((opt, i) => (
                <View key={opt.value}>
                  {i > 0 && <Divider />}
                  <TouchableRipple
                    onPress={() => { picker.onSelect(opt.value); closePicker(); }}
                  >
                    <View style={styles.option}>
                      <Text style={[styles.optionText, { color: theme.colors.onSurface }]}>{opt.label}</Text>
                      {picker.selected === opt.value && (
                        <List.Icon icon="check" color={theme.colors.primary} />
                      )}
                    </View>
                  </TouchableRipple>
                </View>
              ))}
            </>
          )}
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  card: { margin: 16, overflow: 'hidden' },
  modal: { margin: 24, borderRadius: 16, overflow: 'hidden', paddingTop: 20 },
  modalTitle: { fontWeight: '700', paddingHorizontal: 20, marginBottom: 8 },
  option: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  optionText: { flex: 1, fontSize: 15 },
});
