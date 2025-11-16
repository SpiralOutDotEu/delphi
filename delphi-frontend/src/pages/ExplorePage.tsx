import { useSuiClient } from "@mysten/dapp-kit";
import {
  Container,
  Flex,
  Heading,
  Text,
  Box,
  Card,
  Spinner,
  Grid,
} from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { networkConfig } from "../networkConfig";
import { fetchMarkets, Market } from "../services/graphqlService";
import { MarketCard } from "../components/MarketCard";

export function ExplorePage() {
  const client = useSuiClient();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getCurrentNetwork = () => {
    const url = (client as any).url || "";
    if (url.includes("devnet")) return "devnet";
    if (url.includes("testnet")) return "testnet";
    if (url.includes("mainnet")) return "mainnet";
    if (url.includes("localhost") || url.includes("127.0.0.1")) return "local";
    return "testnet";
  };

  const currentNetwork = getCurrentNetwork();
  const delphiPackageId =
    (networkConfig[currentNetwork as keyof typeof networkConfig] as any)
      ?.delphiPackageId || "0x0";

  useEffect(() => {
    const loadMarkets = async () => {
      if (delphiPackageId === "0x0") {
        setError("Delphi package ID not configured for this network");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const marketObjects = await fetchMarkets(
          currentNetwork,
          delphiPackageId,
        );
        // Sort by timestamp, newest first
        const sortedMarkets = marketObjects.sort((a, b) => {
          const timestampA = BigInt(a.asMoveObject.contents.json.timestamp_ms);
          const timestampB = BigInt(b.asMoveObject.contents.json.timestamp_ms);
          return timestampB > timestampA ? 1 : timestampB < timestampA ? -1 : 0;
        });
        setMarkets(sortedMarkets);
      } catch (err) {
        console.error("Failed to load markets:", err);
        setError(err instanceof Error ? err.message : "Failed to load markets");
      } finally {
        setIsLoading(false);
      }
    };

    loadMarkets();
  }, [currentNetwork, delphiPackageId]);

  return (
    <Box className="page-container">
      <Container
        size="3"
        py="8"
        style={{ maxWidth: "1400px", margin: "0 auto" }}
      >
        <Box mb="8" style={{ textAlign: "center" }}>
          <Heading
            size="9"
            mb="3"
            className="text-gradient"
            style={{ fontWeight: 700 }}
          >
            Explore Markets
          </Heading>
          <Text
            size="4"
            style={{
              lineHeight: "1.7",
              maxWidth: "700px",
              margin: "0 auto",
              color: "var(--oracle-text-secondary)",
            }}
          >
            Browse all created prediction markets on the network. Trade shares
            and participate in crypto price predictions.
          </Text>
        </Box>

        {isLoading ? (
          <Flex justify="center" align="center" py="12">
            <Spinner size="3" />
            <Text
              ml="3"
              size="3"
              style={{ color: "var(--oracle-text-secondary)" }}
            >
              Loading markets...
            </Text>
          </Flex>
        ) : error ? (
          <Card className="crypto-card">
            <Box p="6">
              <Text
                size="3"
                style={{
                  color: "var(--oracle-bearish)",
                  fontWeight: 500,
                }}
              >
                Error: {error}
              </Text>
            </Box>
          </Card>
        ) : markets.length === 0 ? (
          <Card className="crypto-card">
            <Box p="6" style={{ textAlign: "center" }}>
              <Text
                size="4"
                style={{
                  color: "var(--oracle-text-secondary)",
                  lineHeight: "1.6",
                }}
              >
                No markets found. Be the first to create one!
              </Text>
            </Box>
          </Card>
        ) : (
          <Grid columns={{ initial: "1", sm: "1", md: "2", lg: "2" }} gap="4">
            {markets.map((market) => (
              <MarketCard key={market.address} market={market} />
            ))}
          </Grid>
        )}

        {markets.length > 0 && (
          <Box mt="6" style={{ textAlign: "center" }}>
            <Text
              size="2"
              style={{
                color: "var(--oracle-text-muted)",
              }}
            >
              Showing {markets.length} market{markets.length !== 1 ? "s" : ""}
            </Text>
          </Box>
        )}
      </Container>
    </Box>
  );
}
