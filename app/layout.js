import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'Mis Recetas',
  description: 'Gestión de recetas personales',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="bg-stone-50 min-h-screen">
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
