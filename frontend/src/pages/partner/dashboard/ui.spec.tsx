import { render, screen } from '@testing-library/react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import { setupTestI18n } from '../../../i18n/test-utils';
import { StatusPill, SectionHeader, TH, TD } from './ui';

setupTestI18n('es');

function inTable(cell: React.ReactNode) {
  return render(
    <Table><TableBody><TableRow>{cell}</TableRow></TableBody></Table>,
  );
}

describe('StatusPill', () => {
  it('renders "Activa" chip when active', () => {
    render(<StatusPill active={true} />);
    expect(screen.getByText('Activa')).toBeInTheDocument();
  });

  it('renders "Incompleta" chip when inactive', () => {
    render(<StatusPill active={false} />);
    expect(screen.getByText('Incompleta')).toBeInTheDocument();
  });
});

describe('SectionHeader', () => {
  it('renders the title text', () => {
    render(<SectionHeader title="Mi sección" />);
    expect(screen.getByText('Mi sección')).toBeInTheDocument();
  });

  it('renders an optional action node', () => {
    render(<SectionHeader title="Sec" action={<button>Acción</button>} />);
    expect(screen.getByRole('button', { name: 'Acción' })).toBeInTheDocument();
  });

  it('renders without an action node', () => {
    expect(() => render(<SectionHeader title="Solo título" />)).not.toThrow();
  });
});

describe('TH', () => {
  it('renders children in a table cell', () => {
    inTable(<TH>Encabezado</TH>);
    expect(screen.getByText('Encabezado')).toBeInTheDocument();
  });

  it('accepts an optional width prop', () => {
    expect(() => inTable(<TH width={120}>Col</TH>)).not.toThrow();
  });
});

describe('TD', () => {
  it('renders children in a table cell', () => {
    inTable(<TD>Contenido</TD>);
    expect(screen.getByText('Contenido')).toBeInTheDocument();
  });

  it('accepts right alignment', () => {
    expect(() => inTable(<TD align="right">Val</TD>)).not.toThrow();
  });
});
