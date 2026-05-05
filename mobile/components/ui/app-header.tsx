import { Appbar, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';

type Props = {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
};

export function AppHeader({ title, showBack, onBack, right }: Props) {
  const theme = useTheme();
  const router = useRouter();
  return (
    <Appbar.Header
      style={{ backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}
    >
      {showBack && <Appbar.BackAction onPress={onBack ?? (() => router.back())} />}
      <Appbar.Content title={title} style={{ alignItems: 'center' }} />
      {right}
    </Appbar.Header>
  );
}
