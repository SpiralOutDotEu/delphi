import {
  useCurrentAccount,
  useSignTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { Dialog, Flex, Text, Button, Box, Spinner } from "@radix-ui/themes";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { networkConfig } from "../networkConfig";
import { API_ENDPOINT, MARKET_TYPE, MARKET_RESULT } from "../constants";

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

interface CreateMarketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  marketData: {
    coin: string;
    comparator: number;
    price: string;
    date: string;
  };
  onCreated: () => void;
}

type StepStatus = "pending" | "in_progress" | "completed" | "error";

interface Step {
  id: number;
  label: string;
  status: StepStatus;
  message?: string;
}

export function CreateMarketModal({
  open,
  onOpenChange,
  marketData,
  onCreated,
}: CreateMarketModalProps) {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const navigate = useNavigate();
  const { mutateAsync: signTransaction } = useSignTransaction();

  const [steps, setSteps] = useState<Step[]>([
    { id: 1, label: "Send request to TEE Oracle", status: "pending" },
    { id: 2, label: "Check response from TEE Oracle", status: "pending" },
    { id: 3, label: "Prepare transaction for creating market", status: "pending" },
    { id: 4, label: "Waiting for Transaction", status: "pending" },
    { id: 5, label: "Market created", status: "pending" },
  ]);

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
  const enclaveObjectId =
    (networkConfig[currentNetwork as keyof typeof networkConfig] as any)
      ?.enclaveObjectId || "0x0";

  const formatDateForAPI = (dateStr: string): string => {
    if (!dateStr) return "";
    // Convert from YYYY-MM-DD to DD-MM-YYYY
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

  const updateStep = (stepId: number, status: StepStatus, message?: string) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, status, message } : step,
      ),
    );
  };

  const resetSteps = () => {
    setSteps([
      { id: 1, label: "Send request to TEE Oracle", status: "pending" },
      { id: 2, label: "Check response from TEE Oracle", status: "pending" },
      { id: 3, label: "Prepare transaction for creating market", status: "pending" },
      { id: 4, label: "Waiting for Transaction", status: "pending" },
      { id: 5, label: "Market created", status: "pending" },
    ]);
  };

  // Reset steps and start creation when modal opens
  useEffect(() => {
    if (open) {
      setSteps([
        { id: 1, label: "Send request to TEE Oracle", status: "pending" },
        { id: 2, label: "Check response from TEE Oracle", status: "pending" },
        { id: 3, label: "Prepare transaction for creating market", status: "pending" },
        { id: 4, label: "Waiting for Transaction", status: "pending" },
        { id: 5, label: "Market created", status: "pending" },
      ]);
      // Start creation automatically after a brief delay
      const timer = setTimeout(() => {
        handleCreateMarket();
      }, 300);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleCreateMarket = async () => {
    if (!account) {
      updateStep(1, "error", "Please connect your wallet");
      return;
    }

    if (!delphiPackageId || delphiPackageId === "0x0") {
      updateStep(1, "error", "Delphi package not found");
      return;
    }

    if (!enclaveObjectId || enclaveObjectId === "0x0") {
      updateStep(1, "error", "Enclave object not found");
      return;
    }

    // Validate form fields
    if (!marketData.coin || !marketData.comparator || !marketData.price || !marketData.date) {
      updateStep(1, "error", "Please fill in all fields");
      return;
    }

    const priceNum = parseFloat(marketData.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      updateStep(1, "error", "Please enter a valid positive number for price");
      return;
    }

    try {
      // Step 1: Send request to TEE Oracle
      updateStep(1, "in_progress");
      const formattedDate = formatDateForAPI(marketData.date);
      const priceInteger = convertPriceToInteger(marketData.price);

      const payload = {
        payload: {
          type: MARKET_TYPE,
          date: formattedDate,
          coin: marketData.coin,
          comparator: marketData.comparator,
          price: priceInteger,
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
        updateStep(1, "error", `API error: ${response.statusText}`);
        return;
      }

      updateStep(1, "completed");

      // Step 2: Check response from TEE Oracle
      updateStep(2, "in_progress");
      const data: ApiResponse = await response.json();

      if (!data || !data.signature || !data.payload) {
        updateStep(2, "error", "Invalid response from TEE Oracle");
        return;
      }

      updateStep(2, "completed", "Response received successfully");

      // Step 3: Prepare transaction for creating market
      updateStep(3, "in_progress");

      const sigBytes = hexToBytes(data.signature);
      const apiPayload = data.payload;

      const tx = new Transaction();
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
          tx.pure.u64(BigInt(data.timestamp_ms)),
          tx.pure.vector("u8", sigBytes),
          tx.object(enclaveObjectId),
        ],
      });

      updateStep(3, "completed", "Transaction prepared");

      // Step 4: Waiting for Transaction
      updateStep(4, "in_progress");

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

      if (result.effects?.status?.status !== "success") {
        updateStep(4, "error", "Transaction failed");
        return;
      }

      updateStep(4, "completed", "Transaction confirmed");

      // Step 5: Market created
      updateStep(5, "completed", "Market created successfully");

      // Find the created market object
      const createdMarket = result.objectChanges?.find(
        (change) =>
          change.type === "created" &&
          "objectType" in change &&
          change.objectType?.includes("Market"),
      );

      if (createdMarket && "objectId" in createdMarket) {
        const marketId = createdMarket.objectId;
        // Call the callback to refresh and navigate
        setTimeout(() => {
          onCreated();
          onOpenChange(false);
          resetSteps();
          navigate(`/market/${marketId}`);
        }, 1500);
      } else {
        setTimeout(() => {
          onCreated();
          onOpenChange(false);
          resetSteps();
        }, 1500);
      }
    } catch (error: any) {
      const errorMessage =
        error.message ||
        error.data?.message ||
        (typeof error === "string" ? error : "Failed to create market");

      // Find the first in_progress step and mark it as error
      setSteps((prev) => {
        const inProgressStep = prev.find((s) => s.status === "in_progress");
        if (inProgressStep) {
          return prev.map((step) =>
            step.id === inProgressStep.id
              ? {
                  ...step,
                  status: "error" as StepStatus,
                  message: errorMessage,
                }
              : step,
          );
        } else {
          return prev.map((step) =>
            step.id === 1
              ? {
                  ...step,
                  status: "error" as StepStatus,
                  message: errorMessage,
                }
              : step,
          );
        }
      });
    }
  };

  const getStepIcon = (status: StepStatus) => {
    switch (status) {
      case "completed":
        return (
          <Box
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              background: "var(--oracle-bullish)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Text size="2" style={{ color: "white" }} weight="bold">
              ✓
            </Text>
          </Box>
        );
      case "in_progress":
        return <Spinner size="2" />;
      case "error":
        return (
          <Box
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              background: "var(--oracle-bearish)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Text size="2" style={{ color: "white" }} weight="bold">
              ✕
            </Text>
          </Box>
        );
      default:
        return (
          <Box
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              border: "2px solid var(--oracle-border)",
              background: "transparent",
              flexShrink: 0,
            }}
          />
        );
    }
  };

  const getStepColor = (status: StepStatus) => {
    switch (status) {
      case "completed":
        return "var(--oracle-bullish)";
      case "in_progress":
        return "var(--oracle-primary)";
      case "error":
        return "var(--oracle-bearish)";
      default:
        return "var(--oracle-text-muted)";
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 600 }}>
        <Dialog.Title>Create Market</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          <Text>
            This will validate and create the market on-chain. The process will
            take a few moments.
          </Text>
        </Dialog.Description>

        <Flex direction="column" gap="4" mt="4">
          {steps.map((step, index) => (
            <Box key={step.id}>
              <Flex align="center" gap="3">
                {getStepIcon(step.status)}
                <Box style={{ flex: 1 }}>
                  <Text
                    size="3"
                    weight="medium"
                    style={{
                      color: getStepColor(step.status),
                    }}
                  >
                    {step.label}
                  </Text>
                  {step.message && (
                    <Text
                      size="2"
                      style={{
                        color: "var(--oracle-text-secondary)",
                        marginTop: "6px",
                        display: "block",
                      }}
                    >
                      {step.message}
                    </Text>
                  )}
                </Box>
              </Flex>
              {index < steps.length - 1 && (
                <Box
                  style={{
                    width: "2px",
                    height: "24px",
                    marginLeft: "12px",
                    marginTop: "8px",
                    background:
                      step.status === "completed"
                        ? "var(--oracle-bullish)"
                        : "var(--oracle-border)",
                  }}
                />
              )}
            </Box>
          ))}
        </Flex>

        <Flex gap="3" justify="end" mt="6">
          <Dialog.Close>
            <Button
              variant="soft"
              color="gray"
              disabled={steps.some((s) => s.status === "in_progress")}
            >
              {steps.some((s) => s.status === "in_progress")
                ? "Close"
                : "Cancel"}
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

