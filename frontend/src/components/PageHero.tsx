import type { ReactNode } from 'react';
import { useTheme } from '@mui/material/styles';

interface PageHeroProps {
  children: ReactNode;
}

export default function PageHero({ children }: PageHeroProps) {
  const theme = useTheme();

  return (
    <div className="w-full text-white" style={{ backgroundColor: theme.palette.primary.main }}>
      <div className="max-w-[1152px] mx-auto px-6 py-[48px]">
        {children}
      </div>
    </div>
  );
}
