import { useParams, useNavigate } from "react-router-dom";
import { useSuiClient } from "@mysten/dapp-kit";
import {
  Container,
  Flex,
  Heading,
  Text,
  Box,
  Card,
  Badge,
  Button,
  Tabs,
  Spinner,
  Separator,
} from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { networkConfig } from "../networkConfig";
import { fetchObjectByAddress, Market } from "../services/graphqlService";
import { COINS } from "../constants";

export function MarketDetailPage() {
  const { marketId } = useParams<{ marketId: string }>();
  const navigate = useNavigate();
  const client = useSuiClient();
  const [market, setMarket] = useState<Market | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [selectedSide, setSelectedSide] = useState<"yes" | "no" | null>("yes");

  const getCurrentNetwork = () => {
    const url = (client as any).url || "";
    if (url.includes("devnet")) return "devnet";
    if (url.includes("testnet")) return "testnet";
    if (url.includes("mainnet")) return "mainnet";
    if (url.includes("localhost") || url.includes("127.0.0.1")) return "local";
    return "testnet";
  };

  const currentNetwork = getCurrentNetwork();

  useEffect(() => {
    const loadMarket = async () => {
      if (!marketId) {
        setError("Market ID is required");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const object = await fetchObjectByAddress(currentNetwork, marketId);
        
        if (!object || !object.asMoveObject) {
          setError("Market not found");
          setIsLoading(false);
          return;
        }

        const marketData: Market = {
          address: object.address,
          asMoveObject: {
            contents: {
              json: object.asMoveObject.contents.json,
            },
          },
        };

        setMarket(marketData);
      } catch (err) {
        console.error("Failed to load market:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load market"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadMarket();
  }, [marketId, currentNetwork]);

  if (isLoading) {
    return (
      <Box className="page-container">
        <Container size="4" py="8">
          <Flex justify="center" align="center" py="12">
            <Spinner size="3" />
            <Text ml="3" size="3" style={{ color: "var(--oracle-text-secondary)" }}>
              Loading market...
            </Text>
          </Flex>
        </Container>
      </Box>
    );
  }

  if (error || !market) {
    return (
      <Box className="page-container">
        <Container size="4" py="8">
          <Card className="crypto-card">
            <Box p="6">
              <Text size="3" style={{ color: "var(--oracle-bearish)" }}>
                {error || "Market not found"}
              </Text>
              <Button mt="4" onClick={() => navigate("/explore")}>
                Back to Markets
              </Button>
            </Box>
          </Card>
        </Container>
      </Box>
    );
  }

  const marketData = market.asMoveObject.contents.json;
  
  // Calculate total shares (real + virtual)
  const totalYesShares =
    BigInt(marketData.yes_shares || "0") +
    BigInt(marketData.virtual_yes_shares || "0");
  const totalNoShares =
    BigInt(marketData.no_shares || "0") +
    BigInt(marketData.virtual_no_shares || "0");
  const totalShares = totalYesShares + totalNoShares;
  
  // Calculate percentages
  const yesPercentage =
    totalShares > 0n
      ? Number((totalYesShares * 10000n) / totalShares) / 100
      : 50;
  const noPercentage =
    totalShares > 0n
      ? Number((totalNoShares * 10000n) / totalShares) / 100
      : 50;

  const isResolved =
    marketData.resolved === true || marketData.resolved === "true";
  const outcome = marketData.outcome || "0";
  const winningSide = outcome === "1" ? "YES" : outcome === "2" ? "NO" : null;

  const formatPrice = (priceStr: string): string => {
    const price = BigInt(priceStr);
    if (price === 0n) return "0";
    return (Number(price) / 1_000_000_000).toFixed(9);
  };

  const formatShares = (shares: bigint): string => {
    const num = Number(shares) / 1_000_000_000; // Convert from MIST to SUI
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(2)}k`;
    return num.toFixed(2);
  };

  const formatCollateral = (collateral: any): string => {
    // Collateral is a Balance<SUI> object
    // The GraphQL response might have it as a string or object
    if (!collateral) return "0";
    if (typeof collateral === "string") {
      const value = BigInt(collateral);
      return formatShares(value);
    }
    if (collateral.value) {
      const value = BigInt(collateral.value);
      return formatShares(value);
    }
    return "0";
  };

  const getComparatorLabel = (comparator: string): string => {
    return comparator === "1" ? "≤" : "≥";
  };

  // Find coin data from constants
  const coinData = COINS.find((c) => c.value === marketData.coin.toLowerCase());
  const coinSymbol =
    coinData?.symbol.toUpperCase() || marketData.coin.toUpperCase();
  const coinImageUrl = coinData?.image_svg_url;

  // Calculate prices (in cents, based on percentage)
  // If percentage is 35%, price is 35¢
  const yesPrice = Math.round(yesPercentage);
  const noPrice = Math.round(noPercentage);

  return (
    <Box className="page-container">
      <Container size="4" py="6" style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Header */}
        <Flex justify="between" align="center" mb="6">
          <Button variant="soft" onClick={() => navigate("/explore")}>
            ← Back to Markets
          </Button>
          {isResolved && (
            <Badge
              color={winningSide === "YES" ? "green" : "red"}
              size="3"
              style={{
                fontWeight: 600,
                textTransform: "uppercase",
                fontSize: "12px",
                letterSpacing: "0.5px",
              }}
            >
              {winningSide} Won
            </Badge>
          )}
        </Flex>

        {/* Market Question Header */}
        <Card className="crypto-card" mb="4">
          <Box p="6">
            <Flex direction="column" gap="4">
              <Flex align="center" gap="3">
                {coinImageUrl && (
                  <Box
                    style={{
                      width: "40px",
                      height: "40px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={coinImageUrl}
                      alt={coinData?.name || marketData.coin}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </Box>
                )}
                <Box>
                  <Heading size="7" mb="2">
                    Will {marketData.coin} be {getComparatorLabel(marketData.comparator)} $
                    {formatPrice(marketData.price)} on {marketData.date}?
                  </Heading>
                  <Flex gap="4" align="center" mt="2">
                    <Text size="2" style={{ color: "var(--oracle-text-muted)" }}>
                      Volume: ${formatShares(totalYesShares + totalNoShares)}
                    </Text>
                    <Text size="2" style={{ color: "var(--oracle-text-muted)" }}>
                      Resolution: {marketData.date}
                    </Text>
                    {!isResolved && (
                      <Badge variant="soft" size="2">
                        Active
                      </Badge>
                    )}
                  </Flex>
                </Box>
              </Flex>
            </Flex>
          </Box>
        </Card>

        <Flex gap="4" direction={{ initial: "column", lg: "row" }}>
          {/* Left Column - Chart and Stats */}
          <Flex direction="column" style={{ flex: "1 1 60%" }} gap="4">
            {/* Chart Placeholder */}
            <Card className="crypto-card">
              <Box p="6">
                <Flex direction="column" gap="4">
                  <Flex justify="between" align="center">
                    <Heading size="5">Price History</Heading>
                    <Flex gap="2">
                      {["1H", "6H", "1D", "1W", "1M", "ALL"].map((period) => (
                        <Button
                          key={period}
                          variant={period === "ALL" ? "solid" : "soft"}
                          size="1"
                        >
                          {period}
                        </Button>
                      ))}
                    </Flex>
                  </Flex>
                  <Box
                    style={{
                      height: "300px",
                      background: "var(--oracle-secondary)",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid var(--oracle-border)",
                    }}
                  >
                    <Text size="3" style={{ color: "var(--oracle-text-muted)" }}>
                      Chart Placeholder
                    </Text>
                  </Box>
                </Flex>
              </Box>
            </Card>

            {/* Trades Placeholder */}
            <Card className="crypto-card">
              <Box p="6">
                <Heading size="5" mb="4">Recent Trades</Heading>
                <Box
                  style={{
                    minHeight: "200px",
                    background: "var(--oracle-secondary)",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid var(--oracle-border)",
                  }}
                >
                  <Text size="3" style={{ color: "var(--oracle-text-muted)" }}>
                    Trades Placeholder
                  </Text>
                </Box>
              </Box>
            </Card>
          </Flex>

          {/* Right Column - Trading Interface */}
          <Flex direction="column" style={{ flex: "1 1 40%", minWidth: "320px" }} gap="4">
            <Card className="crypto-card">
              <Box p="6">
                <Flex direction="column" gap="4">
                  {/* Buy/Sell Tabs */}
                  <Tabs.Root value={activeTab} onValueChange={(v) => setActiveTab(v as "buy" | "sell")}>
                    <Tabs.List
                      style={{
                        background: "var(--oracle-secondary)",
                        borderRadius: "8px",
                        padding: "4px",
                        border: "1px solid var(--oracle-border)",
                      }}
                    >
                      <Tabs.Trigger
                        value="buy"
                        style={{
                          flex: 1,
                          fontWeight: activeTab === "buy" ? 700 : 500,
                          fontSize: "15px",
                          borderRadius: "6px",
                          transition: "all 0.2s ease",
                          ...(activeTab === "buy"
                            ? {
                                background: "var(--oracle-bullish)",
                                color: "white",
                                boxShadow: "0 2px 8px rgba(79, 188, 128, 0.3)",
                              }
                            : {
                                background: "transparent",
                                color: "var(--oracle-text-secondary)",
                              }),
                        }}
                      >
                        Buy
                      </Tabs.Trigger>
                      <Tabs.Trigger
                        value="sell"
                        style={{
                          flex: 1,
                          fontWeight: activeTab === "sell" ? 700 : 500,
                          fontSize: "15px",
                          borderRadius: "6px",
                          transition: "all 0.2s ease",
                          ...(activeTab === "sell"
                            ? {
                                background: "var(--oracle-bearish)",
                                color: "white",
                                boxShadow: "0 2px 8px rgba(255, 110, 110, 0.3)",
                              }
                            : {
                                background: "transparent",
                                color: "var(--oracle-text-secondary)",
                              }),
                        }}
                      >
                        Sell
                      </Tabs.Trigger>
                    </Tabs.List>

                    <Tabs.Content value="buy" pt="4">
                      <Flex direction="column" gap="4">
                        <Text size="3" weight="medium">
                          Buy Shares
                        </Text>
                        
                        {/* Yes/No Options - Side by Side */}
                        <Flex direction="row" gap="3">
                          <Button
                            size="4"
                            style={{
                              flex: 1,
                              height: "60px",
                              fontSize: "18px",
                              fontWeight: 600,
                              transition: "all 0.2s ease",
                              ...(selectedSide === "yes"
                                ? {
                                    background: "var(--oracle-bullish)",
                                    color: "white",
                                    boxShadow: "0 4px 12px rgba(79, 188, 128, 0.4)",
                                  }
                                : {
                                    background: "rgba(79, 188, 128, 0.2)",
                                    color: "rgba(79, 188, 128, 0.7)",
                                    border: "1px solid rgba(79, 188, 128, 0.3)",
                                  }),
                            }}
                            onClick={() => setSelectedSide(selectedSide === "yes" ? null : "yes")}
                          >
                            Yes {yesPrice}¢
                          </Button>
                          <Button
                            size="4"
                            style={{
                              flex: 1,
                              height: "60px",
                              fontSize: "18px",
                              fontWeight: 600,
                              transition: "all 0.2s ease",
                              ...(selectedSide === "no"
                                ? {
                                    background: "var(--oracle-bearish)",
                                    color: "white",
                                    boxShadow: "0 4px 12px rgba(255, 110, 110, 0.4)",
                                  }
                                : {
                                    background: "rgba(255, 110, 110, 0.2)",
                                    color: "rgba(255, 110, 110, 0.7)",
                                    border: "1px solid rgba(255, 110, 110, 0.3)",
                                  }),
                            }}
                            onClick={() => setSelectedSide(selectedSide === "no" ? null : "no")}
                          >
                            No {noPrice}¢
                          </Button>
                        </Flex>

                        {/* Amount Input */}
                        <Box>
                          <Text size="2" mb="2" style={{ display: "block", color: "var(--oracle-text-secondary)" }}>
                            Amount
                          </Text>
                          <Box
                            style={{
                              background: "var(--oracle-secondary)",
                              borderRadius: "8px",
                              padding: "16px",
                              border: "1px solid var(--oracle-border)",
                              textAlign: "center",
                            }}
                          >
                            <Text size="6" weight="bold">
                              $0
                            </Text>
                          </Box>
                          <Flex gap="2" mt="2">
                            {["+$1", "+$20", "+$100", "Max"].map((val) => (
                              <Button key={val} variant="soft" size="2" style={{ flex: 1 }}>
                                {val}
                              </Button>
                            ))}
                          </Flex>
                        </Box>

                        {/* Trade Button */}
                        <Button
                          size="4"
                          className="crypto-button"
                          style={{
                            width: "100%",
                            height: "50px",
                            fontSize: "16px",
                            fontWeight: 600,
                          }}
                        >
                          Trade
                        </Button>

                        <Text size="1" style={{ color: "var(--oracle-text-muted)", textAlign: "center" }}>
                          By trading, you agree to the Terms of Use.
                        </Text>
                      </Flex>
                    </Tabs.Content>

                    <Tabs.Content value="sell" pt="4">
                      <Flex direction="column" gap="4">
                        <Text size="3" weight="medium">
                          Sell Shares
                        </Text>
                        
                        {/* Yes/No Options - Side by Side */}
                        <Flex direction="row" gap="3">
                          <Button
                            size="4"
                            style={{
                              flex: 1,
                              height: "60px",
                              fontSize: "18px",
                              fontWeight: 600,
                              transition: "all 0.2s ease",
                              ...(selectedSide === "yes"
                                ? {
                                    background: "var(--oracle-bullish)",
                                    color: "white",
                                    boxShadow: "0 4px 12px rgba(79, 188, 128, 0.4)",
                                  }
                                : {
                                    background: "rgba(79, 188, 128, 0.2)",
                                    color: "rgba(79, 188, 128, 0.7)",
                                    border: "1px solid rgba(79, 188, 128, 0.3)",
                                  }),
                            }}
                            onClick={() => setSelectedSide(selectedSide === "yes" ? null : "yes")}
                          >
                            Yes {yesPrice}¢
                          </Button>
                          <Button
                            size="4"
                            style={{
                              flex: 1,
                              height: "60px",
                              fontSize: "18px",
                              fontWeight: 600,
                              transition: "all 0.2s ease",
                              ...(selectedSide === "no"
                                ? {
                                    background: "var(--oracle-bearish)",
                                    color: "white",
                                    boxShadow: "0 4px 12px rgba(255, 110, 110, 0.4)",
                                  }
                                : {
                                    background: "rgba(255, 110, 110, 0.2)",
                                    color: "rgba(255, 110, 110, 0.7)",
                                    border: "1px solid rgba(255, 110, 110, 0.3)",
                                  }),
                            }}
                            onClick={() => setSelectedSide(selectedSide === "no" ? null : "no")}
                          >
                            No {noPrice}¢
                          </Button>
                        </Flex>

                        {/* Amount Input */}
                        <Box>
                          <Text size="2" mb="2" style={{ display: "block", color: "var(--oracle-text-secondary)" }}>
                            Amount
                          </Text>
                          <Box
                            style={{
                              background: "var(--oracle-secondary)",
                              borderRadius: "8px",
                              padding: "16px",
                              border: "1px solid var(--oracle-border)",
                              textAlign: "center",
                            }}
                          >
                            <Text size="6" weight="bold">
                              $0
                            </Text>
                          </Box>
                          <Flex gap="2" mt="2">
                            {["+$1", "+$20", "+$100", "Max"].map((val) => (
                              <Button key={val} variant="soft" size="2" style={{ flex: 1 }}>
                                {val}
                              </Button>
                            ))}
                          </Flex>
                        </Box>

                        {/* Trade Button */}
                        <Button
                          size="4"
                          className="crypto-button"
                          style={{
                            width: "100%",
                            height: "50px",
                            fontSize: "16px",
                            fontWeight: 600,
                          }}
                        >
                          Trade
                        </Button>

                        <Text size="1" style={{ color: "var(--oracle-text-muted)", textAlign: "center" }}>
                          By trading, you agree to the Terms of Use.
                        </Text>
                      </Flex>
                    </Tabs.Content>
                  </Tabs.Root>
                </Flex>
              </Box>
            </Card>

            {/* Market Stats */}
            <Card className="crypto-card">
              <Box p="6">
                <Heading size="5" mb="4">Market Statistics</Heading>
                <Flex direction="column" gap="3">
                  <Flex justify="between" align="center">
                    <Text size="3" style={{ color: "var(--oracle-text-secondary)" }}>
                      Yes Shares
                    </Text>
                    <Text size="3" weight="bold">
                      {formatShares(totalYesShares)}
                    </Text>
                  </Flex>
                  <Separator />
                  <Flex justify="between" align="center">
                    <Text size="3" style={{ color: "var(--oracle-text-secondary)" }}>
                      No Shares
                    </Text>
                    <Text size="3" weight="bold">
                      {formatShares(totalNoShares)}
                    </Text>
                  </Flex>
                  <Separator />
                  <Flex justify="between" align="center">
                    <Text size="3" style={{ color: "var(--oracle-text-secondary)" }}>
                      Total Shares
                    </Text>
                    <Text size="3" weight="bold">
                      {formatShares(totalShares)}
                    </Text>
                  </Flex>
                  <Separator />
                  <Flex justify="between" align="center">
                    <Text size="3" style={{ color: "var(--oracle-text-secondary)" }}>
                      Collateral
                    </Text>
                    <Text size="3" weight="bold">
                      {formatCollateral(marketData.collateral)} SUI
                    </Text>
                  </Flex>
                </Flex>
              </Box>
            </Card>
          </Flex>
        </Flex>
      </Container>
    </Box>
  );
}

