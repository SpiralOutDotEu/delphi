import { Theme } from "@radix-ui/themes";

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <Theme
      appearance="dark"
      accentColor="blue"
      grayColor="slate"
      radius="medium"
      scaling="100%"
      style={
        {
          // Mystic Midnight Oracle theme variables
          "--oracle-bg": "#0C1220",
          "--oracle-primary": "#3A8DFF",
          "--oracle-secondary": "#1E2435",
          "--oracle-gold": "#D4A94E",
          "--oracle-text-primary": "#E6EDF7",
          "--oracle-text-secondary": "#A9B4C6",
          "--oracle-text-muted": "#6C7586",
          "--oracle-bullish": "#4FBC80",
          "--oracle-bearish": "#FF6E6E",
          "--oracle-glow": "#598DFF",
          "--oracle-border": "rgba(58, 141, 255, 0.2)",
          "--oracle-gold-glow": "rgba(212, 169, 78, 0.3)",
          "--oracle-input-filled-bg": "rgba(58, 141, 255, 0.1)",
          "--oracle-input-hover-bg": "rgba(58, 141, 255, 0.05)",
        } as React.CSSProperties
      }
    >
      {children}
    </Theme>
  );
}
