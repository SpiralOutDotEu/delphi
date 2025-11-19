import { Box } from "@radix-ui/themes";

interface LogoProps {
  size?: "small" | "medium" | "large";
  showText?: boolean;
  className?: string;
}

export function Logo({
  size = "medium",
  showText = false,
  className = "",
}: LogoProps) {
  const sizeMap = {
    small: { logo: "clamp(32px, 8vw, 48px)", text: "clamp(18px, 4vw, 24px)" },
    medium: {
      logo: "clamp(60px, 12vw, 110px)",
      text: "clamp(1.75rem, 5vw, 3.5rem)",
    },
    large: {
      logo: "clamp(80px, 15vw, 140px)",
      text: "clamp(2.5rem, 7vw, 4.5rem)",
    },
  };

  const dimensions = sizeMap[size];

  const isHorizontal = size === "small" && showText;

  return (
    <Box
      className={`logo-container ${className}`}
      style={{
        display: "flex",
        flexDirection: isHorizontal ? "row" : "column",
        alignItems: "center",
        gap: showText ? "clamp(8px, 2vw, 16px)" : "0",
      }}
    >
      {/* Divine Greek Letters Logo */}
      <Box
        style={{
          width: dimensions.logo,
          height: dimensions.logo,
          borderRadius: "clamp(12px, 2vw, 16px)",
          background: "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <Box
          className="delphi-logo"
          style={{
            fontSize: `calc(${dimensions.logo} * 0.6)`,
            fontFamily: "'Georgia', 'Times New Roman', serif",
            fontWeight: size === "small" ? 700 : 400,
            lineHeight: 1,
            position: "relative",
            zIndex: 1,
          }}
        >
          Δφ
        </Box>
        {/* Blue glow effect behind the logo */}
        <Box
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "120%",
            height: "120%",
            background:
              "radial-gradient(circle, var(--oracle-primary-glow) 0%, transparent 70%)",
            opacity: 0.4,
            zIndex: 0,
            filter: "blur(15px)",
            pointerEvents: "none",
          }}
        />
      </Box>

      {/* Brand Name - DELPHI */}
      {showText && (
        <Box
          className="brand-name"
          style={{
            fontSize: dimensions.text,
            fontFamily: "'Georgia', 'Times New Roman', serif",
            fontWeight: size === "small" ? 700 : 400,
            letterSpacing: "0.05em",
            color: "var(--oracle-gold)",
            textShadow:
              "0 0 20px var(--oracle-gold-glow), 0 0 40px rgba(212, 169, 78, 0.2)",
            lineHeight: 1.1,
          }}
        >
          DELPHI
        </Box>
      )}
    </Box>
  );
}
