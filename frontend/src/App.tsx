import { useMemo } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { createAppRouter } from './router';
import { createQueryClient } from './utils/queryClient';
import './App.css';

export default function App() {
  const router = useMemo(() => createAppRouter(), []);
  const queryClient = useMemo(() => createQueryClient(), []);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </LocalizationProvider>
  );
}
