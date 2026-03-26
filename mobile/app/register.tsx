import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

interface FormValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  acceptTerms?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.firstName.trim()) {
    errors.firstName = 'El nombre es requerido';
  }

  if (!values.lastName.trim()) {
    errors.lastName = 'Los apellidos son requeridos';
  }

  if (!values.email.trim()) {
    errors.email = 'El correo electrónico es requerido';
  } else if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = 'El formato del correo no es válido';
  }

  if (!values.password) {
    errors.password = 'La contraseña es requerida';
  } else if (values.password.length < 8) {
    errors.password = 'La contraseña debe tener al menos 8 caracteres';
  } else if (values.password.length > 16) {
    errors.password = 'La contraseña no puede superar 16 caracteres';
  } else if (
    !/[a-zA-Z]/.test(values.password) ||
    !/[0-9]/.test(values.password) ||
    !/[^a-zA-Z0-9]/.test(values.password)
  ) {
    errors.password = 'La contraseña debe incluir letras, números y caracteres especiales';
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Confirma tu contraseña';
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Las contraseñas no coinciden';
  }

  if (!values.acceptTerms) {
    errors.acceptTerms = 'Debes aceptar los términos y condiciones';
  }

  return errors;
}

export default function RegisterScreen() {
  const [values, setValues] = useState<FormValues>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (field: keyof FormValues, value: string | boolean) => {
    const updated = { ...values, [field]: value };
    setValues(updated);
    if (submitted) {
      setErrors(validate(updated));
    }
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) {
      router.replace('/register-success');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoRow}>
          <Text style={styles.logoText}>
            <Text style={styles.logoTravel}>Travel</Text>
            <Text style={styles.logoHub}>Hub</Text>
          </Text>
        </View>

        <Text style={styles.title}>Registra tu usuario</Text>

        {/* First name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Nombre completo</Text>
          <TextInput
            style={[styles.input, errors.firstName ? styles.inputError : null]}
            placeholder="Primer y segundo nombre"
            value={values.firstName}
            onChangeText={(v) => handleChange('firstName', v)}
            autoCapitalize="words"
            accessibilityLabel="Nombre completo"
          />
          {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}
        </View>

        {/* Last name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Apellidos</Text>
          <TextInput
            style={[styles.input, errors.lastName ? styles.inputError : null]}
            placeholder="Primer y segundo apellido"
            value={values.lastName}
            onChangeText={(v) => handleChange('lastName', v)}
            autoCapitalize="words"
            accessibilityLabel="Apellidos"
          />
          {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}
        </View>

        {/* Email */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, errors.email ? styles.inputError : null]}
            placeholder="micorreo@example.com"
            value={values.email}
            onChangeText={(v) => handleChange('email', v)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            accessibilityLabel="Email"
          />
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
        </View>

        {/* Password */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Contraseña</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.inputFlex, errors.password ? styles.inputError : null]}
              secureTextEntry={!showPassword}
              value={values.password}
              onChangeText={(v) => handleChange('password', v)}
              autoCapitalize="none"
              accessibilityLabel="Contraseña"
            />
            <Pressable
              onPress={() => setShowPassword((v) => !v)}
              style={styles.eyeButton}
              accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
            </Pressable>
          </View>
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
        </View>

        {/* Confirm password */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Confirma tu Contraseña</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.inputFlex, errors.confirmPassword ? styles.inputError : null]}
              secureTextEntry={!showConfirmPassword}
              value={values.confirmPassword}
              onChangeText={(v) => handleChange('confirmPassword', v)}
              autoCapitalize="none"
              accessibilityLabel="Confirma tu Contraseña"
            />
            <Pressable
              onPress={() => setShowConfirmPassword((v) => !v)}
              style={styles.eyeButton}
              accessibilityLabel={showConfirmPassword ? 'Ocultar confirmación' : 'Mostrar confirmación'}
            >
              <Text style={styles.eyeIcon}>{showConfirmPassword ? '🙈' : '👁️'}</Text>
            </Pressable>
          </View>
          {errors.confirmPassword ? (
            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
          ) : null}
        </View>

        {/* Terms */}
        <Pressable
          style={styles.termsRow}
          onPress={() => handleChange('acceptTerms', !values.acceptTerms)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: values.acceptTerms }}
          accessibilityLabel="Acepto los términos y condiciones"
        >
          <View style={[styles.checkbox, values.acceptTerms && styles.checkboxChecked]}>
            {values.acceptTerms && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.termsText}>
            Acepto los{' '}
            <Text style={styles.termsLink}>Términos y condiciones</Text> y la{' '}
            <Text style={styles.termsLink}>Política de privacidad</Text> de TravelHub.
          </Text>
        </Pressable>
        {errors.acceptTerms ? (
          <Text style={[styles.errorText, styles.termsError]}>{errors.acceptTerms}</Text>
        ) : null}

        {/* Actions */}
        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                Alert.alert('Iniciar sesión', 'Pantalla de inicio de sesión próximamente.');
              }
            }}
          >
            <Text style={styles.buttonSecondaryText}>Iniciar sesión</Text>
          </Pressable>

          <Pressable style={[styles.button, styles.buttonPrimary]} onPress={handleSubmit}>
            <Text style={styles.buttonPrimaryText}>Crear Usuario</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const BRAND_BLUE = '#2d3e6b';

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f5f5f5' },
  container: {
    padding: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  logo: {
    width: 140,
    height: 40,
    marginBottom: 16,
  },
  logoRow: {
    marginBottom: 16,
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
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 20,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#ebebeb',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  inputError: {
    borderBottomColor: '#e53e3e',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ebebeb',
    borderRadius: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  inputFlex: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111',
    backgroundColor: 'transparent',
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  eyeIcon: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 11,
    color: '#e53e3e',
    marginTop: 2,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
    marginTop: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: '#aaa',
    borderRadius: 3,
    marginRight: 8,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: BRAND_BLUE,
    borderColor: BRAND_BLUE,
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 14,
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: '#555',
    lineHeight: 18,
  },
  termsLink: {
    color: BRAND_BLUE,
    textDecorationLine: 'underline',
  },
  termsError: {
    marginLeft: 26,
    marginBottom: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: BRAND_BLUE,
  },
  buttonPrimaryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  buttonSecondary: {
    backgroundColor: '#555',
  },
  buttonSecondaryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
