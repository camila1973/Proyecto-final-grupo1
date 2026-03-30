import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { validateRegisterFields, hasErrors } from './register-validation';
import type { RegisterFields, RegisterErrors } from './register-validation';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const BRAND = '#2d3a8c';
const ERROR_COLOR = '#dc2626';

export default function RegisterScreen() {
  const router = useRouter();

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
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const update = (field: keyof RegisterFields) => (value: string) => {
    setFields((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
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
        }),
      });

      if (response.status === 409) {
        setApiError('Este correo ya está registrado');
        return;
      }
      if (!response.ok) {
        setApiError('Ocurrió un error. Intenta de nuevo.');
        return;
      }

      router.replace('/register-success');
    } catch {
      setApiError('Ocurrió un error. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Crea tu cuenta</Text>
      <Text style={styles.subtitle}>
        ¿Ya tienes una cuenta?{' '}
        <Text style={styles.link} onPress={() => router.push('/login')}>
          Inicia sesión aquí
        </Text>
      </Text>

      {apiError ? <Text style={styles.apiError}>{apiError}</Text> : null}

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={styles.label}>NOMBRE</Text>
          <TextInput
            style={[styles.input, errors.firstName ? styles.inputError : null]}
            value={fields.firstName}
            onChangeText={update('firstName')}
            placeholder="Nombre"
            autoCapitalize="words"
            testID="input-firstName"
          />
          {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}
        </View>
        <View style={styles.halfField}>
          <Text style={styles.label}>APELLIDO</Text>
          <TextInput
            style={[styles.input, errors.lastName ? styles.inputError : null]}
            value={fields.lastName}
            onChangeText={update('lastName')}
            placeholder="Apellido"
            autoCapitalize="words"
            testID="input-lastName"
          />
          {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>CORREO ELECTRÓNICO</Text>
        <TextInput
          style={[styles.input, errors.email ? styles.inputError : null]}
          value={fields.email}
          onChangeText={update('email')}
          placeholder="micorreo@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          testID="input-email"
        />
        {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>CONTRASEÑA</Text>
        <View style={styles.passwordWrapper}>
          <TextInput
            style={[styles.input, styles.passwordInput, errors.password ? styles.inputError : null]}
            value={fields.password}
            onChangeText={update('password')}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            testID="input-password"
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword((v) => !v)}
            testID="toggle-password"
          >
            <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        </View>
        {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>CONFIRMAR CONTRASEÑA</Text>
        <View style={styles.passwordWrapper}>
          <TextInput
            style={[styles.input, styles.passwordInput, errors.confirmPassword ? styles.inputError : null]}
            value={fields.confirmPassword}
            onChangeText={update('confirmPassword')}
            secureTextEntry={!showConfirm}
            autoCapitalize="none"
            autoCorrect={false}
            testID="input-confirmPassword"
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowConfirm((v) => !v)}
            testID="toggle-confirm"
          >
            <Text style={styles.eyeText}>{showConfirm ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        </View>
        {errors.confirmPassword ? (
          <Text style={styles.errorText}>{errors.confirmPassword}</Text>
        ) : null}
      </View>

      <TouchableOpacity
        style={[styles.button, loading ? styles.buttonDisabled : null]}
        onPress={handleSubmit}
        disabled={loading}
        testID="btn-submit"
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Crear usuario</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  content: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  link: {
    color: BRAND,
    textDecorationLine: 'underline',
  },
  apiError: {
    backgroundColor: '#fef2f2',
    color: ERROR_COLOR,
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  halfField: {
    flex: 1,
    marginBottom: 12,
  },
  field: {
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  inputError: {
    borderColor: ERROR_COLOR,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
  },
  eyeButton: {
    position: 'absolute',
    right: 10,
    padding: 4,
  },
  eyeText: {
    fontSize: 16,
  },
  errorText: {
    color: ERROR_COLOR,
    fontSize: 12,
    marginTop: 3,
  },
  button: {
    backgroundColor: BRAND,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
