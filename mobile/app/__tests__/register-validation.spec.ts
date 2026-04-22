import {
  validatePassword,
  validateEmail,
  validateRegisterFields,
  hasErrors,
} from '@/utils/register-validation';

describe('validatePassword', () => {
  it('returns error when password is empty', () => {
    expect(validatePassword('')).toBe('La contraseña es requerida');
  });

  it('returns error when password is shorter than 8 characters', () => {
    expect(validatePassword('Ab@1')).toBe('La contraseña debe tener mínimo 8 caracteres');
  });

  it('returns error when password is longer than 16 characters', () => {
    expect(validatePassword('Ab@1234567890abcd')).toBe('La contraseña debe tener máximo 16 caracteres');
  });

  it('returns error when password has no letter', () => {
    expect(validatePassword('12345@78')).toBe(
      'La contraseña debe incluir letras, números y caracteres especiales',
    );
  });

  it('returns error when password has no digit', () => {
    expect(validatePassword('Password@')).toBe(
      'La contraseña debe incluir letras, números y caracteres especiales',
    );
  });

  it('returns error when password has no special character', () => {
    expect(validatePassword('Password1')).toBe(
      'La contraseña debe incluir letras, números y caracteres especiales',
    );
  });

  it('returns undefined for a valid password', () => {
    expect(validatePassword('Pass@1234')).toBeUndefined();
  });

  it('accepts password at minimum length (8 chars)', () => {
    expect(validatePassword('Ab@12345')).toBeUndefined();
  });

  it('accepts password at maximum length (16 chars)', () => {
    expect(validatePassword('Ab@1234567890abc')).toBeUndefined();
  });
});

describe('validateEmail', () => {
  it('returns error when email is empty', () => {
    expect(validateEmail('')).toBe('El correo electrónico es requerido');
  });

  it('returns error when email has no @', () => {
    expect(validateEmail('notanemail')).toBe('Formato de correo inválido');
  });

  it('returns error when email has no domain', () => {
    expect(validateEmail('user@')).toBe('Formato de correo inválido');
  });

  it('returns error when email has no TLD', () => {
    expect(validateEmail('user@domain')).toBe('Formato de correo inválido');
  });

  it('returns undefined for a valid email', () => {
    expect(validateEmail('user@example.com')).toBeUndefined();
  });

  it('trims whitespace before validating', () => {
    expect(validateEmail('  ')).toBe('El correo electrónico es requerido');
  });
});

describe('validateRegisterFields', () => {
  const validFields = {
    firstName: 'Juan',
    lastName: 'García',
    email: 'juan@example.com',
    password: 'Pass@1234',
    confirmPassword: 'Pass@1234',
  };

  it('returns no errors for valid fields', () => {
    expect(validateRegisterFields(validFields)).toEqual({});
  });

  it('returns firstName error when empty', () => {
    const errors = validateRegisterFields({ ...validFields, firstName: '' });
    expect(errors.firstName).toBe('El nombre es requerido');
  });

  it('returns firstName error when only whitespace', () => {
    const errors = validateRegisterFields({ ...validFields, firstName: '   ' });
    expect(errors.firstName).toBe('El nombre es requerido');
  });

  it('returns lastName error when empty', () => {
    const errors = validateRegisterFields({ ...validFields, lastName: '' });
    expect(errors.lastName).toBe('El apellido es requerido');
  });

  it('returns email error when invalid', () => {
    const errors = validateRegisterFields({ ...validFields, email: 'bad-email' });
    expect(errors.email).toBe('Formato de correo inválido');
  });

  it('returns password error when invalid', () => {
    const errors = validateRegisterFields({ ...validFields, password: 'weak' });
    expect(errors.password).toBeDefined();
  });

  it('returns confirmPassword error when empty', () => {
    const errors = validateRegisterFields({ ...validFields, confirmPassword: '' });
    expect(errors.confirmPassword).toBe('Confirma tu contraseña');
  });

  it('returns confirmPassword mismatch error', () => {
    const errors = validateRegisterFields({ ...validFields, confirmPassword: 'Different@1' });
    expect(errors.confirmPassword).toBe('Las contraseñas no coinciden');
  });

  it('returns multiple errors when multiple fields are invalid', () => {
    const errors = validateRegisterFields({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    });
    expect(errors.firstName).toBeDefined();
    expect(errors.lastName).toBeDefined();
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
    expect(errors.confirmPassword).toBeDefined();
  });
});

describe('hasErrors', () => {
  it('returns false when errors object is empty', () => {
    expect(hasErrors({})).toBe(false);
  });

  it('returns true when there is at least one error', () => {
    expect(hasErrors({ firstName: 'El nombre es requerido' })).toBe(true);
  });

  it('returns true when there are multiple errors', () => {
    expect(
      hasErrors({
        firstName: 'El nombre es requerido',
        email: 'El correo electrónico es requerido',
      }),
    ).toBe(true);
  });
});
