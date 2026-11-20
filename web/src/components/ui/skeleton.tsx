type Props = {
  className?: string;
};

export function Skeleton({ className = "" }: Props) {
  return (
    <span
      className={`block animate-pulse rounded bg-[var(--color-border)]/40 ${className}`}
      aria-hidden="true"
    />
  );
}
