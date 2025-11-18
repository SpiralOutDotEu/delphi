import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  Card,
  Badge,
  Tabs,
  Spinner,
} from "@radix-ui/themes";
import { DataGrid } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { networkConfig } from "../networkConfig";
import {
  getUserPositions,
  getUserClosedPositions,
  Position,
  PositionClosedEvent,
} from "../services/graphqlService";

export function MyPositionsPage() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"open" | "closed">("open");
  const [openPositions, setOpenPositions] = useState<Position[]>([]);
  const [closedPositions, setClosedPositions] = useState<PositionClosedEvent[]>(
    [],
  );
  const [isLoadingOpen, setIsLoadingOpen] = useState(false);
  const [isLoadingClosed, setIsLoadingClosed] = useState(false);
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
    if (!account || !delphiPackageId) return;

    if (activeTab === "open") {
      loadOpenPositions();
    } else {
      loadClosedPositions();
    }
  }, [account, delphiPackageId, activeTab]);

  const loadOpenPositions = async () => {
    if (!account || !delphiPackageId) return;

    setIsLoadingOpen(true);
    setError(null);

    try {
      const positions = await getUserPositions(
        currentNetwork,
        account.address,
        delphiPackageId,
      );
      setOpenPositions(positions);
    } catch (err) {
      console.error("Error loading open positions:", err);
      setError(err instanceof Error ? err.message : "Failed to load positions");
    } finally {
      setIsLoadingOpen(false);
    }
  };

  const loadClosedPositions = async () => {
    if (!account || !delphiPackageId) return;

    setIsLoadingClosed(true);
    setError(null);

    try {
      const closed = await getUserClosedPositions(
        currentNetwork,
        account.address,
        delphiPackageId,
      );
      setClosedPositions(closed);
    } catch (err) {
      console.error("Error loading closed positions:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load closed positions",
      );
    } finally {
      setIsLoadingClosed(false);
    }
  };

  const formatShares = (shares: string | number): string => {
    const num = typeof shares === "string" ? parseInt(shares, 10) : shares;
    return num.toLocaleString();
  };

  const formatPayout = (payout: string): string => {
    const num = parseInt(payout, 10);
    // PSEUDO_USDC has 6 decimals
    const formatted = (num / 1_000_000).toFixed(6);
    return `${formatted} USDC`;
  };

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString();
  };

  const handlePositionClick = (marketId: string) => {
    navigate(`/market/${marketId}`);
  };

  // Prepare closed positions data for DataGrid
  const closedPositionsData = closedPositions.map((event, index) => ({
    id: event.contents.json.position_id || index,
    marketId: event.contents.json.market_id,
    positionId: event.contents.json.position_id,
    winningShares: formatShares(event.contents.json.winning_shares),
    totalPayout: formatPayout(event.contents.json.total_payout),
    timestamp: formatTimestamp(event.timestamp),
    rawTimestamp: event.timestamp,
  }));

  return (
    <Box className="page-container">
      <Container size="4" py="6">
        <Box mb="8" style={{ textAlign: "center" }}>
          <Heading
            size="9"
            mb="3"
            className="text-gradient"
            style={{ fontWeight: 700 }}
          >
            My Positions
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
            View and manage your open and closed positions across all prediction
            markets.
          </Text>
        </Box>

        {!account ? (
          <Card className="crypto-card">
            <Box p="6">
              <Text size="4" color="gray">
                Please connect your wallet to view your positions.
              </Text>
            </Box>
          </Card>
        ) : error ? (
          <Card className="crypto-card">
            <Box p="6">
              <Text size="4" color="red">
                Error: {error}
              </Text>
            </Box>
          </Card>
        ) : (
          <Tabs.Root
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "open" | "closed")}
          >
            <Tabs.List>
              <Tabs.Trigger value="open">Open Positions</Tabs.Trigger>
              <Tabs.Trigger value="closed">Closed Positions</Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="open" style={{ paddingTop: "24px" }}>
              {isLoadingOpen ? (
                <Card className="crypto-card">
                  <Box
                    p="6"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: "200px",
                    }}
                  >
                    <Spinner size="3" />
                  </Box>
                </Card>
              ) : openPositions.length === 0 ? (
                <Card className="crypto-card">
                  <Box p="6">
                    <Text size="4" color="gray">
                      No open positions found.
                    </Text>
                  </Box>
                </Card>
              ) : (
                <Box
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(300px, 1fr))",
                    gap: "20px",
                  }}
                >
                  {openPositions.map((position) => {
                    const yesShares = parseInt(
                      position.asMoveObject.contents.json.yes_shares || "0",
                      10,
                    );
                    const noShares = parseInt(
                      position.asMoveObject.contents.json.no_shares || "0",
                      10,
                    );
                    const marketId = position.asMoveObject.contents.json.market;

                    return (
                      <Card
                        key={position.address}
                        className="crypto-card crypto-glow-hover"
                        style={{ cursor: "pointer" }}
                        onClick={() => handlePositionClick(marketId)}
                      >
                        <Box p="5">
                          <Flex direction="column" gap="3">
                            <Flex justify="between" align="center">
                              <Badge color="violet" size="2">
                                Position
                              </Badge>
                              <Badge color="green" size="2">
                                Open
                              </Badge>
                            </Flex>
                            <Box>
                              <Text
                                size="2"
                                color="gray"
                                style={{
                                  display: "block",
                                  marginBottom: "8px",
                                }}
                              >
                                Market ID
                              </Text>
                              <Text
                                size="3"
                                style={{
                                  fontFamily: "monospace",
                                  wordBreak: "break-all",
                                  color: "var(--crypto-accent)",
                                  display: "block",
                                }}
                              >
                                {marketId.slice(0, 8)}...{marketId.slice(-8)}
                              </Text>
                            </Box>
                            <Flex gap="4">
                              <Box>
                                <Text
                                  size="2"
                                  color="gray"
                                  style={{
                                    display: "block",
                                    marginBottom: "8px",
                                  }}
                                >
                                  YES Shares
                                </Text>
                                <Text
                                  size="4"
                                  weight="bold"
                                  color="green"
                                  style={{ display: "block" }}
                                >
                                  {formatShares(yesShares)}
                                </Text>
                              </Box>
                              <Box>
                                <Text
                                  size="2"
                                  color="gray"
                                  style={{
                                    display: "block",
                                    marginBottom: "8px",
                                  }}
                                >
                                  NO Shares
                                </Text>
                                <Text
                                  size="4"
                                  weight="bold"
                                  color="red"
                                  style={{ display: "block" }}
                                >
                                  {formatShares(noShares)}
                                </Text>
                              </Box>
                            </Flex>
                            <Text
                              size="1"
                              color="gray"
                              style={{ marginTop: "8px" }}
                            >
                              Click to view market
                            </Text>
                          </Flex>
                        </Box>
                      </Card>
                    );
                  })}
                </Box>
              )}
            </Tabs.Content>

            <Tabs.Content value="closed" style={{ paddingTop: "24px" }}>
              {isLoadingClosed ? (
                <Card className="crypto-card">
                  <Box
                    p="6"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: "200px",
                    }}
                  >
                    <Spinner size="3" />
                  </Box>
                </Card>
              ) : closedPositions.length === 0 ? (
                <Card className="crypto-card">
                  <Box p="6">
                    <Text size="4" color="gray">
                      No closed positions found.
                    </Text>
                  </Box>
                </Card>
              ) : (
                <Card className="crypto-card">
                  <Box p="6">
                    <Box
                      style={{
                        height: "600px",
                        width: "100%",
                      }}
                    >
                      <DataGrid
                        rows={closedPositionsData}
                        columns={[
                          {
                            field: "timestamp",
                            headerName: "Closed At",
                            width: 200,
                            minWidth: 180,
                            sortable: true,
                            flex: 1,
                          },
                          {
                            field: "marketId",
                            headerName: "Market ID",
                            width: 200,
                            minWidth: 180,
                            renderCell: (params) => (
                              <Box
                                style={{
                                  fontFamily: "monospace",
                                  fontSize: "12px",
                                  color: "var(--crypto-accent)",
                                  cursor: "pointer",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePositionClick(params.value as string);
                                }}
                              >
                                {String(params.value).slice(0, 8)}...
                                {String(params.value).slice(-8)}
                              </Box>
                            ),
                          },
                          {
                            field: "positionId",
                            headerName: "Position ID",
                            width: 200,
                            minWidth: 180,
                            renderCell: (params) => (
                              <Box
                                style={{
                                  fontFamily: "monospace",
                                  fontSize: "12px",
                                }}
                              >
                                {String(params.value).slice(0, 8)}...
                                {String(params.value).slice(-8)}
                              </Box>
                            ),
                          },
                          {
                            field: "winningShares",
                            headerName: "Winning Shares",
                            width: 150,
                            minWidth: 120,
                            sortable: true,
                            renderCell: (params) => (
                              <Text weight="bold" color="green">
                                {params.value}
                              </Text>
                            ),
                          },
                          {
                            field: "totalPayout",
                            headerName: "Total Payout",
                            width: 150,
                            minWidth: 120,
                            sortable: true,
                            renderCell: (params) => (
                              <Text weight="bold" color="violet">
                                {params.value}
                              </Text>
                            ),
                          },
                        ]}
                        disableColumnMenu
                        disableColumnSelector
                        disableRowSelectionOnClick
                        autoHeight={false}
                        initialState={{
                          sorting: {
                            sortModel: [{ field: "timestamp", sort: "desc" }],
                          },
                        }}
                        sx={{
                          border: "1px solid var(--oracle-border)",
                          borderRadius: "8px",
                          backgroundColor: "var(--oracle-bg-card)",
                          "& .MuiDataGrid-root": {
                            border: "none",
                            color: "var(--oracle-text-primary)",
                          },
                          "& .MuiDataGrid-main": {
                            overflowX: "hidden",
                          },
                          "& .MuiDataGrid-virtualScroller": {
                            overflowX: "hidden !important",
                          },
                          "& .MuiDataGrid-columnHeadersInner": {
                            width: "100% !important",
                          },
                          "& .MuiDataGrid-cell": {
                            color: "var(--oracle-text-primary)",
                            borderColor: "var(--oracle-border)",
                            backgroundColor: "transparent",
                          },
                          "& .MuiDataGrid-columnHeaders": {
                            backgroundColor: "var(--oracle-bg-card)",
                            background: "var(--oracle-bg-card)",
                            color: "var(--oracle-text-primary)",
                            borderColor: "var(--oracle-border)",
                            borderBottom: "2px solid var(--oracle-border)",
                            fontWeight: 600,
                            fontSize: "0.875rem",
                            "& .MuiDataGrid-columnHeaderTitle": {
                              fontWeight: 600,
                              color: "var(--oracle-text-primary)",
                            },
                            "& .MuiDataGrid-columnHeader": {
                              backgroundColor: "var(--oracle-bg-card)",
                              borderColor: "var(--oracle-border)",
                              "&:focus": {
                                backgroundColor: "var(--oracle-bg-card)",
                              },
                              "&:focus-within": {
                                backgroundColor: "var(--oracle-bg-card)",
                              },
                            },
                            "& .MuiDataGrid-iconButtonContainer": {
                              color: "var(--oracle-text-secondary)",
                              "& .MuiIconButton-root": {
                                color: "var(--oracle-text-secondary)",
                                "&:hover": {
                                  backgroundColor:
                                    "var(--oracle-input-hover-bg)",
                                  color: "var(--oracle-text-primary)",
                                },
                              },
                            },
                          },
                          "& .MuiDataGrid-row": {
                            width: "100% !important",
                            backgroundColor: "transparent",
                            "&:nth-of-type(even)": {
                              backgroundColor: "rgba(58, 141, 255, 0.02)",
                            },
                            "&:hover": {
                              backgroundColor:
                                "var(--oracle-input-hover-bg) !important",
                            },
                          },
                          "& .MuiDataGrid-footerContainer": {
                            borderColor: "var(--oracle-border)",
                            borderTop: "1px solid var(--oracle-border)",
                            backgroundColor: "var(--oracle-secondary)",
                            color: "var(--oracle-text-primary)",
                          },
                          "& .MuiDataGrid-toolbarContainer": {
                            backgroundColor: "var(--oracle-secondary)",
                            color: "var(--oracle-text-primary)",
                          },
                          "& .MuiDataGrid-menuIcon": {
                            color: "var(--oracle-text-secondary)",
                          },
                          "& .MuiDataGrid-sortIcon": {
                            color: "var(--oracle-text-secondary)",
                          },
                          "& .MuiDataGrid-selectedRowCount": {
                            color: "var(--oracle-text-primary)",
                          },
                          "& .MuiTablePagination-root": {
                            color: "var(--oracle-text-primary)",
                          },
                          "& .MuiTablePagination-selectLabel": {
                            color: "var(--oracle-text-secondary)",
                          },
                          "& .MuiTablePagination-displayedRows": {
                            color: "var(--oracle-text-secondary)",
                          },
                          "& .MuiTablePagination-select": {
                            color: "var(--oracle-text-primary)",
                          },
                          "& .MuiTablePagination-actions": {
                            "& .MuiIconButton-root": {
                              color: "var(--oracle-text-secondary)",
                              "&:hover": {
                                backgroundColor: "var(--oracle-input-hover-bg)",
                              },
                              "&.Mui-disabled": {
                                color: "var(--oracle-text-muted)",
                              },
                            },
                          },
                        }}
                      />
                    </Box>
                  </Box>
                </Card>
              )}
            </Tabs.Content>
          </Tabs.Root>
        )}
      </Container>
    </Box>
  );
}
