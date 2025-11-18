import { useCurrentAccount } from "@mysten/dapp-kit";
import {
  Container,
  Flex,
  Heading,
  Text,
  Button,
  TextField,
  Box,
  Card,
  Select,
} from "@radix-ui/themes";
import { Alert, Snackbar } from "@mui/material";
import { useState, useRef } from "react";
import { COINS, COMPARATORS } from "../constants";
import { CreateMarketModal } from "../components/CreateMarketModal";

export function CreateMarketPage() {
  const account = useCurrentAccount();

  const [coin, setCoin] = useState("");
  const [comparator, setComparator] = useState<number | "">("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [alertState, setAlertState] = useState<{
    open: boolean;
    message: string;
    severity: "error" | "warning" | "info" | "success";
  }>({
    open: false,
    message: "",
    severity: "error",
  });

  const showAlert = (
    message: string,
    severity: "error" | "warning" | "info" | "success" = "error",
  ) => {
    setAlertState({ open: true, message, severity });
  };

  const handleCreateMarket = () => {
    if (!coin || comparator === "" || !price || !date) {
      showAlert("Please fill in all fields", "warning");
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      showAlert("Please enter a valid positive number for price", "warning");
      return;
    }

    setShowCreateModal(true);
  };

  const handleMarketCreated = () => {
    // Reset form after market is created
    setCoin("");
    setComparator("");
    setPrice("");
    setDate("");
  };

  if (!account) {
    return (
      <Box className="page-container">
        <Container size="4" py="6">
          <Card className="crypto-card">
            <Box p="6">
              <Text size="4" color="gray">
                Please connect your wallet to create a market.
              </Text>
            </Box>
          </Card>
        </Container>
      </Box>
    );
  }

  return (
    <Box className="page-container">
      <Container
        size="3"
        py="8"
        style={{ maxWidth: "1200px", margin: "0 auto" }}
      >
        <Box mb="8" style={{ textAlign: "center" }}>
          <Heading
            size="9"
            mb="3"
            className="text-gradient"
            style={{ fontWeight: 700 }}
          >
            Create Market
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
            Create a prediction market by specifying a crypto price question.
            Once validated, you can deploy the market on-chain where others can
            trade shares based on the outcome.
          </Text>
        </Box>

        <Card
          className="crypto-card"
          style={{
            background: "var(--oracle-bg-card)",
            border: "1px solid var(--oracle-border)",
            boxShadow:
              "0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--oracle-border)",
            overflow: "hidden",
            maxWidth: "900px",
            margin: "0 auto",
            backdropFilter: "blur(12px)",
          }}
        >
          <Box p="10">
            <Box mb="8">
              <Flex align="center" gap="2" mb="6">
                <Box
                  style={{
                    width: "4px",
                    height: "24px",
                    background:
                      "linear-gradient(180deg, var(--oracle-primary) 0%, var(--oracle-glow) 100%)",
                    borderRadius: "2px",
                  }}
                />
                <Text
                  size="4"
                  weight="medium"
                  style={{
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    fontSize: "12px",
                    color: "var(--oracle-text-secondary)",
                  }}
                >
                  Market Question
                </Text>
              </Flex>

              <Box
                p="6"
                style={{
                  background: "var(--oracle-secondary)",
                  borderRadius: "12px",
                  border: "1px solid var(--oracle-border)",
                  position: "relative",
                }}
              >
                <Flex
                  wrap="wrap"
                  align="center"
                  justify="center"
                  gap="3"
                  style={{
                    fontSize: "24px",
                    lineHeight: "1.7",
                    fontWeight: 400,
                  }}
                >
                  <Text
                    size="5"
                    weight="medium"
                    style={{
                      whiteSpace: "nowrap",
                      color: "var(--oracle-text-primary)",
                    }}
                  >
                    Will
                  </Text>

                  <Box style={{ position: "relative" }}>
                    <Select.Root value={coin} onValueChange={setCoin}>
                      <Select.Trigger
                        placeholder="Select coin"
                        style={{ minWidth: "200px" }}
                        className={`form-input ${coin ? "form-input-filled" : ""}`}
                      >
                        {coin &&
                          (() => {
                            const selectedCoin = COINS.find(
                              (c) => c.value === coin,
                            );
                            return selectedCoin ? (
                              <Flex align="center" gap="2">
                                {selectedCoin.image_svg_url && (
                                  <Box
                                    style={{
                                      width: "20px",
                                      height: "20px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      flexShrink: 0,
                                    }}
                                  >
                                    <img
                                      src={selectedCoin.image_svg_url}
                                      alt={selectedCoin.name}
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
                                <Text>{selectedCoin.name}</Text>
                              </Flex>
                            ) : null;
                          })()}
                      </Select.Trigger>
                      <Select.Content>
                        {COINS.map((coinOption) => (
                          <Select.Item
                            key={coinOption.value}
                            value={coinOption.value}
                          >
                            <Flex align="center" gap="2">
                              {coinOption.image_svg_url && (
                                <Box
                                  style={{
                                    width: "20px",
                                    height: "20px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                  }}
                                >
                                  <img
                                    src={coinOption.image_svg_url}
                                    alt={coinOption.name}
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
                              <Text>{coinOption.name}</Text>
                            </Flex>
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                    {coin && (
                      <Box
                        style={{
                          position: "absolute",
                          right: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          pointerEvents: "none",
                        }}
                      >
                        <Text
                          size="2"
                          style={{ color: "var(--oracle-bullish)" }}
                          weight="bold"
                        >
                          ✓
                        </Text>
                      </Box>
                    )}
                  </Box>

                  <Text
                    size="5"
                    weight="medium"
                    style={{
                      whiteSpace: "nowrap",
                      color: "var(--gray-12)",
                    }}
                  >
                    be
                  </Text>

                  <Box style={{ position: "relative" }}>
                    <Select.Root
                      value={
                        comparator === "" ? undefined : comparator.toString()
                      }
                      onValueChange={(value) => setComparator(parseInt(value))}
                    >
                      <Select.Trigger
                        placeholder="Select condition"
                        style={{ minWidth: "220px" }}
                        className={`form-input ${comparator !== "" ? "form-input-filled" : ""}`}
                      />
                      <Select.Content>
                        {COMPARATORS.map((comp) => (
                          <Select.Item
                            key={comp.value}
                            value={comp.value.toString()}
                          >
                            {comp.display}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                    {comparator && (
                      <Box
                        style={{
                          position: "absolute",
                          right: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          pointerEvents: "none",
                        }}
                      >
                        <Text
                          size="2"
                          style={{ color: "var(--oracle-bullish)" }}
                          weight="bold"
                        >
                          ✓
                        </Text>
                      </Box>
                    )}
                  </Box>

                  <Text
                    size="5"
                    weight="medium"
                    style={{
                      whiteSpace: "nowrap",
                      color: "var(--oracle-text-primary)",
                    }}
                  >
                    than
                  </Text>

                  <Box style={{ position: "relative" }}>
                    <TextField.Root
                      type="number"
                      placeholder="Enter price"
                      size="3"
                      value={price}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "" || /^\d*\.?\d*$/.test(value)) {
                          setPrice(value);
                        }
                      }}
                      style={{ width: "220px" }}
                      className={`form-input ${price ? "form-input-filled" : ""}`}
                    />
                    {price && (
                      <Box
                        style={{
                          position: "absolute",
                          right: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          pointerEvents: "none",
                        }}
                      >
                        <Text
                          size="2"
                          style={{ color: "var(--oracle-bullish)" }}
                          weight="bold"
                        >
                          ✓
                        </Text>
                      </Box>
                    )}
                  </Box>

                  <Text
                    size="5"
                    weight="medium"
                    style={{
                      whiteSpace: "nowrap",
                      color: "var(--gray-12)",
                    }}
                  >
                    at closing of
                  </Text>

                  <Box style={{ position: "relative" }}>
                    <TextField.Root
                      type="text"
                      size="3"
                      placeholder="YYYY-MM-DD"
                      value={date || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow YYYY-MM-DD format input
                        if (value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value)) {
                          setDate(value);
                        }
                      }}
                      style={{ width: "240px", paddingRight: "50px" }}
                      className={`form-input ${date ? "form-input-filled" : ""}`}
                    />
                    <input
                      ref={dateInputRef}
                      type="date"
                      value={date || ""}
                      onChange={(e) => setDate(e.target.value)}
                      style={{
                        position: "absolute",
                        right: date ? "40px" : "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        opacity: 0,
                        width: "32px",
                        height: "32px",
                        cursor: "pointer",
                        pointerEvents: "auto",
                        zIndex: 1,
                      }}
                    />
                    <Box
                      style={{
                        position: "absolute",
                        right: date ? "40px" : "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "auto",
                        zIndex: 2,
                        cursor: "pointer",
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (dateInputRef.current) {
                          dateInputRef.current.showPicker?.();
                        }
                      }}
                    >
                      <Text
                        size="3"
                        style={{
                          color: "var(--oracle-text-muted)",
                          userSelect: "none",
                        }}
                      >
                        📅
                      </Text>
                    </Box>
                    {date && (
                      <Box
                        style={{
                          position: "absolute",
                          right: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          pointerEvents: "none",
                        }}
                      >
                        <Text
                          size="2"
                          style={{ color: "var(--oracle-bullish)" }}
                          weight="bold"
                        >
                          ✓
                        </Text>
                      </Box>
                    )}
                  </Box>

                  <Text
                    size="5"
                    weight="medium"
                    style={{
                      whiteSpace: "nowrap",
                      color: "var(--oracle-text-primary)",
                    }}
                  >
                    ?
                  </Text>
                </Flex>
              </Box>
            </Box>

            <Flex
              gap="4"
              align="center"
              justify="center"
              style={{
                paddingTop: "32px",
                borderTop: "2px solid var(--oracle-border)",
                marginTop: "8px",
              }}
            >
              <Button
                size="3"
                className="crypto-button"
                onClick={handleCreateMarket}
                disabled={!coin || comparator === "" || !price || !date}
                style={{
                  minWidth: "200px",
                  height: "52px",
                  fontSize: "17px",
                  fontWeight: 600,
                  borderRadius: "10px",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  opacity:
                    !coin || comparator === "" || !price || !date ? 0.5 : 1,
                  background:
                    "linear-gradient(135deg, var(--market-primary) 0%, var(--market-primary-light) 100%)",
                  boxShadow: "0 4px 20px rgba(59, 130, 246, 0.4)",
                }}
              >
                Create Market
              </Button>
            </Flex>
          </Box>
        </Card>

        <Snackbar
          open={alertState.open}
          autoHideDuration={6000}
          onClose={() => setAlertState({ ...alertState, open: false })}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          style={{ zIndex: 2000 }}
          sx={{
            top: "160px !important",
            "& .MuiSnackbar-root": {
              zIndex: "2000 !important",
            },
            "& .MuiSnackbarContent-root": {
              minWidth: "400px",
            },
          }}
        >
          <Alert
            onClose={() => setAlertState({ ...alertState, open: false })}
            severity={alertState.severity}
            sx={{
              width: "100%",
              fontSize: "18px",
              padding: "20px 24px",
              "& .MuiAlert-icon": {
                fontSize: "28px",
                marginRight: "16px",
              },
              "& .MuiAlert-message": {
                fontSize: "18px",
                fontWeight: 500,
                lineHeight: 1.5,
              },
            }}
          >
            {alertState.message}
          </Alert>
        </Snackbar>

        {coin && comparator !== "" && price && date && (
          <CreateMarketModal
            open={showCreateModal}
            onOpenChange={setShowCreateModal}
            marketData={{
              coin,
              comparator: comparator as number,
              price,
              date,
            }}
            onCreated={handleMarketCreated}
          />
        )}
      </Container>
    </Box>
  );
}
