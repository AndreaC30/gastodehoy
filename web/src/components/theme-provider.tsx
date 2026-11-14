/** next-themes works outside Next.js; class on <html> drives CSS tokens. */
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="gdh-theme"
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
