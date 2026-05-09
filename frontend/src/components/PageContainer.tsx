import type { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
}

export default function PageContainer({ children }: PageContainerProps) {
  return (
    <main className="max-w-[1152px] mx-auto w-full px-6 py-6 flex flex-col gap-6">
      {children}
    </main>
  );
}
