/**
 * Maps category icon names to Lucide React icon components.
 *
 * The backend stores the icon name (e.g. "Car", "Home") and the frontend
 * renders the corresponding Lucide component. This keeps the wire format
 * small and lets us swap icon libraries without DB migrations.
 */
import React from "react";
import {
  UtensilsCrossed,
  Car,
  Gamepad2,
  HeartPulse,
  GraduationCap,
  Home,
  Shirt,
  Package,
  ShoppingCart,
  Wifi,
  Zap,
  Baby,
  Plane,
  Gift,
  Coffee,
  // fallback / general
  Tag,
  type LucideProps,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  UtensilsCrossed,
  Car,
  Gamepad2,
  HeartPulse,
  GraduationCap,
  Home,
  Shirt,
  Package,
  ShoppingCart,
  Wifi,
  Zap,
  Baby,
  Plane,
  Gift,
  Coffee,
};

const DEFAULT_ICON = Tag;

export function getCategoryIcon(name: string | null | undefined): React.ComponentType<LucideProps> {
  if (!name) return DEFAULT_ICON;
  // Handle both PascalCase (new) and emoji (legacy) icons
  if (ICON_MAP[name]) return ICON_MAP[name];
  // If it's an emoji (legacy data), return null to render nothing
  if (name.length <= 4 && /\p{Emoji_Presentation}/u.test(name)) return DEFAULT_ICON;
  return DEFAULT_ICON;
}
