'use client';
import { useRouter } from 'next/navigation';

interface Props {
  label: string;
  className?: string;
  testId?: string;
}

export default function RetryButton({ label, className = 'btn-primary', testId }: Props) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className={className}
      data-testid={testId}
    >
      {label}
    </button>
  );
}
