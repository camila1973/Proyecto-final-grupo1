import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { setupTestI18n } from '../../../i18n/test-utils';
import ExportButtons from './ExportButtons';

setupTestI18n('es');

describe('ExportButtons', () => {
  it('renders PDF and CSV buttons', () => {
    render(<ExportButtons onDownload={jest.fn().mockResolvedValue(undefined)} />);
    expect(screen.getByRole('button', { name: /pdf/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /csv/i })).toBeInTheDocument();
  });

  it('calls onDownload with "pdf" when the PDF button is clicked', async () => {
    const onDownload = jest.fn().mockResolvedValue(undefined);
    render(<ExportButtons onDownload={onDownload} />);
    fireEvent.click(screen.getByRole('button', { name: /pdf/i }));
    await waitFor(() => expect(onDownload).toHaveBeenCalledWith('pdf'));
  });

  it('calls onDownload with "csv" when the CSV button is clicked', async () => {
    const onDownload = jest.fn().mockResolvedValue(undefined);
    render(<ExportButtons onDownload={onDownload} />);
    fireEvent.click(screen.getByRole('button', { name: /csv/i }));
    await waitFor(() => expect(onDownload).toHaveBeenCalledWith('csv'));
  });

  it('shows an error snackbar when the download fails', async () => {
    const onDownload = jest.fn().mockRejectedValue(new Error('boom'));
    // silence console.error inside the component
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    render(<ExportButtons onDownload={onDownload} errorLabel="No se pudo descargar" />);
    fireEvent.click(screen.getByRole('button', { name: /pdf/i }));
    await waitFor(() => {
      expect(screen.getByText('No se pudo descargar')).toBeInTheDocument();
    });
    spy.mockRestore();
  });

  it('disables both buttons when the disabled prop is set', () => {
    render(<ExportButtons onDownload={jest.fn()} disabled />);
    expect(screen.getByRole('button', { name: /pdf/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /csv/i })).toBeDisabled();
  });
});
