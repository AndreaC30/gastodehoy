import { GravityStarsBackground } from "@/components/animate-ui/backgrounds/gravity-stars";

export function StarryBackground() {
  return (
    <GravityStarsBackground
      className="pointer-events-none fixed inset-0 z-0 min-h-screen"
      starsCount={70}
      glowIntensity={13}
      starsOpacity={0.5}
      movementSpeed={0.25}
    />
  );
}
