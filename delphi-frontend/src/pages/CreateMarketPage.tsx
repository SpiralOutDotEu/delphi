import {
  useCurrentAccount,
  useSignTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
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
  Dialog,
} from "@radix-ui/themes";
import { useState, useRef } from "react";
import { networkConfig } from "../networkConfig";
import {
  COINS,
  COMPARATORS,
  API_ENDPOINT,
  MARKET_TYPE,
  MARKET_RESULT,
} from "../constants";

interface ApiResponse {
  intent_scope: number;
  timestamp_ms: string;
  payload: {
    type: number;
    date: string;
    coin: string;
    comparator: number;
    price: string;
    result: number;
  };
  signature: string;
  public_key: string;
  message_bcs: string;
}

export function CreateMarketPage() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutateAsync: signTransaction } = useSignTransaction();

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
  const delphiConfigObjectId =
    (networkConfig[currentNetwork as keyof typeof networkConfig] as any)
      ?.delphiConfigObjectId || "0x0";
  const enclavePackageId =
    (networkConfig[currentNetwork as keyof typeof networkConfig] as any)
      ?.enclavePackageId || "0x0";
  const enclaveObjectId =
    (networkConfig[currentNetwork as keyof typeof networkConfig] as any)
      ?.enclaveObjectId || "0x0";

  const [coin, setCoin] = useState("");
  const [comparator, setComparator] = useState<number | "">("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [transactionResult, setTransactionResult] = useState<{
    success: boolean;
    message: string;
    marketId?: string;
  } | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const formatDateForAPI = (dateStr: string): string => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}-${month}-${year}`;
  };

  const convertPriceToInteger = (priceStr: string): string => {
    const num = parseFloat(priceStr);
    if (isNaN(num)) return "0";
    return Math.floor(num * 1_000_000_000).toString();
  };

  const hexToBytes = (hex: string): number[] => {
    const cleanHex = hex.replace(/^0x/, "");
    const bytes: number[] = [];
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes.push(parseInt(cleanHex.substr(i, 2), 16));
    }
    return bytes;
  };

  const handleValidate = async () => {
    if (!coin || comparator === "" || !price || !date) {
      alert("Please fill in all fields");
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert("Please enter a valid positive number for price");
      return;
    }

    setIsValidating(true);
    try {
      const formattedDate = formatDateForAPI(date);
      const priceInteger = convertPriceToInteger(price);

      const payload = {
        payload: {
          type: MARKET_TYPE,
          date: formattedDate,
          coin: coin,
          comparator: comparator as number,
          price: parseInt(priceInteger),
          result: MARKET_RESULT,
        },
      };

      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data: ApiResponse = await response.json();
      setApiResponse(data);
      setIsValidating(false);
    } catch (error: any) {
      alert(`Error validating market: ${error.message}`);
      setIsValidating(false);
    }
  };

  const handleCreateMarket = async () => {
    if (!account || !apiResponse) {
      alert("Please validate the market first");
      return;
    }

    if (!delphiPackageId || delphiPackageId === "0x0") {
      alert(
        "Delphi package not found. Please set delphiPackageId in networkConfig.ts",
      );
      return;
    }

    if (!delphiConfigObjectId || delphiConfigObjectId === "0x0") {
      alert(
        "Delphi config object not found. Please set delphiConfigObjectId in networkConfig.ts",
      );
      return;
    }

    if (!enclavePackageId || enclavePackageId === "0x0") {
      alert(
        "Enclave package not found. Please set enclavePackageId in networkConfig.ts",
      );
      return;
    }

    if (!enclaveObjectId || enclaveObjectId === "0x0") {
      alert(
        "Enclave object not found. Please set enclaveObjectId in networkConfig.ts",
      );
      return;
    }

    setIsLoading(true);
    setTransactionResult(null);

    try {
      const tx = new Transaction();
      const sigBytes = hexToBytes(apiResponse.signature);
      const apiPayload = apiResponse.payload;

      tx.moveCall({
        target: `${delphiPackageId}::delphi::create_market`,
        typeArguments: [`${delphiPackageId}::delphi::DELPHI`],
        arguments: [
          tx.object(delphiConfigObjectId),
          tx.pure.u64(BigInt(apiPayload.type)),
          tx.pure.string(apiPayload.date),
          tx.pure.string(apiPayload.coin),
          tx.pure.u64(BigInt(apiPayload.comparator)),
          tx.pure.u64(BigInt(apiPayload.price)),
          tx.pure.u64(BigInt(apiPayload.result)),
          tx.pure.u64(BigInt(apiResponse.timestamp_ms)),
          tx.pure.vector("u8", sigBytes),
          tx.object(enclaveObjectId),
        ],
      });

      const signature = await signTransaction({
        transaction: tx,
      });

      const result = await client.executeTransactionBlock({
        transactionBlock: signature.bytes,
        signature: signature.signature,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      // Find the created market object
      const createdMarket = result.objectChanges?.find(
        (change) =>
          change.type === "created" &&
          "objectType" in change &&
          change.objectType?.includes("Market"),
      );

      if (createdMarket && "objectId" in createdMarket) {
        setTransactionResult({
          success: true,
          message: "Market created successfully!",
          marketId: createdMarket.objectId,
        });
      } else {
        setTransactionResult({
          success: true,
          message: "Transaction completed successfully!",
        });
      }

      setShowModal(true);
      setIsLoading(false);
    } catch (error: any) {
      const errorMessage =
        error.message ||
        error.data?.message ||
        (typeof error === "string" ? error : "Failed to create market");

      setTransactionResult({
        success: false,
        message: errorMessage,
      });
      setShowModal(true);
      setIsLoading(false);
    }
  };

  if (!account) {
    return (
      <Container size="4" py="6">
        <Card className="crypto-card">
          <Box p="6">
            <Text size="4" color="gray">
              Please connect your wallet to create a market.
            </Text>
          </Box>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="3" py="8" style={{ maxWidth: "1200px", margin: "0 auto" }}>
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
          color="gray"
          style={{ lineHeight: "1.7", maxWidth: "700px", margin: "0 auto" }}
        >
          Create a prediction market by specifying a crypto price question. Once
          validated, you can deploy the market on-chain where others can trade
          shares based on the outcome.
        </Text>
      </Box>

      <Card
        className="crypto-card"
        style={{
          background: "var(--gray-2)",
          border: "1px solid var(--gray-6)",
          boxShadow:
            "0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.1)",
          overflow: "hidden",
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        <Box
          p="10"
          style={{
            background:
              "linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, transparent 100%)",
          }}
        >
          <Box mb="8">
            <Flex align="center" gap="2" mb="6">
              <Box
                style={{
                  width: "4px",
                  height: "24px",
                  background:
                    "linear-gradient(180deg, var(--market-primary) 0%, var(--market-primary-light) 100%)",
                  borderRadius: "2px",
                }}
              />
              <Text
                size="4"
                weight="medium"
                color="gray"
                style={{
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  fontSize: "12px",
                }}
              >
                Market Question
              </Text>
            </Flex>

            <Box
              p="6"
              style={{
                background: "var(--gray-3)",
                borderRadius: "12px",
                border: "1px solid var(--gray-6)",
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
                    color: "var(--gray-12)",
                  }}
                >
                  Will
                </Text>

                <Box style={{ position: "relative" }}>
                  <Select.Root value={coin} onValueChange={setCoin}>
                    <Select.Trigger
                      placeholder="Select coin"
                      style={{
                        minWidth: "200px",
                        fontSize: "19px",
                        padding: "16px 20px",
                        height: "52px",
                        background: coin ? "var(--gray-4)" : "var(--gray-3)",
                        border: coin
                          ? "2px solid var(--market-primary)"
                          : "2px solid var(--gray-6)",
                        borderRadius: "10px",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        fontWeight: coin ? 500 : 400,
                        color: coin ? "var(--gray-12)" : "var(--gray-9)",
                      }}
                      className="form-input"
                    />
                    <Select.Content>
                      {COINS.map((coinOption) => (
                        <Select.Item
                          key={coinOption.value}
                          value={coinOption.value}
                        >
                          {coinOption.display}
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
                      <Text size="2" color="green" weight="bold">
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
                      style={{
                        minWidth: "220px",
                        fontSize: "19px",
                        padding: "16px 20px",
                        height: "52px",
                        background: comparator
                          ? "var(--gray-4)"
                          : "var(--gray-3)",
                        border: comparator
                          ? "2px solid var(--market-primary)"
                          : "2px solid var(--gray-6)",
                        borderRadius: "10px",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        fontWeight: comparator ? 500 : 400,
                        color: comparator ? "var(--gray-12)" : "var(--gray-9)",
                      }}
                      className="form-input"
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
                      <Text size="2" color="green" weight="bold">
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
                    disabled={isLoading || isValidating}
                    style={{
                      width: "220px",
                      fontSize: "19px",
                      padding: "16px 20px",
                      height: "52px",
                      background: price ? "var(--gray-4)" : "var(--gray-3)",
                      border: price
                        ? "2px solid var(--market-primary)"
                        : "2px solid var(--gray-6)",
                      borderRadius: "10px",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      fontWeight: price ? 500 : 400,
                      color: price ? "var(--gray-12)" : "var(--gray-9)",
                    }}
                    className="form-input"
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
                      <Text size="2" color="green" weight="bold">
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
                    disabled={isLoading || isValidating}
                    style={{
                      width: "240px",
                      fontSize: "19px",
                      padding: "16px 50px 16px 20px",
                      height: "52px",
                      background: date ? "var(--gray-4)" : "var(--gray-3)",
                      border: date
                        ? "2px solid var(--market-primary)"
                        : "2px solid var(--gray-6)",
                      borderRadius: "10px",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      fontWeight: date ? 500 : 400,
                      color: date ? "var(--gray-12)" : "var(--gray-9)",
                    }}
                    className="form-input"
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
                    disabled={isLoading || isValidating}
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
                    <Text size="3" color="gray" style={{ userSelect: "none" }}>
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
                      <Text size="2" color="green" weight="bold">
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
                  ?
                </Text>
              </Flex>
            </Box>
          </Box>

          <Flex
            gap="4"
            align="center"
            justify="between"
            wrap="wrap"
            style={{
              paddingTop: "32px",
              borderTop: "2px solid var(--gray-6)",
              marginTop: "8px",
            }}
          >
            <Box style={{ flex: 1, minWidth: "200px" }}>
              {apiResponse && (
                <Flex
                  align="center"
                  gap="3"
                  p="3"
                  style={{
                    background: "rgba(16, 185, 129, 0.1)",
                    borderRadius: "8px",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                  }}
                >
                  <Flex
                    align="center"
                    justify="center"
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: "var(--green-9)",
                      flexShrink: 0,
                    }}
                  >
                    <Text size="3" style={{ color: "white" }} weight="bold">
                      ✓
                    </Text>
                  </Flex>
                  <Box
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <Text size="3" color="green" weight="medium">
                      Market validated successfully
                    </Text>
                    <Text size="1" color="gray">
                      Ready to deploy on-chain
                    </Text>
                  </Box>
                </Flex>
              )}
            </Box>

            <Flex gap="3" style={{ flexShrink: 0 }}>
              <Button
                size="3"
                className="crypto-button"
                onClick={handleValidate}
                disabled={
                  isLoading ||
                  isValidating ||
                  !coin ||
                  comparator === "" ||
                  !price ||
                  !date
                }
                style={{
                  minWidth: "160px",
                  height: "52px",
                  fontSize: "17px",
                  fontWeight: 600,
                  borderRadius: "10px",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  opacity:
                    !coin || comparator === "" || !price || !date ? 0.5 : 1,
                }}
              >
                {isValidating ? (
                  <Flex align="center" gap="2">
                    <Box
                      style={{
                        width: "16px",
                        height: "16px",
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: "white",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                    Validating...
                  </Flex>
                ) : (
                  "Validate"
                )}
              </Button>

              {apiResponse && (
                <Button
                  size="3"
                  className="crypto-button"
                  onClick={handleCreateMarket}
                  disabled={isLoading || isValidating}
                  style={{
                    minWidth: "180px",
                    height: "52px",
                    fontSize: "17px",
                    fontWeight: 600,
                    borderRadius: "10px",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    background:
                      "linear-gradient(135deg, var(--market-primary) 0%, var(--market-primary-light) 100%)",
                    boxShadow: "0 4px 20px rgba(59, 130, 246, 0.4)",
                  }}
                >
                  {isLoading ? (
                    <Flex align="center" gap="2">
                      <Box
                        style={{
                          width: "16px",
                          height: "16px",
                          border: "2px solid rgba(255,255,255,0.3)",
                          borderTopColor: "white",
                          borderRadius: "50%",
                          animation: "spin 0.8s linear infinite",
                        }}
                      />
                      Creating...
                    </Flex>
                  ) : (
                    "Create Market"
                  )}
                </Button>
              )}
            </Flex>
          </Flex>
        </Box>
      </Card>

      <Dialog.Root open={showModal} onOpenChange={setShowModal}>
        <Dialog.Content style={{ maxWidth: 500 }}>
          <Dialog.Title>
            {transactionResult?.success ? "Success" : "Error"}
          </Dialog.Title>
          <Dialog.Description size="2" mb="4">
            {transactionResult?.message}
            {transactionResult?.marketId && (
              <Box mt="3">
                <Text
                  size="2"
                  weight="bold"
                  mb="1"
                  style={{ display: "block" }}
                >
                  Market ID:
                </Text>
                <Text
                  size="1"
                  style={{
                    fontFamily: "monospace",
                    wordBreak: "break-all",
                    color: "var(--market-accent)",
                  }}
                >
                  {transactionResult.marketId}
                </Text>
              </Box>
            )}
          </Dialog.Description>
          <Flex gap="3" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Close
              </Button>
            </Dialog.Close>
            {transactionResult?.success && (
              <Dialog.Close>
                <Button
                  className="crypto-button"
                  onClick={() => {
                    setShowModal(false);
                    setCoin("");
                    setComparator("");
                    setPrice("");
                    setDate("");
                    setApiResponse(null);
                    setTransactionResult(null);
                  }}
                >
                  Create Another
                </Button>
              </Dialog.Close>
            )}
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Container>
  );
}
