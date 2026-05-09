import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'SmartBin',
  description:
    'Monitor and manage your smart trash bins in real-time. Get instant alerts when bins are full.',
  keywords: 'IoT, waste management, smart bin, monitoring, dashboard',
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#ffffff',
                color: '#0f172a',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '14px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#ffffff' } },
              error:   { iconTheme: { primary: '#ef4444', secondary: '#ffffff' } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
