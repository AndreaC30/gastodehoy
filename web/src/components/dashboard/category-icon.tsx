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

/** Suggested default when adding a fixed expense (rent, utilities, …). */
export const DEFAULT_FIXED_EXPENSE_ICON = "Home";

export function getCategoryIcon(name: string | null | undefined): IconType {
  if (!name) return DEFAULT_ICON;
  if (ICON_MAP[name]) return ICON_MAP[name];
  if (name.length <= 4 && /\p{Emoji_Presentation}/u.test(name)) return DEFAULT_ICON;
  return DEFAULT_ICON;
}

type IconPickerStripProps = {
  value: string;
  onChange: (name: string) => void;
  className?: string;
};

/** Compact icon grid (same keys as ``ExpenseCategory.icon``). */
export function CategoryIconPickerStrip({
  value,
  onChange,
  className,
}: IconPickerStripProps) {
  return (
    <div className={className} role="group" aria-label="Elegir icono">
      <div className="flex flex-wrap gap-1.5">
        {CATEGORY_ICON_PICKER.map((opt) => {
          const OptIcon = opt.Icon;
          const selected = value === opt.name;
          return (
            <button
              key={opt.name}
              type="button"
              onClick={() => onChange(opt.name)}
              className={`rounded-lg border p-1.5 ${
                selected
                  ? "border-sky-500 bg-sky-500/20"
                  : "border-slate-700 hover:border-slate-500"
              }`}
              aria-label={opt.name}
              aria-pressed={selected}
            >
              <OptIcon className="h-4 w-4 text-slate-300" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
