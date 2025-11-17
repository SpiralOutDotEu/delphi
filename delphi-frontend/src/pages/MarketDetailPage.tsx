import { useParams, useNavigate } from "react-router-dom";
import {
  useSuiClient,
  useCurrentAccount,
  useSignTransaction,
  useSuiClientQuery,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { bcs } from "@mysten/sui/bcs";
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
  Dialog,
  Select,
  TextField,
} from "@radix-ui/themes";
import { LineChart } from "@mui/x-charts/LineChart";
import { DataGrid } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import { networkConfig } from "../networkConfig";
import {
  fetchObjectByAddress,
  Market,
  getUserPositionsForMarket,
  Position,
  fetchMarketTrades,
  TradeEvent,
} from "../services/graphqlService";
import { COINS } from "../constants";

export function MarketDetailPage() {
  const { marketId } = useParams<{ marketId: string }>();
  const navigate = useNavigate();
  const client = useSuiClient();
  const account = useCurrentAccount();
  const { mutateAsync: signTransaction } = useSignTransaction();
  const [market, setMarket] = useState<Market | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [selectedSide, setSelectedSide] = useState<"yes" | "no" | null>("yes");
  const [isOpeningPosition, setIsOpeningPosition] = useState(false);
  const [positionResult, setPositionResult] = useState<{
    success: boolean;
    message: string;
    positionId?: string;
  } | null>(null);
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [userPositions, setUserPositions] = useState<Position[]>([]);
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(
    null,
  );
  const [isWaitingForNewPosition, setIsWaitingForNewPosition] = useState(false);
  const [buyAmount, setBuyAmount] = useState<string>("");
  const [quote, setQuote] = useState<bigint | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isBuyingShares, setIsBuyingShares] = useState(false);
  const [sellAmount, setSellAmount] = useState<string>("");
  const [sellQuote, setSellQuote] = useState<bigint | null>(null);
  const [isLoadingSellQuote, setIsLoadingSellQuote] = useState(false);
  const [isSellingShares, setIsSellingShares] = useState(false);
  const [tradeEvents, setTradeEvents] = useState<TradeEvent[]>([]);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);

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
  const pseudoUsdcPackageId =
    (networkConfig[currentNetwork as keyof typeof networkConfig] as any)
      ?.pseudoUsdcPackageId || "0x0";

  const pseudoUsdcCoinType =
    pseudoUsdcPackageId && pseudoUsdcPackageId !== "0x0"
      ? `${pseudoUsdcPackageId}::pseudo_usdc::PSEUDO_USDC`
      : null;

  // Query for user's PSEUDO_USDC coins
  const { data: pseudoUsdcCoinsData, refetch: refetchPseudoUsdc } =
    useSuiClientQuery(
      "getCoins",
      {
        owner: account?.address as string,
        coinType: pseudoUsdcCoinType || "",
      },
      {
        enabled: !!account && !!pseudoUsdcCoinType,
      },
    );

  const handleOpenPosition = async () => {
    if (!account || !market) {
      alert("Please connect your wallet");
      return;
    }

    if (!delphiPackageId || delphiPackageId === "0x0") {
      alert(
        "Delphi package not found. Please set delphiPackageId in networkConfig.ts",
      );
      return;
    }

    if (!marketId) {
      alert("Market ID is required");
      return;
    }

    setIsOpeningPosition(true);
    setPositionResult(null);

    try {
      const tx = new Transaction();

      // Call open_position and get the returned Position object
      const [position] = tx.moveCall({
        target: `${delphiPackageId}::delphi::open_position`,
        arguments: [tx.object(marketId)],
      });

      // Transfer the returned Position object to the sender
      tx.transferObjects([position], tx.pure.address(account.address));

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

      // Find the created position object
      const createdPosition = result.objectChanges?.find(
        (change) =>
          change.type === "created" &&
          "objectType" in change &&
          change.objectType?.includes("Position"),
      );

      if (createdPosition && "objectId" in createdPosition) {
        setPositionResult({
          success: true,
          message: "Position opened successfully!",
          positionId: createdPosition.objectId,
        });
      } else {
        setPositionResult({
          success: true,
          message: "Transaction completed successfully!",
        });
      }

      setShowPositionModal(true);
      setIsOpeningPosition(false);

      // Start waiting for new position and reload positions with retry
      setIsWaitingForNewPosition(true);
      if (account && marketId && delphiPackageId && delphiPackageId !== "0x0") {
        // Start retry loop - will retry every 2 seconds up to 10 times
        loadPositions(0, 10, true);
      }
    } catch (error: any) {
      const errorMessage =
        error.message ||
        error.data?.message ||
        (typeof error === "string" ? error : "Failed to open position");

      setPositionResult({
        success: false,
        message: errorMessage,
      });
      setShowPositionModal(true);
      setIsOpeningPosition(false);
    }
  };

  // Function to load market data with optional retry
  const loadMarket = async (retryCount = 0, maxRetries = 0) => {
    if (!marketId) {
      setError("Market ID is required");
      setIsLoading(false);
      return;
    }

    try {
      // Only show loading on first attempt
      if (retryCount === 0) {
        setIsLoading(true);
      }
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
      setIsLoading(false);
    } catch (err) {
      console.error("Failed to load market:", err);
      if (retryCount < maxRetries) {
        // Retry after delay
        setTimeout(() => {
          loadMarket(retryCount + 1, maxRetries);
        }, 2000);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load market");
        setIsLoading(false);
      }
    }
  };

  // Function to load trade events
  const loadTrades = async () => {
    if (!marketId || !delphiPackageId || delphiPackageId === "0x0") {
      setTradeEvents([]);
      return;
    }

    setIsLoadingTrades(true);
    try {
      const trades = await fetchMarketTrades(
        currentNetwork,
        marketId,
        delphiPackageId,
      );
      setTradeEvents(trades);
    } catch (err) {
      console.error("Failed to load trades:", err);
      setTradeEvents([]);
    } finally {
      setIsLoadingTrades(false);
    }
  };

  // Load market on mount
  useEffect(() => {
    loadMarket();
    loadTrades();
  }, [marketId, currentNetwork, delphiPackageId]);

  // Function to load positions with retry capability
  const loadPositions = async (
    retryCount = 0,
    maxRetries = 10,
    isWaiting = false,
  ) => {
    if (
      !account ||
      !marketId ||
      !delphiPackageId ||
      delphiPackageId === "0x0"
    ) {
      setUserPositions([]);
      setIsWaitingForNewPosition(false);
      return;
    }

    try {
      const positions = await getUserPositionsForMarket(
        currentNetwork,
        account.address,
        marketId,
        delphiPackageId,
      );
      setUserPositions(positions);

      // Auto-select first position if available
      if (positions.length > 0) {
        setSelectedPositionId(positions[0].address);
        setIsWaitingForNewPosition(false); // Stop waiting once we find positions
      } else if (isWaiting && retryCount < maxRetries) {
        // If we're waiting for a new position and haven't found it yet, retry
        setTimeout(() => {
          loadPositions(retryCount + 1, maxRetries, isWaiting);
        }, 2000); // Wait 2 seconds before retrying
      } else if (isWaiting && retryCount >= maxRetries) {
        // Stop waiting after max retries
        setIsWaitingForNewPosition(false);
      }
    } catch (err) {
      console.error("Failed to load positions:", err);
      setUserPositions([]);
      if (isWaiting && retryCount < maxRetries) {
        // Retry on error too
        setTimeout(() => {
          loadPositions(retryCount + 1, maxRetries, isWaiting);
        }, 2000);
      } else {
        setIsWaitingForNewPosition(false);
      }
    }
  };

  // Load user positions for this market
  useEffect(() => {
    loadPositions();
  }, [account, marketId, currentNetwork, delphiPackageId]);

  // Function to get quote using devInspectTransaction
  const getQuote = async (
    amount: bigint,
    side: "yes" | "no",
  ): Promise<bigint | null> => {
    if (
      !marketId ||
      !delphiPackageId ||
      delphiPackageId === "0x0" ||
      !delphiConfigObjectId ||
      delphiConfigObjectId === "0x0" ||
      !account
    ) {
      return null;
    }

    try {
      const tx = new Transaction();
      const sideValue = side === "yes" ? 1 : 2; // SIDE_YES = 1, SIDE_NO = 2

      tx.moveCall({
        target: `${delphiPackageId}::delphi::quote_buy`,
        arguments: [
          tx.object(delphiConfigObjectId), // &Config
          tx.object(marketId), // &Market
          tx.pure.u64(Number(amount)), // amount: u64
          tx.pure.u8(sideValue), // side: u8
        ],
      });

      // Run the transaction in dev-inspect mode (no state changes)
      const inspection = await client.devInspectTransactionBlock({
        sender: account.address,
        transactionBlock: tx,
      });

      if (inspection.error) {
        throw new Error(`devInspect failed: ${inspection.error}`);
      }

      // devInspect results: first call, first return value
      const execResult = inspection.results?.[0];
      if (!execResult?.returnValues?.length) {
        throw new Error("No return values from quote_buy");
      }

      const [returnBytes] = execResult.returnValues[0]; // [number[], string]
      // returnType should be "u64" for your function
      const quoteValue = bcs.U64.parse(new Uint8Array(returnBytes)); // BigInt

      // Ensure it's a bigint
      return typeof quoteValue === "bigint" ? quoteValue : BigInt(quoteValue);
    } catch (error: any) {
      console.error("Error getting quote:", error);
      return null;
    }
  };

  // Function to get sell quote using devInspectTransaction
  const getSellQuote = async (
    amount: bigint,
    side: "yes" | "no",
  ): Promise<bigint | null> => {
    if (
      !marketId ||
      !delphiPackageId ||
      delphiPackageId === "0x0" ||
      !delphiConfigObjectId ||
      delphiConfigObjectId === "0x0" ||
      !account
    ) {
      return null;
    }

    try {
      const tx = new Transaction();
      const sideValue = side === "yes" ? 1 : 2; // SIDE_YES = 1, SIDE_NO = 2

      tx.moveCall({
        target: `${delphiPackageId}::delphi::quote_sell`,
        arguments: [
          tx.object(delphiConfigObjectId), // &Config
          tx.object(marketId), // &Market
          tx.pure.u64(Number(amount)), // amount: u64
          tx.pure.u8(sideValue), // side: u8
        ],
      });

      // Run the transaction in dev-inspect mode (no state changes)
      const inspection = await client.devInspectTransactionBlock({
        sender: account.address,
        transactionBlock: tx,
      });

      if (inspection.error) {
        throw new Error(`devInspect failed: ${inspection.error}`);
      }

      // devInspect results: first call, first return value
      const execResult = inspection.results?.[0];
      if (!execResult?.returnValues?.length) {
        throw new Error("No return values from quote_sell");
      }

      const [returnBytes] = execResult.returnValues[0]; // [number[], string]
      // returnType should be "u64" for your function
      const quoteValue = bcs.U64.parse(new Uint8Array(returnBytes)); // BigInt

      // Ensure it's a bigint
      return typeof quoteValue === "bigint" ? quoteValue : BigInt(quoteValue);
    } catch (error: any) {
      console.error("Error getting sell quote:", error);
      return null;
    }
  };

  // Fetch buy quote when amount or side changes
  useEffect(() => {
    const fetchQuote = async () => {
      if (!buyAmount || !selectedSide || !market) {
        setQuote(null);
        return;
      }

      const amountNum = parseFloat(buyAmount);
      if (isNaN(amountNum) || amountNum <= 0) {
        setQuote(null);
        return;
      }

      // Shares are in whole units (not MIST), so convert to u64 directly
      const amountInShares = BigInt(Math.floor(amountNum));

      setIsLoadingQuote(true);
      const quoteValue = await getQuote(amountInShares, selectedSide);
      if (quoteValue !== null) {
        setQuote(quoteValue);
      } else {
        setQuote(null);
      }
      setIsLoadingQuote(false);
    };

    // Debounce the quote fetch
    const timeoutId = setTimeout(() => {
      fetchQuote();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    buyAmount,
    selectedSide,
    marketId,
    delphiPackageId,
    delphiConfigObjectId,
    account,
    market,
  ]);

  // Fetch sell quote when amount or side changes
  useEffect(() => {
    const fetchSellQuote = async () => {
      if (!sellAmount || !selectedSide || !market || activeTab !== "sell") {
        setSellQuote(null);
        return;
      }

      const amountNum = parseFloat(sellAmount);
      if (isNaN(amountNum) || amountNum <= 0) {
        setSellQuote(null);
        return;
      }

      // Shares are in whole units (not MIST), so convert to u64 directly
      const amountInShares = BigInt(Math.floor(amountNum));

      setIsLoadingSellQuote(true);
      const quoteValue = await getSellQuote(amountInShares, selectedSide);
      if (quoteValue !== null) {
        setSellQuote(quoteValue);
      } else {
        setSellQuote(null);
      }
      setIsLoadingSellQuote(false);
    };

    // Debounce the quote fetch
    const timeoutId = setTimeout(() => {
      fetchSellQuote();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    sellAmount,
    selectedSide,
    marketId,
    delphiPackageId,
    delphiConfigObjectId,
    account,
    market,
    activeTab,
  ]);

  // Function to buy shares
  const handleBuyShares = async () => {
    if (!account || !market || !selectedSide || !buyAmount) {
      alert("Please select a side and enter an amount");
      return;
    }

    if (!delphiPackageId || delphiPackageId === "0x0") {
      alert("Delphi package not found");
      return;
    }

    if (!delphiConfigObjectId || delphiConfigObjectId === "0x0") {
      alert("Config object not found");
      return;
    }

    if (!selectedPositionId) {
      alert("Please open a position first");
      return;
    }

    if (!quote || quote === 0n) {
      alert("Please wait for quote to load");
      return;
    }

    const amountNum = parseFloat(buyAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    // Shares are in whole units (not MIST), so convert to u64 directly
    const amountInShares = BigInt(Math.floor(amountNum));
    const sideValue = selectedSide === "yes" ? 1 : 2;

    // Get PSEUDO_USDC coins
    const coins = pseudoUsdcCoinsData?.data || [];
    if (coins.length === 0) {
      alert("You don't have any PSEUDO_USDC. Please get some from the faucet.");
      return;
    }

    // Calculate total balance
    const totalBalance = coins.reduce((sum, coin) => {
      return sum + BigInt(coin.balance || "0");
    }, BigInt(0));

    if (totalBalance < quote) {
      alert(
        `Insufficient balance. You need ${formatPseudoUsdc(quote)} PSEUDO_USDC but have ${formatPseudoUsdc(totalBalance)}`,
      );
      return;
    }

    setIsBuyingShares(true);

    try {
      const tx = new Transaction();

      // Find or merge coins to get enough balance
      let selectedCoin: string | null = null;
      let totalBalanceCheck = BigInt(0);

      for (const coin of coins) {
        const coinBalance = BigInt(coin.balance || "0");
        totalBalanceCheck += coinBalance;
        if (coinBalance >= quote) {
          selectedCoin = coin.coinObjectId;
          break;
        }
      }

      if (selectedCoin) {
        // Use the coin directly if it has enough balance
        const coinBalance = BigInt(
          coins.find((c) => c.coinObjectId === selectedCoin)!.balance || "0",
        );
        if (coinBalance > quote) {
          // Split the coin if it has more than needed
          const [paymentCoin] = tx.splitCoins(tx.object(selectedCoin), [
            tx.pure.u64(Number(quote)),
          ]);
          const [changeCoin, updatedPosition] = tx.moveCall({
            target: `${delphiPackageId}::delphi::buy_shares`,
            arguments: [
              tx.object(delphiConfigObjectId), // config: &Config
              tx.object(marketId!), // market: &mut Market
              tx.object(selectedPositionId), // position: Position
              paymentCoin, // payment: Coin<PSEUDO_USDC>
              tx.pure.u64(Number(amountInShares)), // amount: u64
              tx.pure.u8(sideValue), // side: u8
            ],
          });
          // Transfer change back to user
          tx.transferObjects([changeCoin], account.address);
          // Transfer updated position back to user
          tx.transferObjects([updatedPosition], account.address);
        } else {
          // Use the entire coin
          const [changeCoin, updatedPosition] = tx.moveCall({
            target: `${delphiPackageId}::delphi::buy_shares`,
            arguments: [
              tx.object(delphiConfigObjectId), // config: &Config
              tx.object(marketId!), // market: &mut Market
              tx.object(selectedPositionId), // position: Position
              tx.object(selectedCoin), // payment: Coin<PSEUDO_USDC>
              tx.pure.u64(Number(amountInShares)), // amount: u64
              tx.pure.u8(sideValue), // side: u8
            ],
          });
          // Transfer change back to user (if any)
          tx.transferObjects([changeCoin], account.address);
          // Transfer updated position back to user
          tx.transferObjects([updatedPosition], account.address);
        }
      } else if (totalBalanceCheck >= quote) {
        // Merge coins and split
        const primaryCoin = coins[0].coinObjectId;
        if (coins.length > 1) {
          tx.mergeCoins(
            tx.object(primaryCoin),
            coins.slice(1).map((c) => tx.object(c.coinObjectId)),
          );
        }
        const [paymentCoin] = tx.splitCoins(tx.object(primaryCoin), [
          tx.pure.u64(Number(quote)),
        ]);
        const [changeCoin, updatedPosition] = tx.moveCall({
          target: `${delphiPackageId}::delphi::buy_shares`,
          arguments: [
            tx.object(delphiConfigObjectId), // config: &Config
            tx.object(marketId!), // market: &mut Market
            tx.object(selectedPositionId), // position: Position
            paymentCoin, // payment: Coin<PSEUDO_USDC>
            tx.pure.u64(Number(amountInShares)), // amount: u64
            tx.pure.u8(sideValue), // side: u8
          ],
        });
        // Transfer change back to user
        tx.transferObjects([changeCoin], account.address);
        // Transfer updated position back to user
        tx.transferObjects([updatedPosition], account.address);
      } else {
        alert("Insufficient balance");
        setIsBuyingShares(false);
        return;
      }

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

      // Reset form
      setBuyAmount("");
      setQuote(null);
      refetchPseudoUsdc();

      // Wait a bit for transaction to be indexed, then reload data
      setTimeout(() => {
        // Reload market data to update statistics (with retry)
        loadMarket(0, 5);

        // Reload positions with retry (similar to after opening position)
        setIsWaitingForNewPosition(true);
        if (
          account &&
          marketId &&
          delphiPackageId &&
          delphiPackageId !== "0x0"
        ) {
          loadPositions(0, 10, true);
        } else {
          loadPositions();
        }

        // Reload trades
        loadTrades();
      }, 2000); // Wait 2 seconds for transaction to be indexed

      setPositionResult({
        success: true,
        message: "Shares bought successfully!",
      });
      setShowPositionModal(true);
      setIsBuyingShares(false);
    } catch (error: any) {
      console.error("Error buying shares:", error);
      const errorMessage =
        error.message ||
        error.data?.message ||
        (typeof error === "string" ? error : "Failed to buy shares");

      setPositionResult({
        success: false,
        message: errorMessage,
      });
      setShowPositionModal(true);
      setIsBuyingShares(false);
    }
  };

  // Function to sell shares
  const handleSellShares = async () => {
    if (!account || !market || !selectedSide || !sellAmount) {
      alert("Please select a side and enter an amount");
      return;
    }

    if (!delphiPackageId || delphiPackageId === "0x0") {
      alert("Delphi package not found");
      return;
    }

    if (!delphiConfigObjectId || delphiConfigObjectId === "0x0") {
      alert("Config object not found");
      return;
    }

    if (!selectedPositionId) {
      alert("Please open a position first");
      return;
    }

    if (!sellQuote || sellQuote === 0n) {
      alert("Please wait for quote to load");
      return;
    }

    const amountNum = parseFloat(sellAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    // Shares are in whole units (not MIST), so convert to u64 directly
    const amountInShares = BigInt(Math.floor(amountNum));
    const sideValue = selectedSide === "yes" ? 1 : 2;

    // Check if user has enough shares
    const selectedPosition = userPositions.find(
      (p) => p.address === selectedPositionId,
    );
    if (!selectedPosition) {
      alert("Position not found");
      return;
    }

    const availableShares =
      sideValue === 1
        ? BigInt(selectedPosition.asMoveObject.contents.json.yes_shares || "0")
        : BigInt(selectedPosition.asMoveObject.contents.json.no_shares || "0");

    if (availableShares < amountInShares) {
      alert(
        `Insufficient shares. You have ${availableShares.toString()} ${selectedSide === "yes" ? "yes" : "no"} shares but trying to sell ${amountInShares.toString()}`,
      );
      return;
    }

    setIsSellingShares(true);

    try {
      const tx = new Transaction();

      // Call sell_shares - position is passed as mutable reference, so it's modified in place
      const payoutCoin = tx.moveCall({
        target: `${delphiPackageId}::delphi::sell_shares`,
        arguments: [
          tx.object(delphiConfigObjectId), // config: &Config
          tx.object(marketId!), // market: &mut Market
          tx.object(selectedPositionId), // position: &mut Position
          tx.pure.u64(Number(amountInShares)), // amount: u64
          tx.pure.u8(sideValue), // side: u8
        ],
      });

      // Transfer the payout coin back to user
      tx.transferObjects([payoutCoin], account.address);

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

      // Reset form and reload data
      setSellAmount("");
      setSellQuote(null);
      refetchPseudoUsdc();

      // Wait a bit for transaction to be indexed, then reload data
      setTimeout(() => {
        // Reload market data to update statistics (with retry)
        loadMarket(0, 5);

        // Reload positions with retry (similar to after opening position)
        setIsWaitingForNewPosition(true);
        if (
          account &&
          marketId &&
          delphiPackageId &&
          delphiPackageId !== "0x0"
        ) {
          loadPositions(0, 10, true);
        } else {
          loadPositions();
        }

        // Reload trades
        loadTrades();
      }, 2000); // Wait 2 seconds for transaction to be indexed

      setPositionResult({
        success: true,
        message: "Shares sold successfully!",
      });
      setShowPositionModal(true);
      setIsSellingShares(false);
    } catch (error: any) {
      console.error("Error selling shares:", error);
      const errorMessage =
        error.message ||
        error.data?.message ||
        (typeof error === "string" ? error : "Failed to sell shares");

      setPositionResult({
        success: false,
        message: errorMessage,
      });
      setShowPositionModal(true);
      setIsSellingShares(false);
    }
  };

  // Format PSEUDO_USDC balance
  const formatPseudoUsdc = (balance: bigint) => {
    const divisor = BigInt(1_000_000); // 6 decimals for PSEUDO_USDC
    const whole = balance / divisor;
    const fractional = balance % divisor;
    return `${whole}.${fractional.toString().padStart(6, "0")}`;
  };

  if (isLoading) {
    return (
      <Box className="page-container">
        <Container size="4" py="8">
          <Flex justify="center" align="center" py="12">
            <Spinner size="3" />
            <Text
              ml="3"
              size="3"
              style={{ color: "var(--oracle-text-secondary)" }}
            >
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

  // Calculate total shares (real + virtual) for percentages/display
  const totalYesShares =
    BigInt(marketData.yes_shares || "0") +
    BigInt(marketData.virtual_yes_shares || "0");
  const totalNoShares =
    BigInt(marketData.no_shares || "0") +
    BigInt(marketData.virtual_no_shares || "0");
  const totalShares = totalYesShares + totalNoShares;

  // Calculate actual shares (without virtual) for statistics
  const actualYesShares = BigInt(marketData.yes_shares || "0");
  const actualNoShares = BigInt(marketData.no_shares || "0");
  const actualTotalShares = actualYesShares + actualNoShares;

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
    const num = Number(price) / 1_000_000_000;
    // Convert to string with 9 decimals to preserve precision
    const str = num.toFixed(9);
    // Remove trailing zeros but keep the decimal point if there are non-zero decimals
    const trimmed = str.replace(/\.?0+$/, "");
    // Split into integer and decimal parts
    const [intPart, decPart] = trimmed.split(".");
    // Add thousand separators to integer part
    const formattedInt = Number(intPart).toLocaleString("en-US");
    // Combine with decimal part if it exists
    return decPart ? `${formattedInt}.${decPart}` : formattedInt;
  };

  // Format shares (integers, no decimals)
  const formatShares = (shares: bigint): string => {
    const num = Number(shares);
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(2)}k`;
    return num.toLocaleString(); // Format as integer with thousand separators
  };

  const formatCollateral = (collateral: any): string => {
    // Collateral is a Balance<PSEUDO_USDC> object (6 decimals)
    // The GraphQL response might have it as a string or object
    if (!collateral) return "0";
    if (typeof collateral === "string") {
      const value = BigInt(collateral);
      return formatPseudoUsdc(value);
    }
    if (collateral.value) {
      const value = BigInt(collateral.value);
      return formatPseudoUsdc(value);
    }
    return "0";
  };

  const getComparatorLabel = (comparator: string): string => {
    return comparator === "1" ? "at most" : "at least";
  };

  // Find coin data from constants
  const coinData = COINS.find((c) => c.value === marketData.coin.toLowerCase());
  const coinImageUrl = coinData?.image_svg_url;

  // Get latest trade event for current prices
  const latestTrade =
    tradeEvents.length > 0 ? tradeEvents[tradeEvents.length - 1] : null;

  // Calculate prices from latest trade event cost values (in cents)
  // Cost values are in smallest unit (MIST), PSEUDO_USDC has 6 decimals
  // Convert to cents: divide by 1_000_000 to get PSEUDO_USDC, then multiply by 100 to get cents
  // Round to one decimal place
  const buyYesPrice = latestTrade
    ? Math.round(
        (Number(latestTrade.contents.json.cost_buy_yes) / 1_000_000) * 100 * 10,
      ) / 10
    : Math.round(yesPercentage * 10) / 10;
  const buyNoPrice = latestTrade
    ? Math.round(
        (Number(latestTrade.contents.json.cost_buy_no) / 1_000_000) * 100 * 10,
      ) / 10
    : Math.round(noPercentage * 10) / 10;
  const sellYesPrice = latestTrade
    ? Math.round(
        (Number(latestTrade.contents.json.cost_sell_yes) / 1_000_000) *
          100 *
          10,
      ) / 10
    : Math.round(yesPercentage * 10) / 10;
  const sellNoPrice = latestTrade
    ? Math.round(
        (Number(latestTrade.contents.json.cost_sell_no) / 1_000_000) * 100 * 10,
      ) / 10
    : Math.round(noPercentage * 10) / 10;

  // Use appropriate prices based on active tab
  const yesPrice = activeTab === "buy" ? buyYesPrice : sellYesPrice;
  const noPrice = activeTab === "buy" ? buyNoPrice : sellNoPrice;

  // Prepare chart data from trade events
  const chartData = tradeEvents.map((event) => ({
    time: new Date(event.timestamp).getTime(),
    timeLabel: new Date(event.timestamp).toLocaleTimeString(),
    yesPrice: Number(event.contents.json.prob_yes) / 100,
    noPrice: Number(event.contents.json.prob_no) / 100,
    costBuyYes: Number(event.contents.json.cost_buy_yes) / 1_000_000, // Convert to PSEUDO_USDC
    costBuyNo: Number(event.contents.json.cost_buy_no) / 1_000_000,
    costSellYes: Number(event.contents.json.cost_sell_yes) / 1_000_000,
    costSellNo: Number(event.contents.json.cost_sell_no) / 1_000_000,
    totalCollateral: Number(event.contents.json.total_collateral) / 1_000_000,
  }));

  // Prepare table data for trades
  const tradesTableData = tradeEvents
    .filter((event) => event.contents.json.trade_type !== 0) // Filter out market creation
    .map((event, index) => ({
      id: `${event.timestamp}-${index}`,
      timestamp: new Date(event.timestamp).toLocaleString(),
      type: event.contents.json.trade_type === 1 ? "Buy" : "Sell",
      side:
        event.contents.json.side === 1
          ? "YES"
          : event.contents.json.side === 2
            ? "NO"
            : "N/A",
      amount: event.contents.json.amount,
      cost: (Number(event.contents.json.collateral_delta) / 1_000_000).toFixed(
        6,
      ),
      probYes: (Number(event.contents.json.prob_yes) / 100).toFixed(2),
      probNo: (Number(event.contents.json.prob_no) / 100).toFixed(2),
      totalCollateral: (
        Number(event.contents.json.total_collateral) / 1_000_000
      ).toFixed(6),
      sender: event.sender.address,
    }));

  // Calculate statistics from trade events
  const totalTrades = tradesTableData.length;
  const totalVolume =
    tradeEvents.reduce(
      (sum, event) => sum + Number(event.contents.json.collateral_delta),
      0,
    ) / 1_000_000;
  const buyTrades = tradesTableData.filter((t) => t.type === "Buy").length;
  const sellTrades = tradesTableData.filter((t) => t.type === "Sell").length;

  // Get selected position data
  const selectedPosition = userPositions.find(
    (p) => p.address === selectedPositionId,
  );
  const positionYesShares = selectedPosition
    ? BigInt(selectedPosition.asMoveObject.contents.json.yes_shares || "0")
    : 0n;
  const positionNoShares = selectedPosition
    ? BigInt(selectedPosition.asMoveObject.contents.json.no_shares || "0")
    : 0n;
  const hasPosition = userPositions.length > 0;

  return (
    <Box className="page-container">
      <Box
        style={{
          maxWidth: "1800px",
          margin: "0 auto",
          width: "100%",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
        }}
      >
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

        {/* Market Question Header - Full Width */}
        <Card className="crypto-card" mb="4" style={{ width: "100%" }}>
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
                    Will {marketData.coin} be{" "}
                    {getComparatorLabel(marketData.comparator)} $
                    {formatPrice(marketData.price)} on {marketData.date}?
                  </Heading>
                  <Flex gap="4" align="center" mt="2">
                    <Text
                      size="2"
                      style={{ color: "var(--oracle-text-muted)" }}
                    >
                      Volume: ${formatShares(totalYesShares + totalNoShares)}
                    </Text>
                    <Text
                      size="2"
                      style={{ color: "var(--oracle-text-muted)" }}
                    >
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

        <Flex
          gap="4"
          direction={{ initial: "column", lg: "row" }}
          style={{ width: "100%", justifyContent: "center" }}
        >
          {/* Left Column - Chart and Stats */}
          <Flex
            direction="column"
            style={{ flex: "8 1 0", minWidth: 0, maxWidth: "100%" }}
            gap="4"
          >
            {/* Price History Chart */}
            <Card className="crypto-card">
              <Box p="6">
                <Flex direction="column" gap="4">
                  <Flex justify="between" align="center">
                    <Heading size="5">Price History</Heading>
                  </Flex>
                  {isLoadingTrades ? (
                    <Box
                      style={{
                        height: "300px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Spinner size="3" />
                    </Box>
                  ) : chartData.length > 0 ? (
                    <Box
                      style={{
                        height: "300px",
                        width: "100%",
                      }}
                    >
                      <LineChart
                        xAxis={[
                          {
                            data: chartData.map((_, index) => index),
                            valueFormatter: (value: number) => {
                              const dataPoint = chartData[value];
                              return dataPoint
                                ? new Date(dataPoint.time).toLocaleTimeString()
                                : "";
                            },
                            label: "Time",
                          },
                        ]}
                        series={[
                          {
                            label: "YES Price (%)",
                            data: chartData.map((d) => d.yesPrice),
                            color: "#4FBC80",
                            curve: "monotoneX",
                          },
                          {
                            label: "NO Price (%)",
                            data: chartData.map((d) => d.noPrice),
                            color: "#FF6E6E",
                            curve: "monotoneX",
                          },
                        ]}
                        sx={{
                          "& .MuiChartsAxis-root": {
                            stroke: "var(--oracle-text-secondary)",
                          },
                          "& .MuiChartsLegend-root": {
                            fill: "var(--oracle-text-primary)",
                            color: "var(--oracle-text-primary)",
                            "& .MuiChartsLegend-mark": {
                              fill: "var(--oracle-text-primary)",
                            },
                            "& .MuiChartsLegend-label": {
                              fill: "var(--oracle-text-primary)",
                              color: "var(--oracle-text-primary)",
                            },
                            "& text": {
                              fill: "var(--oracle-text-primary)",
                              color: "var(--oracle-text-primary)",
                            },
                            "& .MuiTypography-root": {
                              color: "var(--oracle-text-primary)",
                            },
                          },
                          "& .MuiChartsTooltip-root": {
                            backgroundColor: "var(--oracle-secondary)",
                            color: "var(--oracle-text-primary)",
                          },
                        }}
                      />
                    </Box>
                  ) : (
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
                      <Text
                        size="3"
                        style={{ color: "var(--oracle-text-muted)" }}
                      >
                        No trade data available
                      </Text>
                    </Box>
                  )}
                </Flex>
              </Box>
            </Card>

            {/* Trades Table */}
            <Card className="crypto-card">
              <Box p="6">
                <Heading size="5" mb="4">
                  Recent Trades
                </Heading>
                {isLoadingTrades ? (
                  <Box
                    style={{
                      minHeight: "200px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Spinner size="3" />
                  </Box>
                ) : tradesTableData.length > 0 ? (
                  <Box
                    style={{
                      height: "400px",
                      width: "100%",
                    }}
                  >
                    <DataGrid
                      rows={tradesTableData}
                      disableColumnMenu
                      disableColumnSelector
                      disableRowSelectionOnClick
                      autoHeight={false}
                      columns={[
                        {
                          field: "timestamp",
                          headerName: "Time",
                          width: 180,
                          minWidth: 180,
                          sortable: true,
                        },
                        {
                          field: "type",
                          headerName: "Type",
                          width: 80,
                          minWidth: 80,
                          renderCell: (params) => (
                            <Badge
                              color={params.value === "Buy" ? "green" : "red"}
                              size="1"
                            >
                              {params.value}
                            </Badge>
                          ),
                        },
                        {
                          field: "side",
                          headerName: "Side",
                          width: 80,
                          minWidth: 80,
                          renderCell: (params) => (
                            <Text
                              size="2"
                              style={{
                                color:
                                  params.value === "YES"
                                    ? "var(--oracle-bullish)"
                                    : "var(--oracle-bearish)",
                                fontWeight: 600,
                              }}
                            >
                              {params.value}
                            </Text>
                          ),
                        },
                        {
                          field: "amount",
                          headerName: "Amount",
                          width: 100,
                          minWidth: 100,
                          type: "number",
                        },
                        {
                          field: "cost",
                          headerName: "Cost (USDC)",
                          width: 120,
                          minWidth: 120,
                          type: "number",
                        },
                        {
                          field: "probYes",
                          headerName: "YES %",
                          width: 100,
                          minWidth: 100,
                          type: "number",
                        },
                        {
                          field: "probNo",
                          headerName: "NO %",
                          width: 100,
                          minWidth: 100,
                          type: "number",
                        },
                        {
                          field: "totalCollateral",
                          headerName: "Total Collateral",
                          width: 140,
                          minWidth: 140,
                          type: "number",
                        },
                        {
                          field: "sender",
                          headerName: "Sender",
                          width: 150,
                          minWidth: 150,
                          flex: 1,
                          renderCell: (params) => (
                            <Text
                              size="1"
                              style={{
                                fontFamily: "monospace",
                                color: "var(--oracle-text-secondary)",
                              }}
                            >
                              {params.value.slice(0, 6)}...
                              {params.value.slice(-4)}
                            </Text>
                          ),
                        },
                      ]}
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
                                backgroundColor: "var(--oracle-input-hover-bg)",
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
                ) : (
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
                    <Text
                      size="3"
                      style={{ color: "var(--oracle-text-muted)" }}
                    >
                      No trades yet
                    </Text>
                  </Box>
                )}
              </Box>
            </Card>
          </Flex>

          {/* Right Column - Trading Interface */}
          <Flex
            direction="column"
            style={{ flex: "2 1 0", minWidth: "320px", maxWidth: "100%" }}
            gap="4"
          >
            <Card className="crypto-card">
              <Box p="6">
                <Flex direction="column" gap="4">
                  {/* Buy/Sell Tabs */}
                  <Tabs.Root
                    value={activeTab}
                    onValueChange={(v) => setActiveTab(v as "buy" | "sell")}
                  >
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

                    <Tabs.Content value="buy" style={{ paddingTop: "16px" }}>
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
                                    boxShadow:
                                      "0 4px 12px rgba(79, 188, 128, 0.4)",
                                  }
                                : {
                                    background: "rgba(79, 188, 128, 0.2)",
                                    color: "rgba(79, 188, 128, 0.7)",
                                    border: "1px solid rgba(79, 188, 128, 0.3)",
                                  }),
                            }}
                            onClick={() =>
                              setSelectedSide(
                                selectedSide === "yes" ? null : "yes",
                              )
                            }
                          >
                            Yes {yesPrice.toFixed(1)}¢
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
                                    boxShadow:
                                      "0 4px 12px rgba(255, 110, 110, 0.4)",
                                  }
                                : {
                                    background: "rgba(255, 110, 110, 0.2)",
                                    color: "rgba(255, 110, 110, 0.7)",
                                    border:
                                      "1px solid rgba(255, 110, 110, 0.3)",
                                  }),
                            }}
                            onClick={() =>
                              setSelectedSide(
                                selectedSide === "no" ? null : "no",
                              )
                            }
                          >
                            No {noPrice.toFixed(1)}¢
                          </Button>
                        </Flex>

                        {/* Amount Input */}
                        <Box>
                          <Text
                            size="2"
                            mb="2"
                            style={{
                              display: "block",
                              color: "var(--oracle-text-secondary)",
                            }}
                          >
                            Amount (shares)
                          </Text>
                          <TextField.Root
                            type="number"
                            value={buyAmount}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Only allow numbers and decimal point
                              if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                setBuyAmount(value);
                              }
                            }}
                            placeholder="0"
                            style={{
                              fontSize: "24px",
                              fontWeight: "bold",
                              textAlign: "center",
                              height: "60px",
                            }}
                            disabled={!selectedSide || !hasPosition}
                          />
                          <Flex gap="2" mt="2">
                            {[
                              { label: "+1", value: "1" },
                              { label: "+20", value: "20" },
                              { label: "+100", value: "100" },
                            ].map(({ label, value }) => (
                              <Button
                                key={label}
                                variant="soft"
                                size="2"
                                style={{ flex: 1 }}
                                onClick={() => {
                                  const current = parseFloat(buyAmount) || 0;
                                  setBuyAmount(
                                    String(current + parseFloat(value)),
                                  );
                                }}
                                disabled={!selectedSide || !hasPosition}
                              >
                                {label}
                              </Button>
                            ))}
                          </Flex>
                          {/* Quote Display */}
                          {selectedSide && buyAmount && (
                            <Box
                              mt="3"
                              p="3"
                              style={{
                                background: "var(--oracle-secondary)",
                                borderRadius: "8px",
                                border: "1px solid var(--oracle-border)",
                              }}
                            >
                              {isLoadingQuote ? (
                                <Flex align="center" gap="2" justify="center">
                                  <Spinner size="1" />
                                  <Text size="2" color="gray">
                                    Calculating quote...
                                  </Text>
                                </Flex>
                              ) : quote !== null && quote > 0n ? (
                                <Flex direction="column" gap="1">
                                  <Flex justify="between" align="center">
                                    <Text size="2" color="gray">
                                      Cost:
                                    </Text>
                                    <Text size="3" weight="bold">
                                      {formatPseudoUsdc(quote)} PSEUDO_USDC
                                    </Text>
                                  </Flex>
                                </Flex>
                              ) : buyAmount && parseFloat(buyAmount) > 0 ? (
                                <Text size="2" color="red">
                                  Unable to get quote
                                </Text>
                              ) : null}
                            </Box>
                          )}
                        </Box>

                        {/* Position Selection or Open Position Button */}
                        {hasPosition ? (
                          <Flex direction="column" gap="3">
                            {/* Position Selector (if multiple positions) */}
                            {userPositions.length > 1 && (
                              <Box>
                                <Text
                                  size="2"
                                  mb="2"
                                  style={{
                                    display: "block",
                                    color: "var(--oracle-text-secondary)",
                                  }}
                                >
                                  Select Position
                                </Text>
                                <Select.Root
                                  value={selectedPositionId || undefined}
                                  onValueChange={setSelectedPositionId}
                                >
                                  <Select.Trigger
                                    style={{ width: "100%" }}
                                    className="form-input"
                                  />
                                  <Select.Content>
                                    {userPositions.map((pos) => (
                                      <Select.Item
                                        key={pos.address}
                                        value={pos.address}
                                      >
                                        Position: {pos.address.slice(0, 8)}...
                                        {pos.address.slice(-6)} (
                                        {formatShares(
                                          BigInt(
                                            pos.asMoveObject.contents.json
                                              .yes_shares || "0",
                                          ) +
                                            BigInt(
                                              pos.asMoveObject.contents.json
                                                .no_shares || "0",
                                            ),
                                        )}{" "}
                                        shares)
                                      </Select.Item>
                                    ))}
                                  </Select.Content>
                                </Select.Root>
                              </Box>
                            )}

                            {/* Position Info */}
                            {isWaitingForNewPosition && !hasPosition ? (
                              <Box
                                style={{
                                  background: "var(--oracle-secondary)",
                                  borderRadius: "8px",
                                  padding: "16px",
                                  border: "1px solid var(--oracle-border)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  minHeight: "100px",
                                }}
                              >
                                <Flex direction="column" align="center" gap="3">
                                  <Spinner size="3" />
                                  <Text
                                    size="2"
                                    style={{
                                      color: "var(--oracle-text-secondary)",
                                      textAlign: "center",
                                    }}
                                  >
                                    Waiting for position to appear...
                                  </Text>
                                </Flex>
                              </Box>
                            ) : hasPosition ? (
                              <Box
                                style={{
                                  background: "var(--oracle-secondary)",
                                  borderRadius: "8px",
                                  padding: "16px",
                                  border: "1px solid var(--oracle-border)",
                                }}
                              >
                                <Flex justify="between" align="center" mb="3">
                                  <Text
                                    size="2"
                                    weight="medium"
                                    style={{
                                      display: "block",
                                      color: "var(--oracle-text-primary)",
                                    }}
                                  >
                                    Your Position
                                  </Text>
                                  {isWaitingForNewPosition && (
                                    <Flex align="center" gap="2">
                                      <Spinner size="1" />
                                      <Text
                                        size="1"
                                        style={{
                                          color: "var(--oracle-text-secondary)",
                                        }}
                                      >
                                        Updating...
                                      </Text>
                                    </Flex>
                                  )}
                                </Flex>
                                <Flex direction="column" gap="2">
                                  <Flex justify="between" align="center">
                                    <Text
                                      size="2"
                                      style={{
                                        color: "var(--oracle-text-secondary)",
                                      }}
                                    >
                                      Yes Shares:
                                    </Text>
                                    <Text
                                      size="3"
                                      weight="bold"
                                      style={{
                                        color: "var(--oracle-bullish)",
                                      }}
                                    >
                                      {formatShares(positionYesShares)}
                                    </Text>
                                  </Flex>
                                  <Flex justify="between" align="center">
                                    <Text
                                      size="2"
                                      style={{
                                        color: "var(--oracle-text-secondary)",
                                      }}
                                    >
                                      No Shares:
                                    </Text>
                                    <Text
                                      size="3"
                                      weight="bold"
                                      style={{
                                        color: "var(--oracle-bearish)",
                                      }}
                                    >
                                      {formatShares(positionNoShares)}
                                    </Text>
                                  </Flex>
                                </Flex>
                              </Box>
                            ) : null}
                          </Flex>
                        ) : (
                          <Button
                            size="4"
                            variant="outline"
                            onClick={handleOpenPosition}
                            disabled={isOpeningPosition || !account || !market}
                            style={{
                              width: "100%",
                              height: "50px",
                              fontSize: "16px",
                              fontWeight: 600,
                              borderColor: "var(--oracle-border)",
                              color: "var(--oracle-text-primary)",
                              opacity:
                                isOpeningPosition || !account || !market
                                  ? 0.5
                                  : 1,
                            }}
                          >
                            {isOpeningPosition ? (
                              <Flex align="center" gap="2">
                                <Box
                                  style={{
                                    width: "16px",
                                    height: "16px",
                                    border: "2px solid rgba(255,255,255,0.3)",
                                    borderTopColor: "currentColor",
                                    borderRadius: "50%",
                                    animation: "spin 0.8s linear infinite",
                                  }}
                                />
                                Opening...
                              </Flex>
                            ) : (
                              "Open Position"
                            )}
                          </Button>
                        )}

                        {/* Buy Button - Only show if user has a position */}
                        {hasPosition && (
                          <Button
                            size="4"
                            className="crypto-button"
                            style={{
                              width: "100%",
                              height: "50px",
                              fontSize: "16px",
                              fontWeight: 600,
                            }}
                            onClick={handleBuyShares}
                            disabled={
                              isBuyingShares ||
                              !selectedSide ||
                              !buyAmount ||
                              parseFloat(buyAmount) <= 0 ||
                              !quote ||
                              quote === 0n ||
                              isLoadingQuote
                            }
                          >
                            {isBuyingShares ? (
                              <Flex align="center" gap="2">
                                <Spinner size="1" />
                                Buying...
                              </Flex>
                            ) : (
                              `Buy ${selectedSide === "yes" ? "Yes" : "No"} Shares`
                            )}
                          </Button>
                        )}

                        <Text
                          size="1"
                          style={{
                            color: "var(--oracle-text-muted)",
                            textAlign: "center",
                          }}
                        >
                          By trading, you agree to the Terms of Use.
                        </Text>
                      </Flex>
                    </Tabs.Content>

                    <Tabs.Content value="sell" style={{ paddingTop: "16px" }}>
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
                                    boxShadow:
                                      "0 4px 12px rgba(79, 188, 128, 0.4)",
                                  }
                                : {
                                    background: "rgba(79, 188, 128, 0.2)",
                                    color: "rgba(79, 188, 128, 0.7)",
                                    border: "1px solid rgba(79, 188, 128, 0.3)",
                                  }),
                            }}
                            onClick={() =>
                              setSelectedSide(
                                selectedSide === "yes" ? null : "yes",
                              )
                            }
                          >
                            Yes {yesPrice.toFixed(1)}¢
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
                                    boxShadow:
                                      "0 4px 12px rgba(255, 110, 110, 0.4)",
                                  }
                                : {
                                    background: "rgba(255, 110, 110, 0.2)",
                                    color: "rgba(255, 110, 110, 0.7)",
                                    border:
                                      "1px solid rgba(255, 110, 110, 0.3)",
                                  }),
                            }}
                            onClick={() =>
                              setSelectedSide(
                                selectedSide === "no" ? null : "no",
                              )
                            }
                          >
                            No {noPrice.toFixed(1)}¢
                          </Button>
                        </Flex>

                        {/* Amount Input */}
                        <Box>
                          <Text
                            size="2"
                            mb="2"
                            style={{
                              display: "block",
                              color: "var(--oracle-text-secondary)",
                            }}
                          >
                            Amount (shares)
                          </Text>
                          <TextField.Root
                            type="number"
                            value={sellAmount}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Only allow numbers and decimal point
                              if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                setSellAmount(value);
                              }
                            }}
                            placeholder="0"
                            style={{
                              fontSize: "24px",
                              fontWeight: "bold",
                              textAlign: "center",
                              height: "60px",
                            }}
                            disabled={!selectedSide || !hasPosition}
                          />
                          <Flex gap="2" mt="2">
                            {[
                              { label: "+1", value: "1" },
                              { label: "+20", value: "20" },
                              { label: "+100", value: "100" },
                            ].map(({ label, value }) => (
                              <Button
                                key={label}
                                variant="soft"
                                size="2"
                                style={{ flex: 1 }}
                                onClick={() => {
                                  const current = parseFloat(sellAmount) || 0;
                                  setSellAmount(
                                    String(current + parseFloat(value)),
                                  );
                                }}
                                disabled={!selectedSide || !hasPosition}
                              >
                                {label}
                              </Button>
                            ))}
                          </Flex>
                          {/* Quote Display */}
                          {selectedSide && sellAmount && (
                            <Box
                              mt="3"
                              p="3"
                              style={{
                                background: "var(--oracle-secondary)",
                                borderRadius: "8px",
                                border: "1px solid var(--oracle-border)",
                              }}
                            >
                              {isLoadingSellQuote ? (
                                <Flex align="center" gap="2" justify="center">
                                  <Spinner size="1" />
                                  <Text size="2" color="gray">
                                    Calculating quote...
                                  </Text>
                                </Flex>
                              ) : sellQuote !== null && sellQuote > 0n ? (
                                <Flex direction="column" gap="1">
                                  <Flex justify="between" align="center">
                                    <Text size="2" color="gray">
                                      Payout:
                                    </Text>
                                    <Text size="3" weight="bold">
                                      ${formatPseudoUsdc(sellQuote)}
                                    </Text>
                                  </Flex>
                                </Flex>
                              ) : sellAmount && parseFloat(sellAmount) > 0 ? (
                                <Text size="2" color="red">
                                  Unable to get quote
                                </Text>
                              ) : null}
                            </Box>
                          )}
                        </Box>

                        {/* Position Selection or Open Position Button */}
                        {hasPosition ? (
                          <Flex direction="column" gap="3">
                            {/* Position Selector (if multiple positions) */}
                            {userPositions.length > 1 && (
                              <Box>
                                <Text
                                  size="2"
                                  mb="2"
                                  style={{
                                    display: "block",
                                    color: "var(--oracle-text-secondary)",
                                  }}
                                >
                                  Select Position
                                </Text>
                                <Select.Root
                                  value={selectedPositionId || undefined}
                                  onValueChange={setSelectedPositionId}
                                >
                                  <Select.Trigger
                                    style={{ width: "100%" }}
                                    className="form-input"
                                  />
                                  <Select.Content>
                                    {userPositions.map((pos) => (
                                      <Select.Item
                                        key={pos.address}
                                        value={pos.address}
                                      >
                                        Position: {pos.address.slice(0, 8)}...
                                        {pos.address.slice(-6)} (
                                        {formatShares(
                                          BigInt(
                                            pos.asMoveObject.contents.json
                                              .yes_shares || "0",
                                          ) +
                                            BigInt(
                                              pos.asMoveObject.contents.json
                                                .no_shares || "0",
                                            ),
                                        )}{" "}
                                        shares)
                                      </Select.Item>
                                    ))}
                                  </Select.Content>
                                </Select.Root>
                              </Box>
                            )}

                            {/* Position Info */}
                            {isWaitingForNewPosition && !hasPosition ? (
                              <Box
                                style={{
                                  background: "var(--oracle-secondary)",
                                  borderRadius: "8px",
                                  padding: "16px",
                                  border: "1px solid var(--oracle-border)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  minHeight: "100px",
                                }}
                              >
                                <Flex direction="column" align="center" gap="3">
                                  <Spinner size="3" />
                                  <Text
                                    size="2"
                                    style={{
                                      color: "var(--oracle-text-secondary)",
                                      textAlign: "center",
                                    }}
                                  >
                                    Waiting for position to appear...
                                  </Text>
                                </Flex>
                              </Box>
                            ) : hasPosition ? (
                              <Box
                                style={{
                                  background: "var(--oracle-secondary)",
                                  borderRadius: "8px",
                                  padding: "16px",
                                  border: "1px solid var(--oracle-border)",
                                }}
                              >
                                <Flex justify="between" align="center" mb="3">
                                  <Text
                                    size="2"
                                    weight="medium"
                                    style={{
                                      display: "block",
                                      color: "var(--oracle-text-primary)",
                                    }}
                                  >
                                    Your Position
                                  </Text>
                                  {isWaitingForNewPosition && (
                                    <Flex align="center" gap="2">
                                      <Spinner size="1" />
                                      <Text
                                        size="1"
                                        style={{
                                          color: "var(--oracle-text-secondary)",
                                        }}
                                      >
                                        Updating...
                                      </Text>
                                    </Flex>
                                  )}
                                </Flex>
                                <Flex direction="column" gap="2">
                                  <Flex justify="between" align="center">
                                    <Text
                                      size="2"
                                      style={{
                                        color: "var(--oracle-text-secondary)",
                                      }}
                                    >
                                      Yes Shares:
                                    </Text>
                                    <Text
                                      size="3"
                                      weight="bold"
                                      style={{
                                        color: "var(--oracle-bullish)",
                                      }}
                                    >
                                      {formatShares(positionYesShares)}
                                    </Text>
                                  </Flex>
                                  <Flex justify="between" align="center">
                                    <Text
                                      size="2"
                                      style={{
                                        color: "var(--oracle-text-secondary)",
                                      }}
                                    >
                                      No Shares:
                                    </Text>
                                    <Text
                                      size="3"
                                      weight="bold"
                                      style={{
                                        color: "var(--oracle-bearish)",
                                      }}
                                    >
                                      {formatShares(positionNoShares)}
                                    </Text>
                                  </Flex>
                                </Flex>
                              </Box>
                            ) : null}
                          </Flex>
                        ) : (
                          <Button
                            size="4"
                            variant="outline"
                            onClick={handleOpenPosition}
                            disabled={isOpeningPosition || !account || !market}
                            style={{
                              width: "100%",
                              height: "50px",
                              fontSize: "16px",
                              fontWeight: 600,
                              borderColor: "var(--oracle-border)",
                              color: "var(--oracle-text-primary)",
                              opacity:
                                isOpeningPosition || !account || !market
                                  ? 0.5
                                  : 1,
                            }}
                          >
                            {isOpeningPosition ? (
                              <Flex align="center" gap="2">
                                <Box
                                  style={{
                                    width: "16px",
                                    height: "16px",
                                    border: "2px solid rgba(255,255,255,0.3)",
                                    borderTopColor: "currentColor",
                                    borderRadius: "50%",
                                    animation: "spin 0.8s linear infinite",
                                  }}
                                />
                                Opening...
                              </Flex>
                            ) : (
                              "Open Position"
                            )}
                          </Button>
                        )}

                        {/* Sell Button - Only show if user has a position */}
                        {hasPosition && (
                          <Button
                            size="4"
                            className="crypto-button"
                            style={{
                              width: "100%",
                              height: "50px",
                              fontSize: "16px",
                              fontWeight: 600,
                            }}
                            onClick={handleSellShares}
                            disabled={
                              isSellingShares ||
                              !selectedSide ||
                              !sellAmount ||
                              parseFloat(sellAmount) <= 0 ||
                              !sellQuote ||
                              sellQuote === 0n ||
                              isLoadingSellQuote
                            }
                          >
                            {isSellingShares ? (
                              <Flex align="center" gap="2">
                                <Spinner size="1" />
                                Selling...
                              </Flex>
                            ) : (
                              `Sell ${selectedSide === "yes" ? "Yes" : "No"} Shares`
                            )}
                          </Button>
                        )}

                        <Text
                          size="1"
                          style={{
                            color: "var(--oracle-text-muted)",
                            textAlign: "center",
                          }}
                        >
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
                <Heading size="5" mb="4">
                  Market Statistics
                </Heading>
                <Flex direction="column" gap="3">
                  <Flex justify="between" align="center">
                    <Text
                      size="3"
                      style={{ color: "var(--oracle-text-secondary)" }}
                    >
                      Yes Shares
                    </Text>
                    <Text size="3" weight="bold">
                      {formatShares(actualYesShares)}
                    </Text>
                  </Flex>
                  <Separator />
                  <Flex justify="between" align="center">
                    <Text
                      size="3"
                      style={{ color: "var(--oracle-text-secondary)" }}
                    >
                      No Shares
                    </Text>
                    <Text size="3" weight="bold">
                      {formatShares(actualNoShares)}
                    </Text>
                  </Flex>
                  <Separator />
                  <Flex justify="between" align="center">
                    <Text
                      size="3"
                      style={{ color: "var(--oracle-text-secondary)" }}
                    >
                      Total Shares
                    </Text>
                    <Text size="3" weight="bold">
                      {formatShares(actualTotalShares)}
                    </Text>
                  </Flex>
                  <Separator />
                  <Flex justify="between" align="center">
                    <Text
                      size="3"
                      style={{ color: "var(--oracle-text-secondary)" }}
                    >
                      Collateral
                    </Text>
                    <Text size="3" weight="bold">
                      ${formatCollateral(marketData.collateral)}
                    </Text>
                  </Flex>
                  {latestTrade && (
                    <>
                      <Separator />
                      <Flex justify="between" align="center">
                        <Text
                          size="3"
                          style={{ color: "var(--oracle-text-secondary)" }}
                        >
                          Current YES Price (Buy)
                        </Text>
                        <Text
                          size="3"
                          weight="bold"
                          style={{ color: "var(--oracle-bullish)" }}
                        >
                          {buyYesPrice.toFixed(1)}¢
                        </Text>
                      </Flex>
                      <Separator />
                      <Flex justify="between" align="center">
                        <Text
                          size="3"
                          style={{ color: "var(--oracle-text-secondary)" }}
                        >
                          Current NO Price (Buy)
                        </Text>
                        <Text
                          size="3"
                          weight="bold"
                          style={{ color: "var(--oracle-bearish)" }}
                        >
                          {buyNoPrice.toFixed(1)}¢
                        </Text>
                      </Flex>
                    </>
                  )}
                  {totalTrades > 0 && (
                    <>
                      <Separator />
                      <Flex justify="between" align="center">
                        <Text
                          size="3"
                          style={{ color: "var(--oracle-text-secondary)" }}
                        >
                          Total Trades
                        </Text>
                        <Text size="3" weight="bold">
                          {totalTrades}
                        </Text>
                      </Flex>
                      <Separator />
                      <Flex justify="between" align="center">
                        <Text
                          size="3"
                          style={{ color: "var(--oracle-text-secondary)" }}
                        >
                          Buy / Sell
                        </Text>
                        <Text size="3" weight="bold">
                          {buyTrades} / {sellTrades}
                        </Text>
                      </Flex>
                      <Separator />
                      <Flex justify="between" align="center">
                        <Text
                          size="3"
                          style={{ color: "var(--oracle-text-secondary)" }}
                        >
                          Total Volume
                        </Text>
                        <Text size="3" weight="bold">
                          ${totalVolume.toFixed(2)}
                        </Text>
                      </Flex>
                    </>
                  )}
                </Flex>
              </Box>
            </Card>
          </Flex>
        </Flex>
      </Box>

      {/* Position Result Dialog */}
      <Dialog.Root open={showPositionModal} onOpenChange={setShowPositionModal}>
        <Dialog.Content style={{ maxWidth: 500 }}>
          <Dialog.Title>
            {positionResult?.success ? "Success" : "Error"}
          </Dialog.Title>
          <Dialog.Description size="2" mb="4">
            {positionResult?.message}
            {positionResult?.positionId && (
              <Box mt="3">
                <Text
                  size="2"
                  weight="bold"
                  mb="1"
                  style={{ display: "block" }}
                >
                  Position ID:
                </Text>
                <Text
                  size="1"
                  style={{
                    fontFamily: "monospace",
                    wordBreak: "break-all",
                    color: "var(--oracle-text-secondary)",
                  }}
                >
                  {positionResult.positionId}
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
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  );
}
