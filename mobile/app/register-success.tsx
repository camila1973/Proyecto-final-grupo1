import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

export default function RegisterSuccessScreen() {
  const handleExplore = () => {
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoRow}>
        <Text style={styles.logoText}>
          <Text style={styles.logoTravel}>Travel</Text>
          <Text style={styles.logoHub}>Hub</Text>
        </Text>
      </View>

      <View style={styles.card}>
        {/* Green check circle */}
        <View style={styles.iconCircle}>
          <Text style={styles.checkmark}>✓</Text>
        </View>

        <Text style={styles.title}>Tu cuenta ha sido creada exitosamente</Text>

        <Text style={styles.subtitle}>
          Ya eres parte de TravelHub. Tu próxima aventura comienza aquí.
        </Text>

        <Pressable style={styles.button} onPress={handleExplore}>
          <Text style={styles.buttonText}>Explorar destinos</Text>
        </Pressable>
      </View>
    </View>
  );
}

const BRAND_BLUE = '#2d3e6b';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    width: 140,
    height: 40,
    marginBottom: 32,
  },
  logoRow: {
    marginBottom: 32,
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  logoTravel: {
    color: '#111',
  },
  logoHub: {
    color: BRAND_BLUE,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  checkmark: {
    color: '#166534',
    fontSize: 32,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  button: {
    backgroundColor: BRAND_BLUE,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
