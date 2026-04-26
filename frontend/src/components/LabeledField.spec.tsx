import { render, screen } from '@testing-library/react';
import LabeledField from './LabeledField';

function renderField(props: Partial<React.ComponentProps<typeof LabeledField>> & { label?: string } = {}) {
  return render(<LabeledField label="Email" {...props} />);
}

describe('LabeledField', () => {
  describe('label rendering', () => {
    it('renders the label text', () => {
      renderField({ label: 'Correo electrónico' });
      expect(screen.getByText('Correo electrónico')).toBeInTheDocument();
    });

    it('renders a label element by default', () => {
      renderField({ label: 'Email' });
      expect(screen.getByText('Email').tagName).toBe('LABEL');
    });

    it('renders a label element with compact prop', () => {
      renderField({ label: 'Destino', compact: true });
      expect(screen.getByText('Destino').tagName).toBe('LABEL');
    });

    it('renders a label element with uppercase prop', () => {
      renderField({ label: 'Nombre', uppercase: true });
      expect(screen.getByText('Nombre').tagName).toBe('LABEL');
    });
  });

  describe('input rendering', () => {
    it('renders a TextField (input) by default', () => {
      renderField();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('renders children instead of TextField when provided', () => {
      render(
        <LabeledField label="Custom">
          <button>custom child</button>
        </LabeledField>,
      );
      expect(screen.getByRole('button', { name: 'custom child' })).toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
  });

  describe('TextField prop forwarding', () => {
    it('forwards placeholder to the input', () => {
      renderField({ placeholder: 'user@example.com' });
      expect(screen.getByPlaceholderText('user@example.com')).toBeInTheDocument();
    });

    it('forwards type to the input', () => {
      renderField({ type: 'email' });
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
    });

    it('renders helperText when provided', () => {
      renderField({ helperText: 'Campo requerido' });
      expect(screen.getByText('Campo requerido')).toBeInTheDocument();
    });

    it('applies error styling when error is true', () => {
      renderField({ error: true, helperText: 'Error message' });
      const helper = screen.getByText('Error message');
      expect(helper).toBeInTheDocument();
    });
  });

  describe('wrapper', () => {
    it('applies wrapperClassName to the outer div', () => {
      const { container } = renderField({ wrapperClassName: 'mb-4 test-class' });
      expect(container.firstChild).toHaveClass('mb-4', 'test-class');
    });

    it('renders without wrapperClassName when not provided', () => {
      const { container } = renderField();
      expect(container.firstChild).not.toHaveClass('mb-4');
    });
  });
});
