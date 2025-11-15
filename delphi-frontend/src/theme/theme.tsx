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
          // Custom market-themed variables
          "--market-primary": "#3b82f6",
          "--market-secondary": "#60a5fa",
          "--market-accent": "#93c5fd",
          "--market-bg-dark": "#0f172a",
          "--market-bg-darker": "#020617",
          "--market-border": "rgba(59, 130, 246, 0.2)",
          "--market-glow": "rgba(59, 130, 246, 0.3)",
        } as React.CSSProperties
      }
    >
      {children}
    </Theme>
  );
}
