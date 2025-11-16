import { Box, Card, Flex, Text, Badge, Button } from "@radix-ui/themes";
import { useNavigate } from "react-router-dom";
import { Market } from "../services/graphqlService";
import { COINS } from "../constants";

interface MarketCardProps {
  market: Market;
}

export function MarketCard({ market }: MarketCardProps) {
  const navigate = useNavigate();
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

  const formatAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getComparatorLabel = (comparator: string): string => {
    return comparator === "1" ? "≤" : "≥";
  };

  const formatShares = (shares: bigint): string => {
    const num = Number(shares) / 1_000_000_000; // Convert from MIST to SUI
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(2)}k`;
    return num.toFixed(2);
  };

  // Find coin data from constants
  const coinData = COINS.find((c) => c.value === marketData.coin.toLowerCase());
  const coinSymbol =
    coinData?.symbol.toUpperCase() || marketData.coin.toUpperCase();
  const coinImageUrl = coinData?.image_svg_url;

  return (
    <Card
      className="crypto-card market-card"
      style={{
        border: isResolved
          ? winningSide === "YES"
            ? "2px solid var(--oracle-bullish)"
            : "2px solid var(--oracle-bearish)"
          : undefined,
        position: "relative",
        cursor: "pointer",
      }}
      onClick={() => navigate(`/market/${market.address}`)}
    >
      {/* Resolved Badge */}
      {isResolved && (
        <Box
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            zIndex: 10,
          }}
        >
          <Badge
            color={winningSide === "YES" ? "green" : "red"}
            size="2"
            style={{
              fontWeight: 600,
              textTransform: "uppercase",
              fontSize: "10px",
              letterSpacing: "0.5px",
            }}
          >
            {winningSide} Won
          </Badge>
        </Box>
      )}

      <Box p="4">
        <Flex
          direction="row"
          gap="4"
          align="stretch"
          style={{ minHeight: "180px" }}
        >
          {/* Left Side: Question and Info */}
          <Flex
            direction="column"
            justify="between"
            style={{ flex: "1 1 50%", minWidth: 0 }}
          >
            {/* Header: Coin and Status */}
            <Box>
              <Flex justify="between" align="center" mb="2">
                <Flex align="center" gap="2">
                  {coinImageUrl && (
                    <Box
                      style={{
                        width: "32px",
                        height: "32px",
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
                          // Hide image if it fails to load (broken image)
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </Box>
                  )}
                  <Badge
                    color="blue"
                    size="2"
                    style={{ fontSize: "11px", fontWeight: 600 }}
                  >
                    {coinSymbol}
                  </Badge>
                </Flex>
                {!isResolved && (
                  <Badge variant="soft" size="1" style={{ fontSize: "10px" }}>
                    Active
                  </Badge>
                )}
              </Flex>

              {/* Market Question */}
              <Text
                size="4"
                weight="medium"
                style={{
                  lineHeight: 1.5,
                  color: "var(--oracle-text-primary)",
                  display: "block",
                  marginBottom: "12px",
                }}
              >
                Will {marketData.coin} be{" "}
                {getComparatorLabel(marketData.comparator)} $
                {formatPrice(marketData.price)} on {marketData.date}?
              </Text>

              {/* Market Info Footer */}
              <Flex gap="4" mt="auto" pt="2">
                <Box>
                  <Text
                    size="1"
                    mb="1"
                    style={{
                      display: "block",
                      color: "var(--oracle-text-muted)",
                    }}
                  >
                    Market ID
                  </Text>
                  <Text
                    size="1"
                    style={{
                      fontFamily: "monospace",
                      color: "var(--oracle-text-secondary)",
                    }}
                  >
                    {formatAddress(market.address)}
                  </Text>
                </Box>
                <Box>
                  <Text
                    size="1"
                    mb="1"
                    style={{
                      display: "block",
                      color: "var(--oracle-text-muted)",
                    }}
                  >
                    Volume
                  </Text>
                  <Text
                    size="2"
                    weight="medium"
                    style={{
                      color: "var(--oracle-text-primary)",
                    }}
                  >
                    ${formatShares(totalYesShares + totalNoShares)}
                  </Text>
                </Box>
              </Flex>
            </Box>
          </Flex>

          {/* Right Side: Stats and Buttons */}
          <Flex
            direction="column"
            justify="between"
            style={{ flex: "1 1 50%", minWidth: 0 }}
          >
            {/* Chance Indicator - Polymarket Style */}
            <Box
              style={{
                background: "var(--oracle-secondary)",
                borderRadius: "12px",
                padding: "14px",
                border: "1px solid var(--oracle-border)",
                flex: 1,
              }}
            >
              <Flex direction="column" gap="2">
                {/* Yes Side */}
                <Box>
                  <Flex justify="between" align="center" mb="1">
                    <Text
                      size="2"
                      weight="medium"
                      style={{ color: "var(--oracle-text-secondary)" }}
                    >
                      Yes
                    </Text>
                    <Flex align="center" gap="2">
                      <Text
                        size="4"
                        weight="bold"
                        style={{ color: "var(--oracle-bullish)" }}
                      >
                        {yesPercentage.toFixed(1)}%
                      </Text>
                      {isResolved && winningSide === "YES" && (
                        <Badge color="green" size="1">
                          ✓
                        </Badge>
                      )}
                    </Flex>
                  </Flex>
                  <Box
                    style={{
                      height: "6px",
                      borderRadius: "3px",
                      background: "rgba(79, 188, 128, 0.2)",
                      position: "relative",
                      overflow: "hidden",
                      marginBottom: "4px",
                    }}
                  >
                    <Box
                      style={{
                        height: "100%",
                        width: `${yesPercentage}%`,
                        background: "var(--oracle-bullish)",
                        borderRadius: "3px",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </Box>
                  <Text
                    size="1"
                    style={{
                      display: "block",
                      color: "var(--oracle-text-muted)",
                    }}
                  >
                    {formatShares(totalYesShares)} shares
                  </Text>
                </Box>

                {/* No Side */}
                <Box>
                  <Flex justify="between" align="center" mb="1">
                    <Text
                      size="2"
                      weight="medium"
                      style={{ color: "var(--oracle-text-secondary)" }}
                    >
                      No
                    </Text>
                    <Flex align="center" gap="2">
                      <Text
                        size="4"
                        weight="bold"
                        style={{ color: "var(--oracle-bearish)" }}
                      >
                        {noPercentage.toFixed(1)}%
                      </Text>
                      {isResolved && winningSide === "NO" && (
                        <Badge color="red" size="1">
                          ✓
                        </Badge>
                      )}
                    </Flex>
                  </Flex>
                  <Box
                    style={{
                      height: "6px",
                      borderRadius: "3px",
                      background: "rgba(255, 110, 110, 0.2)",
                      position: "relative",
                      overflow: "hidden",
                      marginBottom: "4px",
                    }}
                  >
                    <Box
                      style={{
                        height: "100%",
                        width: `${noPercentage}%`,
                        background: "var(--oracle-bearish)",
                        borderRadius: "3px",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </Box>
                  <Text
                    size="1"
                    style={{
                      display: "block",
                      color: "var(--oracle-text-muted)",
                    }}
                  >
                    {formatShares(totalNoShares)} shares
                  </Text>
                </Box>
              </Flex>
            </Box>

            {/* Action Buttons - Polymarket Style */}
            {!isResolved && (
              <Flex gap="2" mt="3" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="3"
                  className="market-button-yes"
                  style={{
                    flex: 1,
                    height: "44px",
                    fontWeight: 600,
                    fontSize: "15px",
                    borderRadius: "10px",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/market/${market.address}`);
                  }}
                >
                  Yes
                </Button>
                <Button
                  size="3"
                  className="market-button-no"
                  style={{
                    flex: 1,
                    height: "44px",
                    fontWeight: 600,
                    fontSize: "15px",
                    borderRadius: "10px",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/market/${market.address}`);
                  }}
                >
                  No
                </Button>
              </Flex>
            )}
          </Flex>
        </Flex>
      </Box>
    </Card>
  );
}
