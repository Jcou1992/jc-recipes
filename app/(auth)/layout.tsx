import KonamiEasterEgg from '@/components/motion/KonamiEasterEgg';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <KonamiEasterEgg />
    </>
  );
}
