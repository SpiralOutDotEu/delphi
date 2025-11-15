import { Box, Container, Flex, Heading, Text, Button } from "@radix-ui/themes";
import { Link } from "react-router-dom";
import {
  LockClosedIcon,
  LightningBoltIcon,
  TargetIcon,
  CubeIcon,
  BarChartIcon,
  RocketIcon,
  GlobeIcon,
  CheckIcon,
  ClockIcon,
} from "@radix-ui/react-icons";

export function Landing() {
  return (
    <Box
      className="hero-section"
      style={{
        minHeight: "calc(100vh - 80px)",
        display: "flex",
        alignItems: "center",
      }}
    >
      <Container
        size={{ initial: "1", sm: "2", md: "3", lg: "4" }}
        py={{ initial: "3", sm: "4", md: "5", lg: "6" }}
        px={{ initial: "4", sm: "5", md: "6" }}
      >
        <Flex
          direction="column"
          align="center"
          justify="center"
          gap={{ initial: "3", sm: "4", md: "5" }}
          style={{
            textAlign: "center",
            paddingTop: "clamp(16px, 2vh, 40px)",
            paddingBottom: "clamp(16px, 2vh, 40px)",
          }}
        >
          {/* Logo and Title */}
          <Flex
            align="center"
            gap={{ initial: "3", sm: "4", md: "5" }}
            justify="center"
            mb="1"
            direction={{ initial: "column", sm: "row" }}
          >
            <Box
              className="logo-container"
              style={{
                width: "clamp(60px, 12vw, 110px)",
                height: "clamp(60px, 12vw, 110px)",
                borderRadius: "clamp(16px, 2vw, 20px)",
                background:
                  "linear-gradient(135deg, var(--market-primary) 0%, var(--market-primary-light) 100%)",
                border: "2px solid var(--market-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <Text
                weight="bold"
                style={{
                  fontSize: "clamp(1.5rem, 6vw, 3.5rem)",
                  fontFamily: "serif",
                  color: "white",
                  lineHeight: 1,
                }}
              >
                Δφ
              </Text>
            </Box>
            <Heading
              size={{ initial: "6", sm: "7", md: "8" }}
              style={{
                fontSize: "clamp(1.75rem, 5vw, 3.5rem)",
                fontWeight: 900,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
              }}
              className="text-gradient"
            >
              Delphi
            </Heading>
          </Flex>

          {/* Hero Description */}
          <Text
            size={{ initial: "3", sm: "4", md: "5" }}
            style={{
              maxWidth: "clamp(300px, 90vw, 700px)",
              color: "var(--gray-11)",
              lineHeight: 1.6,
              fontWeight: 400,
              paddingLeft: "clamp(8px, 2vw, 0px)",
              paddingRight: "clamp(8px, 2vw, 0px)",
            }}
          >
            Binary prediction markets on SUI network powered by Automated Market
            Making (AMM) and Trusted Execution Environment (TEE) oracles.
            Harness collective intelligence through oracle reliability. Trade on
            the outcome of real-world events with transparent market mechanics.
          </Text>

          {/* CTA Buttons */}
          <Flex
            gap="3"
            mt="1"
            mb={{ initial: "3", sm: "4", md: "5" }}
            direction={{ initial: "column", sm: "row" }}
            width={{ initial: "100%", sm: "auto" }}
            style={{ maxWidth: "100%" }}
          >
            <Button
              size={{ initial: "2", sm: "3" }}
              className="crypto-button responsive-button"
              asChild
            >
              <Link
                to="/objects"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                Explore Markets
              </Link>
            </Button>
            <Button
              size={{ initial: "2", sm: "3" }}
              className="crypto-button-outline responsive-button"
            >
              Learn More
            </Button>
          </Flex>

          {/* Markets Section */}
          <Box
            mt={{ initial: "4", sm: "5", md: "6" }}
            style={{ width: "100%" }}
          >
            <Heading
              size={{ initial: "5", sm: "6", md: "7" }}
              mb="2"
              className="section-heading text-gradient"
              style={{
                paddingLeft: "clamp(8px, 2vw, 0px)",
                paddingRight: "clamp(8px, 2vw, 0px)",
              }}
            >
              Available Markets
            </Heading>
            <Text
              size={{ initial: "2", sm: "3" }}
              className="section-subtitle"
              mb={{ initial: "6", sm: "7", md: "8" }}
              style={{
                paddingLeft: "clamp(16px, 4vw, 0px)",
                paddingRight: "clamp(16px, 4vw, 0px)",
              }}
            >
              Trade on crypto markets now. Stocks, sports, and more coming soon.
            </Text>

            {/* Market Categories */}
            <Box
              className="markets-grid"
              style={{
                width: "100%",
                maxWidth: "1200px",
                margin: "0 auto",
                paddingLeft: "clamp(8px, 2vw, 0px)",
                paddingRight: "clamp(8px, 2vw, 0px)",
              }}
            >
              {/* Crypto - Available */}
              <Box className="market-card market-card-available">
                <Flex direction="column" align="center" gap="3" p="4">
                  <Box
                    className="market-icon market-icon-available"
                    style={{
                      width: "clamp(48px, 10vw, 64px)",
                      height: "clamp(48px, 10vw, 64px)",
                      borderRadius: "16px",
                      background:
                        "linear-gradient(135deg, var(--market-primary) 0%, var(--market-primary-light) 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 16px var(--market-glow)",
                    }}
                  >
                    <CubeIcon
                      width="clamp(24px, 5vw, 32px)"
                      height="clamp(24px, 5vw, 32px)"
                      color="white"
                    />
                  </Box>
                  <Heading
                    size={{ initial: "4", sm: "5" }}
                    className="text-gradient"
                  >
                    Crypto
                  </Heading>
                  <Flex align="center" gap="2">
                    <Box
                      style={{
                        background: "var(--market-success)",
                        borderRadius: "12px",
                        padding: "4px 12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <CheckIcon width="14" height="14" color="white" />
                      <Text size="2" weight="bold" style={{ color: "white" }}>
                        Available
                      </Text>
                    </Box>
                  </Flex>
                </Flex>
              </Box>

              {/* Stocks - Coming Soon */}
              <Box className="market-card market-card-coming-soon">
                <Flex direction="column" align="center" gap="3" p="4">
                  <Box
                    className="market-icon market-icon-coming-soon"
                    style={{
                      width: "clamp(48px, 10vw, 64px)",
                      height: "clamp(48px, 10vw, 64px)",
                      borderRadius: "16px",
                      background: "rgba(59, 130, 246, 0.2)",
                      border: "2px solid var(--market-border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <BarChartIcon
                      width="clamp(24px, 5vw, 32px)"
                      height="clamp(24px, 5vw, 32px)"
                      color="var(--market-accent)"
                    />
                  </Box>
                  <Heading
                    size={{ initial: "4", sm: "5" }}
                    style={{ color: "var(--gray-11)" }}
                  >
                    Stocks
                  </Heading>
                  <Flex align="center" gap="2">
                    <Box
                      style={{
                        background: "rgba(59, 130, 246, 0.2)",
                        borderRadius: "12px",
                        padding: "4px 12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        border: "1px solid var(--market-border)",
                      }}
                    >
                      <ClockIcon
                        width="14"
                        height="14"
                        color="var(--market-accent)"
                      />
                      <Text
                        size="2"
                        weight="bold"
                        style={{ color: "var(--market-accent)" }}
                      >
                        Coming Soon
                      </Text>
                    </Box>
                  </Flex>
                </Flex>
              </Box>

              {/* Sports - Coming Soon */}
              <Box className="market-card market-card-coming-soon">
                <Flex direction="column" align="center" gap="3" p="4">
                  <Box
                    className="market-icon market-icon-coming-soon"
                    style={{
                      width: "clamp(48px, 10vw, 64px)",
                      height: "clamp(48px, 10vw, 64px)",
                      borderRadius: "16px",
                      background: "rgba(59, 130, 246, 0.2)",
                      border: "2px solid var(--market-border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <RocketIcon
                      width="clamp(24px, 5vw, 32px)"
                      height="clamp(24px, 5vw, 32px)"
                      color="var(--market-accent)"
                    />
                  </Box>
                  <Heading
                    size={{ initial: "4", sm: "5" }}
                    style={{ color: "var(--gray-11)" }}
                  >
                    Sports
                  </Heading>
                  <Flex align="center" gap="2">
                    <Box
                      style={{
                        background: "rgba(59, 130, 246, 0.2)",
                        borderRadius: "12px",
                        padding: "4px 12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        border: "1px solid var(--market-border)",
                      }}
                    >
                      <ClockIcon
                        width="14"
                        height="14"
                        color="var(--market-accent)"
                      />
                      <Text
                        size="2"
                        weight="bold"
                        style={{ color: "var(--market-accent)" }}
                      >
                        Coming Soon
                      </Text>
                    </Box>
                  </Flex>
                </Flex>
              </Box>

              {/* More - Coming Soon */}
              <Box className="market-card market-card-coming-soon">
                <Flex direction="column" align="center" gap="3" p="4">
                  <Box
                    className="market-icon market-icon-coming-soon"
                    style={{
                      width: "clamp(48px, 10vw, 64px)",
                      height: "clamp(48px, 10vw, 64px)",
                      borderRadius: "16px",
                      background: "rgba(59, 130, 246, 0.2)",
                      border: "2px solid var(--market-border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <GlobeIcon
                      width="clamp(24px, 5vw, 32px)"
                      height="clamp(24px, 5vw, 32px)"
                      color="var(--market-accent)"
                    />
                  </Box>
                  <Heading
                    size={{ initial: "4", sm: "5" }}
                    style={{ color: "var(--gray-11)" }}
                  >
                    More
                  </Heading>
                  <Flex align="center" gap="2">
                    <Box
                      style={{
                        background: "rgba(59, 130, 246, 0.2)",
                        borderRadius: "12px",
                        padding: "4px 12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        border: "1px solid var(--market-border)",
                      }}
                    >
                      <ClockIcon
                        width="14"
                        height="14"
                        color="var(--market-accent)"
                      />
                      <Text
                        size="2"
                        weight="bold"
                        style={{ color: "var(--market-accent)" }}
                      >
                        Coming Soon
                      </Text>
                    </Box>
                  </Flex>
                </Flex>
              </Box>
            </Box>
          </Box>

          {/* Why Choose Section */}
          <Box
            mt={{ initial: "4", sm: "5", md: "6" }}
            style={{ width: "100%" }}
          >
            <Heading
              size={{ initial: "5", sm: "6", md: "7" }}
              mb="2"
              className="section-heading text-gradient"
              style={{
                paddingLeft: "clamp(8px, 2vw, 0px)",
                paddingRight: "clamp(8px, 2vw, 0px)",
              }}
            >
              Why Choose Delphi?
            </Heading>
            <Text
              size={{ initial: "2", sm: "3" }}
              className="section-subtitle"
              mb={{ initial: "6", sm: "7", md: "8" }}
              style={{
                paddingLeft: "clamp(16px, 4vw, 0px)",
                paddingRight: "clamp(16px, 4vw, 0px)",
              }}
            >
              Trade binary markets on any event with transparent, decentralized
              infrastructure
            </Text>

            {/* Feature Cards */}
            <Box
              className="feature-cards-grid"
              style={{
                width: "100%",
                maxWidth: "1000px",
                margin: "0 auto",
                paddingLeft: "clamp(8px, 2vw, 0px)",
                paddingRight: "clamp(8px, 2vw, 0px)",
              }}
            >
              <Box
                className="crypto-card"
                p={{ initial: "3", sm: "4", md: "5" }}
              >
                <Box
                  className="feature-icon"
                  style={{
                    width: "clamp(40px, 8vw, 48px)",
                    height: "clamp(40px, 8vw, 48px)",
                    marginBottom: "clamp(8px, 2vw, 12px)",
                  }}
                >
                  <LockClosedIcon
                    width="clamp(20px, 4vw, 24px)"
                    height="clamp(20px, 4vw, 24px)"
                    color="white"
                  />
                </Box>
                <Heading
                  size={{ initial: "4", sm: "5" }}
                  mb="2"
                  className="text-gradient"
                >
                  TEE Oracles
                </Heading>
                <Text
                  size={{ initial: "2", sm: "3" }}
                  color="gray"
                  style={{ lineHeight: 1.5 }}
                >
                  Trusted Execution Environments provide provably authentic data
                  sources for market resolution, ensuring oracle reliability and
                  transparent outcomes.
                </Text>
              </Box>

              <Box
                className="crypto-card"
                p={{ initial: "3", sm: "4", md: "5" }}
              >
                <Box
                  className="feature-icon"
                  style={{
                    width: "clamp(40px, 8vw, 48px)",
                    height: "clamp(40px, 8vw, 48px)",
                    marginBottom: "clamp(8px, 2vw, 12px)",
                  }}
                >
                  <LightningBoltIcon
                    width="clamp(20px, 4vw, 24px)"
                    height="clamp(20px, 4vw, 24px)"
                    color="white"
                  />
                </Box>
                <Heading
                  size={{ initial: "4", sm: "5" }}
                  mb="2"
                  className="text-gradient"
                >
                  AMM Liquidity
                </Heading>
                <Text
                  size={{ initial: "2", sm: "3" }}
                  color="gray"
                  style={{ lineHeight: 1.5 }}
                >
                  Automated Market Making provides continuous liquidity for
                  binary markets, enabling instant trades at fair prices with
                  minimal slippage.
                </Text>
              </Box>

              <Box
                className="crypto-card"
                p={{ initial: "3", sm: "4", md: "5" }}
              >
                <Box
                  className="feature-icon"
                  style={{
                    width: "clamp(40px, 8vw, 48px)",
                    height: "clamp(40px, 8vw, 48px)",
                    marginBottom: "clamp(8px, 2vw, 12px)",
                  }}
                >
                  <TargetIcon
                    width="clamp(20px, 4vw, 24px)"
                    height="clamp(20px, 4vw, 24px)"
                    color="white"
                  />
                </Box>
                <Heading
                  size={{ initial: "4", sm: "5" }}
                  mb="2"
                  className="text-gradient"
                >
                  Binary Markets
                </Heading>
                <Text
                  size={{ initial: "2", sm: "3" }}
                  color="gray"
                  style={{ lineHeight: 1.5 }}
                >
                  Simple Yes/No markets on any event. Trade on politics, sports,
                  economics, and more with transparent, on-chain resolution.
                </Text>
              </Box>
            </Box>
          </Box>
        </Flex>
      </Container>
    </Box>
  );
}
