import { ConnectButton } from "@mysten/dapp-kit";
import { Box, Flex, Link } from "@radix-ui/themes";
import { Link as RouterLink } from "react-router-dom";
import { useState } from "react";
import { Logo } from "./Logo";
import { FaucetModal } from "./FaucetModal";
import { HowItWorksModal } from "./HowItWorksModal";

export function Header() {
  const [showFaucetModal, setShowFaucetModal] = useState(false);
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);

  return (
    <Flex
      position="sticky"
      top="0"
      px={{ initial: "3", sm: "4", md: "6" }}
      py={{ initial: "3", sm: "4" }}
      justify="between"
      align="center"
      style={{
        borderBottom: "1px solid var(--oracle-border)",
        background: "rgba(12, 18, 32, 0.95)",
        backdropFilter: "blur(10px)",
        zIndex: 1000,
      }}
    >
      <Box>
        <Link asChild>
          <RouterLink
            to="/"
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "clamp(8px, 2vw, 12px)",
            }}
          >
            <Logo size="small" showText={true} />
          </RouterLink>
        </Link>
      </Box>

      <Flex gap={{ initial: "2", sm: "3", md: "5" }} align="center">
        <Link asChild>
          <RouterLink
            to="/explore"
            style={{
              textDecoration: "none",
              color: "var(--oracle-text-secondary)",
              fontWeight: 500,
              transition: "color 0.2s ease",
              fontSize: "clamp(14px, 2vw, 16px)",
            }}
            className="nav-link"
          >
            <Box display={{ initial: "none", sm: "block" }}>
              Explore Markets
            </Box>
            <Box display={{ initial: "block", sm: "none" }}>Explore</Box>
          </RouterLink>
        </Link>
        <Link asChild>
          <RouterLink
            to="/create-market"
            style={{
              textDecoration: "none",
              color: "var(--oracle-text-secondary)",
              fontWeight: 500,
              transition: "color 0.2s ease",
              fontSize: "clamp(14px, 2vw, 16px)",
            }}
            className="nav-link"
          >
            <Box display={{ initial: "none", sm: "block" }}>Create Market</Box>
            <Box display={{ initial: "block", sm: "none" }}>Create</Box>
          </RouterLink>
        </Link>
        <Link asChild>
          <RouterLink
            to="/positions"
            style={{
              textDecoration: "none",
              color: "var(--oracle-text-secondary)",
              fontWeight: 500,
              transition: "color 0.2s ease",
              fontSize: "clamp(14px, 2vw, 16px)",
            }}
            className="nav-link"
          >
            <Box display={{ initial: "none", sm: "block" }}>My Positions</Box>
            <Box display={{ initial: "block", sm: "none" }}>Positions</Box>
          </RouterLink>
        </Link>
        <Link
          onClick={(e) => {
            e.preventDefault();
            setShowHowItWorksModal(true);
          }}
          style={{
            textDecoration: "none",
            color: "var(--oracle-text-secondary)",
            fontWeight: 500,
            transition: "color 0.2s ease",
            fontSize: "clamp(14px, 2vw, 16px)",
            cursor: "pointer",
          }}
          className="nav-link"
        >
          <Box display={{ initial: "none", sm: "block" }}>How It Works</Box>
          <Box display={{ initial: "block", sm: "none" }}>How</Box>
        </Link>
        <Link asChild>
          <RouterLink
            to="/faq"
            style={{
              textDecoration: "none",
              color: "var(--oracle-text-secondary)",
              fontWeight: 500,
              transition: "color 0.2s ease",
              fontSize: "clamp(14px, 2vw, 16px)",
            }}
            className="nav-link"
          >
            FAQ
          </RouterLink>
        </Link>
        <Link
          onClick={(e) => {
            e.preventDefault();
            setShowFaucetModal(true);
          }}
          style={{
            textDecoration: "none",
            color: "var(--oracle-text-secondary)",
            fontWeight: 500,
            transition: "color 0.2s ease",
            fontSize: "clamp(14px, 2vw, 16px)",
            cursor: "pointer",
          }}
          className="nav-link"
        >
          Faucet
        </Link>
        <Box>
          <ConnectButton />
        </Box>
      </Flex>
      <HowItWorksModal
        open={showHowItWorksModal}
        onOpenChange={setShowHowItWorksModal}
      />
      <FaucetModal open={showFaucetModal} onOpenChange={setShowFaucetModal} />
    </Flex>
  );
}
