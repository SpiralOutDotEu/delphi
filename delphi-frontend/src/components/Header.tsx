import { ConnectButton } from "@mysten/dapp-kit";
import { Box, Flex, Heading, Link, Text } from "@radix-ui/themes";
import { Link as RouterLink } from "react-router-dom";

export function Header() {
  return (
    <Flex
      position="sticky"
      top="0"
      px={{ initial: "3", sm: "4", md: "6" }}
      py={{ initial: "3", sm: "4" }}
      justify="between"
      align="center"
      style={{
        borderBottom: "1px solid var(--market-border)",
        background: "rgba(15, 23, 42, 0.9)",
        backdropFilter: "blur(10px)",
        zIndex: 1000,
      }}
    >
      <Box>
        <Link asChild>
          <RouterLink
            to="/"
            style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "clamp(8px, 2vw, 12px)" }}
          >
            <Box
              style={{
                width: "clamp(32px, 8vw, 40px)",
                height: "clamp(32px, 8vw, 40px)",
                borderRadius: "clamp(8px, 2vw, 10px)",
                background: "linear-gradient(135deg, var(--market-primary) 0%, var(--market-primary-light) 100%)",
                border: "1px solid var(--market-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px var(--market-glow)",
              }}
            >
              <Text
                weight="bold"
                style={{
                  fontSize: "clamp(16px, 4vw, 20px)",
                  fontFamily: "serif",
                  color: "white",
                  lineHeight: 1,
                }}
              >
                Δφ
              </Text>
            </Box>
            <Heading size={{ initial: "5", sm: "6" }} className="text-gradient">
              Delphi
            </Heading>
          </RouterLink>
        </Link>
      </Box>

      <Flex gap={{ initial: "2", sm: "3", md: "5" }} align="center">
        <Link asChild>
          <RouterLink
            to="/"
            style={{
              textDecoration: "none",
              color: "var(--gray-11)",
              fontWeight: 500,
              transition: "color 0.2s ease",
              fontSize: "clamp(14px, 2vw, 16px)",
            }}
            className="nav-link"
          >
            Home
          </RouterLink>
        </Link>
        <Link asChild>
          <RouterLink
            to="/objects"
            style={{
              textDecoration: "none",
              color: "var(--gray-11)",
              fontWeight: 500,
              transition: "color 0.2s ease",
              fontSize: "clamp(14px, 2vw, 16px)",
            }}
            className="nav-link"
          >
            <Box display={{ initial: "none", sm: "block" }}>My Objects</Box>
            <Box display={{ initial: "block", sm: "none" }}>Objects</Box>
          </RouterLink>
        </Link>
        <Box>
          <ConnectButton />
        </Box>
      </Flex>
    </Flex>
  );
}

