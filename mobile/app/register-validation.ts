export interface RegisterFields {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterErrors {
  fullName?: string;
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

export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const idx = fullName.trim().indexOf(' ');
  if (idx === -1) return { firstName: fullName.trim(), lastName: '' };
  return {
    firstName: fullName.slice(0, idx).trim(),
    lastName: fullName.slice(idx + 1).trim(),
  };
}

export function validateRegisterFields(fields: RegisterFields): RegisterErrors {
  const errors: RegisterErrors = {};

  if (!fields.fullName.trim()) {
    errors.fullName = 'El nombre completo es requerido';
  }

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
