import {
  useCurrentAccount,
  useSignTransaction,
  useSuiClient,
  useSuiClientQuery,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import {
  Dialog,
  Flex,
  Heading,
  Text,
  Button,
  Box,
  Separator,
} from "@radix-ui/themes";
import { Alert, Snackbar } from "@mui/material";
import { useState, useEffect } from "react";
import { networkConfig } from "../networkConfig";

const SUI_COIN_TYPE = "0x2::sui::SUI";

export function FaucetModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutateAsync: signTransaction } = useSignTransaction();
  const [isLoading, setIsLoading] = useState(false);
  const [alertState, setAlertState] = useState<{
    open: boolean;
    message: string;
    severity: "error" | "warning" | "info" | "success";
  }>({
    open: false,
    message: "",
    severity: "error",
  });

  // Get current network to construct coin type
  const getCurrentNetwork = () => {
    const url = (client as any).url || "";
    if (url.includes("devnet")) return "devnet";
    if (url.includes("testnet")) return "testnet";
    if (url.includes("mainnet")) return "mainnet";
    if (url.includes("localhost") || url.includes("127.0.0.1")) return "local";
    return "testnet";
  };

  const currentNetwork = getCurrentNetwork();

  // Get network config values (same pattern as CreateMarketPage)
  const pseudoUsdcPackageId =
    (networkConfig[currentNetwork as keyof typeof networkConfig] as any)
      ?.pseudoUsdcPackageId || "0x0";
  const pseudoUsdcFaucetObjectId =
    (networkConfig[currentNetwork as keyof typeof networkConfig] as any)
      ?.pseudoUsdcFaucetObjectId || "0x0";

  const coinType =
    pseudoUsdcPackageId && pseudoUsdcPackageId !== "0x0"
      ? `${pseudoUsdcPackageId}::pseudo_usdc::PSEUDO_USDC`
      : null;

  // Query for user's SUI balance
  const { data: suiCoinsData, refetch: refetchSui } = useSuiClientQuery(
    "getCoins",
    {
      owner: account?.address as string,
      coinType: SUI_COIN_TYPE,
    },
    {
      enabled: !!account,
    },
  );

  // Query for user's PSEUDO_USDC coins
  const { data: pseudoUsdcCoinsData, refetch: refetchPseudoUsdc } =
    useSuiClientQuery(
      "getCoins",
      {
        owner: account?.address as string,
        coinType: coinType || "",
      },
      {
        enabled: !!account && !!coinType,
      },
    );

  // Calculate SUI balance
  const suiBalance =
    suiCoinsData?.data?.reduce((sum, coin) => {
      return sum + BigInt(coin.balance || "0");
    }, BigInt(0)) || BigInt(0);

  // Calculate PSEUDO_USDC balance
  const pseudoUsdcBalance =
    pseudoUsdcCoinsData?.data?.reduce((sum, coin) => {
      return sum + BigInt(coin.balance || "0");
    }, BigInt(0)) || BigInt(0);

  // Refetch balances when modal opens
  useEffect(() => {
    if (open && account) {
      refetchSui();
      if (coinType) {
        refetchPseudoUsdc();
      }
    }
  }, [open, account, coinType]);

  // Format balance with decimals
  const formatSuiBalance = (balance: bigint) => {
    const divisor = BigInt(1_000_000_000); // 9 decimals for SUI
    const whole = balance / divisor;
    const fractional = balance % divisor;
    return `${whole}.${fractional.toString().padStart(9, "0")}`;
  };

  const formatPseudoUsdcBalance = (balance: bigint) => {
    const divisor = BigInt(1_000_000); // 6 decimals for PSEUDO_USDC
    const whole = balance / divisor;
    const fractional = balance % divisor;
    return `${whole}.${fractional.toString().padStart(6, "0")}`;
  };

  const handleGetTestnetSui = () => {
    window.open("https://faucet.sui.io", "_blank");
  };

  const showAlert = (
    message: string,
    severity: "error" | "warning" | "info" | "success" = "error",
  ) => {
    setAlertState({ open: true, message, severity });
  };

  const handleGetPseudoUsdc = async () => {
    if (
      !account ||
      !pseudoUsdcFaucetObjectId ||
      pseudoUsdcFaucetObjectId === "0x0"
    ) {
      showAlert(
        "Faucet object not found. Please set pseudoUsdcFaucetObjectId in networkConfig.ts",
        "error",
      );
      return;
    }

    if (!pseudoUsdcPackageId || pseudoUsdcPackageId === "0x0") {
      showAlert(
        "Package ID not found. Please set pseudoUsdcPackageId in networkConfig.ts",
        "error",
      );
      return;
    }

    setIsLoading(true);
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${pseudoUsdcPackageId}::pseudo_usdc::faucet`,
        arguments: [tx.object(pseudoUsdcFaucetObjectId)],
      });

      const signature = await signTransaction({
        transaction: tx,
      });

      await client.executeTransactionBlock({
        transactionBlock: signature.bytes,
        signature: signature.signature,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      refetchPseudoUsdc();
      showAlert("Successfully dispensed 100 PSEUDO_USDC!", "success");
      setIsLoading(false);
    } catch (error: any) {
      console.error("Error:", error);
      showAlert(`Error: ${error.message}`, "error");
      setIsLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 600 }}>
        <Dialog.Title>Faucet</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          <Text>
            To test this app, you need some testnet SUI and pseudo USDC tokens.
          </Text>
        </Dialog.Description>

        <Flex direction="column" gap="4" mt="4">
          {/* Current Balances */}
          <Box>
            <Heading size="4" mb="3">
              Your Balances
            </Heading>
            <Flex direction="column" gap="2">
              <Flex justify="between" align="center">
                <Text size="3" weight="bold">
                  SUI:
                </Text>
                <Text size="3">{formatSuiBalance(suiBalance)} SUI</Text>
              </Flex>
              <Flex justify="between" align="center">
                <Text size="3" weight="bold">
                  Pseudo USDC:
                </Text>
                <Text size="3">
                  {formatPseudoUsdcBalance(pseudoUsdcBalance)} PSEUDO_USDC
                </Text>
              </Flex>
            </Flex>
          </Box>

          <Separator />

          {/* Get Testnet SUI */}
          <Box>
            <Heading size="4" mb="2">
              Get Testnet SUI
            </Heading>
            <Text size="2" color="gray" mb="3" style={{ display: "block" }}>
              Click the button below to open the Sui testnet faucet in a new tab
              where you can request testnet SUI tokens.
            </Text>
            <Button
              size="3"
              onClick={handleGetTestnetSui}
              style={{ width: "100%" }}
            >
              Get Testnet SUI
            </Button>
          </Box>

          <Separator />

          {/* Get Pseudo USDC */}
          <Box>
            <Heading size="4" mb="2">
              Get Pseudo USDC
            </Heading>
            <Text size="2" color="gray" mb="3" style={{ display: "block" }}>
              Click the button below to get 100 PSEUDO_USDC tokens from the
              faucet. This will create a transaction on the Sui blockchain.
            </Text>
            <Button
              size="3"
              onClick={handleGetPseudoUsdc}
              disabled={
                isLoading ||
                !pseudoUsdcFaucetObjectId ||
                pseudoUsdcFaucetObjectId === "0x0" ||
                !account
              }
              style={{ width: "100%" }}
            >
              {isLoading ? "Processing..." : "Get Pseudo USDC"}
            </Button>
            {(!pseudoUsdcFaucetObjectId ||
              pseudoUsdcFaucetObjectId === "0x0") && (
              <Box
                mt="2"
                style={{
                  background: "var(--red-a2)",
                  padding: "0.75rem",
                  borderRadius: "4px",
                }}
              >
                <Text size="2" color="red">
                  ⚠️ Please update pseudoUsdcFaucetObjectId in networkConfig.ts
                </Text>
              </Box>
            )}
          </Box>
        </Flex>

        <Flex gap="3" justify="end" mt="6">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Close
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>

      <Snackbar
        open={alertState.open}
        autoHideDuration={6000}
        onClose={() => setAlertState({ ...alertState, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
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
    </Dialog.Root>
  );
}
