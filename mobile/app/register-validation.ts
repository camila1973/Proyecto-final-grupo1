export interface RegisterFields {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export function validatePassword(password: string): string | undefined {
  if (!password) return 'La contraseña es requerida';
  if (password.length < 8) return 'La contraseña debe tener mínimo 8 caracteres';
  if (password.length > 16) return 'La contraseña debe tener máximo 16 caracteres';
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  if (!hasLetter || !hasDigit || !hasSpecial) {
    return 'La contraseña debe incluir letras, números y caracteres especiales';
  }
  return undefined;
}

export function validateEmail(email: string): string | undefined {
  if (!email.trim()) return 'El correo electrónico es requerido';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Formato de correo inválido';
  return undefined;
}

export function validateRegisterFields(fields: RegisterFields): RegisterErrors {
  const errors: RegisterErrors = {};

  if (!fields.firstName.trim()) errors.firstName = 'El nombre es requerido';
  if (!fields.lastName.trim()) errors.lastName = 'El apellido es requerido';

  const emailError = validateEmail(fields.email);
  if (emailError) errors.email = emailError;

  const passwordError = validatePassword(fields.password);
  if (passwordError) errors.password = passwordError;

  if (!fields.confirmPassword) {
    errors.confirmPassword = 'Confirma tu contraseña';
  } else if (fields.password !== fields.confirmPassword) {
    errors.confirmPassword = 'Las contraseñas no coinciden';
  }

  return errors;
}

export function hasErrors(errors: RegisterErrors): boolean {
  return Object.keys(errors).length > 0;
}
