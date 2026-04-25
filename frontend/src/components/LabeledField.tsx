import TextField, { type TextFieldProps } from '@mui/material/TextField';
import FormLabel from '@mui/material/FormLabel';

interface LabeledFieldProps extends Omit<TextFieldProps, 'label'> {
  label: string;
  wrapperClassName?: string;
  uppercase?: boolean;
  compact?: boolean;
  children?: React.ReactNode;
}

export default function LabeledField({
  label,
  wrapperClassName,
  uppercase = false,
  compact = false,
  children,
  ...textFieldProps
}: LabeledFieldProps) {
  const labelSx = compact
    ? { fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', mb: 0.5 }
    : uppercase
      ? { fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 0.5 }
      : { fontSize: '0.75rem', fontWeight: 600, display: 'block', mb: 1 };

  return (
    <div className={wrapperClassName}>
      <FormLabel sx={labelSx}>{label}</FormLabel>
      {children ?? <TextField fullWidth size="small" {...textFieldProps} />}
    </div>
  );
}
