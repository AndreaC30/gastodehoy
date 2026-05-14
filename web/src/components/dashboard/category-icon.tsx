/**
 * Maps category icon names (stored in DB, same as former Lucide names) to
 * react-icons (Ionicons 5) components. Wire format stays unchanged — no DB migration.
 */
import type { IconType } from "react-icons";
import {
  IoAirplaneOutline,
  IoBalloonOutline,
  IoCafeOutline,
  IoCarSportOutline,
  IoCartOutline,
  IoCubeOutline,
  IoFlashOutline,
  IoGameControllerOutline,
  IoGiftOutline,
  IoHomeOutline,
  IoMedicalOutline,
  IoPricetagOutline,
  IoRestaurantOutline,
  IoSchoolOutline,
  IoShirtOutline,
  IoWifi,
} from "react-icons/io5";

const ICON_MAP: Record<string, IconType> = {
  UtensilsCrossed: IoRestaurantOutline,
  Car: IoCarSportOutline,
  Gamepad2: IoGameControllerOutline,
  HeartPulse: IoMedicalOutline,
  GraduationCap: IoSchoolOutline,
  Home: IoHomeOutline,
  Shirt: IoShirtOutline,
  Package: IoCubeOutline,
  ShoppingCart: IoCartOutline,
  Wifi: IoWifi,
  Zap: IoFlashOutline,
  Baby: IoBalloonOutline,
  Plane: IoAirplaneOutline,
  Gift: IoGiftOutline,
  Coffee: IoCafeOutline,
  Tag: IoPricetagOutline,
};

/** Picker order + labels: `name` is persisted on `ExpenseCategory.icon`. */
export const CATEGORY_ICON_PICKER: { name: string; Icon: IconType }[] = [
  { name: "UtensilsCrossed", Icon: ICON_MAP.UtensilsCrossed },
  { name: "Car", Icon: ICON_MAP.Car },
  { name: "Gamepad2", Icon: ICON_MAP.Gamepad2 },
  { name: "HeartPulse", Icon: ICON_MAP.HeartPulse },
  { name: "GraduationCap", Icon: ICON_MAP.GraduationCap },
  { name: "Home", Icon: ICON_MAP.Home },
  { name: "Shirt", Icon: ICON_MAP.Shirt },
  { name: "Package", Icon: ICON_MAP.Package },
  { name: "ShoppingCart", Icon: ICON_MAP.ShoppingCart },
  { name: "Wifi", Icon: ICON_MAP.Wifi },
  { name: "Zap", Icon: ICON_MAP.Zap },
  { name: "Baby", Icon: ICON_MAP.Baby },
  { name: "Plane", Icon: ICON_MAP.Plane },
  { name: "Gift", Icon: ICON_MAP.Gift },
  { name: "Coffee", Icon: ICON_MAP.Coffee },
];

const DEFAULT_ICON = IoPricetagOutline;

export function getCategoryIcon(name: string | null | undefined): IconType {
  if (!name) return DEFAULT_ICON;
  if (ICON_MAP[name]) return ICON_MAP[name];
  if (name.length <= 4 && /\p{Emoji_Presentation}/u.test(name)) return DEFAULT_ICON;
  return DEFAULT_ICON;
}
