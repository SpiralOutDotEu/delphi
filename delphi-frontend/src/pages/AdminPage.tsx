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
  Badge,
} from "@radix-ui/themes";
import { useState, useEffect } from "react";
import { networkConfig } from "../networkConfig";

const ENCLAVE_TYPE = "0x1::string::String";

export function AdminPage() {
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
  const enclavePackageId =
    (networkConfig[currentNetwork as keyof typeof networkConfig] as any)
      ?.enclavePackageId || "0x0";

  const [publicKey, setPublicKey] = useState("");
  const [enclaveObjectId, setEnclaveObjectId] = useState("");
  const [intentScope, setIntentScope] = useState("0");
  const [timestampMs, setTimestampMs] = useState("");
  const [payloadJson, setPayloadJson] = useState("");
  const [signature, setSignature] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(
    null,
  );
  const [sharedEnclaves, setSharedEnclaves] = useState<any[]>([]);
  const [loadingEnclaves, setLoadingEnclaves] = useState(false);

  // Function to fetch shared enclaves from events
  const fetchSharedEnclaves = async () => {
    if (!enclavePackageId || enclavePackageId === "0x0") {
      console.log("No enclave package ID set");
      return;
    }

    setLoadingEnclaves(true);
    try {
      // Query for EnclaveCreatedWithPk events
      const events = await client.queryEvents({
        query: {
          MoveModule: {
            package: enclavePackageId,
            module: "enclave",
          },
        },
        limit: 50,
        order: "descending",
      });

      // Process events and fetch current state for each enclave
      const enclaves = await Promise.all(
        events.data
          .filter(
            (event) =>
              event.type ===
              `${enclavePackageId}::enclave::EnclaveCreatedWithPk`,
          )
          .map(async (event) => {
            try {
              const eventData = event.parsedJson as {
                enclave_id: string;
                pk: number[];
                config_version: number;
                owner: string;
              };

              // Get current state of the enclave
              const enclaveObject = await client.getObject({
                id: eventData.enclave_id,
                options: {
                  showContent: true,
                  showType: true,
                  showOwner: true,
                },
              });

              if (enclaveObject.data?.content?.dataType === "moveObject") {
                const fields = enclaveObject.data.content.fields as any;

                return {
                  event,
                  eventData,
                  object: enclaveObject,
                  fields,
                };
              }

              return null;
            } catch (error) {
              console.error(`Error processing enclave ${event.id}:`, error);
              return null;
            }
          }),
      );

      // Filter out null results
      const validEnclaves = enclaves.filter((item) => item !== null);
      setSharedEnclaves(validEnclaves);
    } catch (error) {
      console.error("Error fetching shared enclaves:", error);
      setSharedEnclaves([]);
    } finally {
      setLoadingEnclaves(false);
    }
  };

  // Fetch enclaves on mount and when package ID changes
  useEffect(() => {
    fetchSharedEnclaves();
  }, [enclavePackageId]);

  const handleCreateEnclave = async () => {
    if (!account || !enclavePackageId || enclavePackageId === "0x0") {
      alert(
        "Enclave package not found. Please set enclavePackageId in networkConfig.ts",
      );
      return;
    }

    const pkHex = publicKey.replace(/^0x/, "").trim();
    if (pkHex.length !== 64) {
      alert("Public key must be 64 hex characters (32 bytes)");
      return;
    }

    const pkBytes: number[] = [];
    for (let i = 0; i < pkHex.length; i += 2) {
      pkBytes.push(parseInt(pkHex.substr(i, 2), 16));
    }

    setIsLoading(true);
    try {
      const tx = new Transaction();

      tx.moveCall({
        target: `${enclavePackageId}::enclave::create_enclave_with_pk`,
        typeArguments: [ENCLAVE_TYPE],
        arguments: [tx.pure.vector("u8", pkBytes)],
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

      const createdObject = result.objectChanges?.find(
        (change) =>
          change.type === "created" &&
          "objectType" in change &&
          change.objectType?.includes("Enclave"),
      );

      if (createdObject && "objectId" in createdObject) {
        alert(
          `Enclave created successfully! Object ID: ${createdObject.objectId}`,
        );
        setPublicKey("");
        // Refetch shared enclaves
        await fetchSharedEnclaves();
      }

      setIsLoading(false);
    } catch (error: any) {
      console.error("Error:", error);
      alert(`Error: ${error.message}`);
      setIsLoading(false);
    }
  };

  const handleVerifySignature = async () => {
    if (!account || !enclaveObjectId || !signature || !payloadJson) {
      alert("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    setVerificationResult(null);

    try {
      let payload: any;
      try {
        payload = JSON.parse(payloadJson);
      } catch (e) {
        alert("Invalid JSON payload");
        setIsLoading(false);
        return;
      }

      const sigHex = signature.replace(/^0x/, "").trim();
      if (sigHex.length % 2 !== 0) {
        alert("Invalid signature hex string");
        setIsLoading(false);
        return;
      }

      const sigBytes: number[] = [];
      for (let i = 0; i < sigHex.length; i += 2) {
        sigBytes.push(parseInt(sigHex.substr(i, 2), 16));
      }

      const tx = new Transaction();

      tx.moveCall({
        target: `${enclavePackageId}::enclave::verify_signature`,
        typeArguments: [ENCLAVE_TYPE, "0x1::string::String"],
        arguments: [
          tx.object(enclaveObjectId),
          tx.pure.u8(parseInt(intentScope) || 0),
          tx.pure.u64(BigInt(timestampMs || Date.now().toString())),
          tx.pure.string(JSON.stringify(payload)),
          tx.pure.vector("u8", sigBytes),
        ],
      });

      const result = await client.devInspectTransactionBlock({
        sender: account.address,
        transactionBlock: await tx.build({ client }),
      });

      if (result.results && result.results[0]) {
        const returnValue = result.results[0].returnValues?.[0];
        if (returnValue) {
          const bytesArray = Array.isArray(returnValue[1])
            ? returnValue[1]
            : typeof returnValue[1] === "string"
              ? Array.from(atob(returnValue[1]), (c) => c.charCodeAt(0))
              : [];
          const bytes = Uint8Array.from(bytesArray);
          const isValid = bytes.length > 0 && bytes[0] === 1;
          setVerificationResult(isValid);
        } else {
          setVerificationResult(false);
          alert("Could not extract return value from transaction");
        }
      } else {
        setVerificationResult(false);
        alert("Transaction execution failed or returned no results");
      }

      setIsLoading(false);
    } catch (error: any) {
      console.error("Error:", error);
      alert(`Error: ${error.message || "Unknown error occurred"}`);
      setVerificationResult(false);
      setIsLoading(false);
    }
  };

  if (!account) {
    return (
      <Box className="page-container">
        <Container size="4" py="6">
        <Card className="crypto-card">
          <Box p="6">
            <Text size="4" color="gray">
              Please connect your wallet to access the admin page.
            </Text>
          </Box>
        </Card>
        </Container>
      </Box>
    );
  }

  if (!enclavePackageId || enclavePackageId === "0x0") {
    return (
      <Box className="page-container">
        <Container size="4" py="6">
        <Card className="crypto-card">
          <Box p="6">
            <Text size="4" color="red">
              ⚠️ Please update enclavePackageId in networkConfig.ts
            </Text>
          </Box>
        </Card>
        </Container>
      </Box>
    );
  }

  return (
    <Box className="page-container">
      <Container size="4" py="6">
      <Heading size="8" mb="6" className="text-gradient">
        Enclave Admin
      </Heading>

      <Flex direction="column" gap="6">
        {/* Create Enclave Section */}
        <Card className="crypto-card">
          <Box p="6">
            <Heading size="6" mb="4" className="text-gradient">
              Create Enclave
            </Heading>
            <Text size="3" color="gray" mb="4">
              Create a new enclave with a custom public key (32-byte Ed25519).
            </Text>

            <Flex direction="column" gap="3">
              <Box>
                <Text
                  size="2"
                  weight="bold"
                  mb="2"
                  style={{ display: "block" }}
                >
                  Public Key (64 hex characters):
                </Text>
                <TextField.Root
                  placeholder="0x1234...abcd or 1234...abcd"
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                  disabled={isLoading}
                  style={{ fontFamily: "monospace" }}
                />
              </Box>

              <Button
                size="3"
                className="crypto-button"
                onClick={handleCreateEnclave}
                disabled={isLoading || !publicKey}
              >
                {isLoading ? "Creating..." : "Create Enclave"}
              </Button>
            </Flex>
          </Box>
        </Card>

        {/* Verify Signature Section */}
        <Card className="crypto-card">
          <Box p="6">
            <Heading size="6" mb="4" className="text-gradient">
              Verify Signature
            </Heading>
            <Text size="3" color="gray" mb="4">
              Verify a signature from an enclave using the verify_signature
              function.
            </Text>

            <Flex direction="column" gap="3">
              <Box>
                <Text
                  size="2"
                  weight="bold"
                  mb="2"
                  style={{ display: "block" }}
                >
                  Enclave Object ID:
                </Text>
                <TextField.Root
                  placeholder="0x..."
                  value={enclaveObjectId}
                  onChange={(e) => setEnclaveObjectId(e.target.value)}
                  disabled={isLoading}
                  style={{ fontFamily: "monospace" }}
                />
              </Box>

              <Flex gap="3">
                <Box style={{ flex: 1 }}>
                  <Text
                    size="2"
                    weight="bold"
                    mb="2"
                    style={{ display: "block" }}
                  >
                    Intent Scope (u8):
                  </Text>
                  <TextField.Root
                    placeholder="0"
                    value={intentScope}
                    onChange={(e) => setIntentScope(e.target.value)}
                    disabled={isLoading}
                  />
                </Box>

                <Box style={{ flex: 1 }}>
                  <Text
                    size="2"
                    weight="bold"
                    mb="2"
                    style={{ display: "block" }}
                  >
                    Timestamp (ms, u64):
                  </Text>
                  <TextField.Root
                    placeholder={Date.now().toString()}
                    value={timestampMs}
                    onChange={(e) => setTimestampMs(e.target.value)}
                    disabled={isLoading}
                  />
                </Box>
              </Flex>

              <Box>
                <Text
                  size="2"
                  weight="bold"
                  mb="2"
                  style={{ display: "block" }}
                >
                  Payload (JSON):
                </Text>
                <TextField.Root
                  placeholder='{"key": "value"}'
                  value={payloadJson}
                  onChange={(e) => setPayloadJson(e.target.value)}
                  disabled={isLoading}
                  style={{ fontFamily: "monospace" }}
                />
              </Box>

              <Box>
                <Text
                  size="2"
                  weight="bold"
                  mb="2"
                  style={{ display: "block" }}
                >
                  Signature (hex):
                </Text>
                <TextField.Root
                  placeholder="0x1234...abcd or 1234...abcd"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  disabled={isLoading}
                  style={{ fontFamily: "monospace" }}
                />
              </Box>

              <Button
                size="3"
                className="crypto-button"
                onClick={handleVerifySignature}
                disabled={
                  isLoading || !enclaveObjectId || !signature || !payloadJson
                }
              >
                {isLoading ? "Verifying..." : "Verify Signature"}
              </Button>

              {verificationResult !== null && (
                <Box
                  p="3"
                  style={{
                    borderRadius: "8px",
                    background:
                      verificationResult === true
                        ? "rgba(16, 185, 129, 0.1)"
                        : "rgba(239, 68, 68, 0.1)",
                    border: `1px solid ${
                      verificationResult === true
                        ? "var(--market-success)"
                        : "var(--market-danger)"
                    }`,
                  }}
                >
                  <Flex align="center" gap="2">
                    <Badge
                      color={verificationResult === true ? "green" : "red"}
                      size="2"
                    >
                      {verificationResult === true ? "Valid" : "Invalid"}
                    </Badge>
                    <Text size="3">
                      Signature is{" "}
                      {verificationResult === true ? "valid" : "invalid"}
                    </Text>
                  </Flex>
                </Box>
              )}
            </Flex>
          </Box>
        </Card>

        {/* Shared Enclaves Section */}
        <Card className="crypto-card">
          <Box p="6">
            <Flex justify="between" align="center" mb="4">
              <Heading size="6" className="text-gradient">
                Your Shared Enclaves
              </Heading>
              <Button
                size="2"
                variant="soft"
                onClick={fetchSharedEnclaves}
                disabled={loadingEnclaves}
              >
                {loadingEnclaves ? "Loading..." : "Refresh"}
              </Button>
            </Flex>

            {loadingEnclaves ? (
              <Text size="3" color="gray">
                Loading enclaves...
              </Text>
            ) : sharedEnclaves.length > 0 ? (
              <Flex direction="column" gap="3">
                {sharedEnclaves.map((enclaveItem) => {
                  const { eventData, object } = enclaveItem;
                  const objectId = eventData.enclave_id;
                  const owner = object.data?.owner;

                  // Get PK from event data (it's already in the event)
                  const pkBytes = eventData.pk || [];
                  const pk =
                    "0x" +
                    pkBytes
                      .map((b: number) => b.toString(16).padStart(2, "0"))
                      .join("");

                  const ownerAddress = eventData.owner;

                  const isShared =
                    owner && typeof owner === "object" && "Shared" in owner;
                  const sharedVersion = isShared
                    ? (owner as any).Shared?.initial_shared_version
                    : "N/A";

                  return (
                    <Box
                      key={objectId}
                      className="crypto-card"
                      p="4"
                      style={{ background: "rgba(15, 23, 42, 0.5)" }}
                    >
                      <Flex direction="column" gap="2">
                        <Flex align="center" gap="2">
                          <Badge color="blue" size="2">
                            SHARED
                          </Badge>
                          {sharedVersion !== "N/A" && (
                            <Text size="1" color="gray">
                              v{sharedVersion}
                            </Text>
                          )}
                        </Flex>
                        <Text size="2" weight="bold">
                          Object ID:
                        </Text>
                        <Text
                          size="2"
                          style={{
                            fontFamily: "monospace",
                            wordBreak: "break-all",
                            color: "var(--market-accent)",
                          }}
                        >
                          {objectId}
                        </Text>
                        <Text size="2" weight="bold" mt="2">
                          Public Key:
                        </Text>
                        <Text
                          size="2"
                          style={{
                            fontFamily: "monospace",
                            wordBreak: "break-all",
                            color: "var(--market-accent)",
                          }}
                        >
                          {pk}
                        </Text>
                        <Text size="2" weight="bold" mt="2">
                          Creator:
                        </Text>
                        <Text
                          size="2"
                          style={{
                            fontFamily: "monospace",
                            wordBreak: "break-all",
                          }}
                        >
                          {ownerAddress}
                        </Text>
                      </Flex>
                    </Box>
                  );
                })}
              </Flex>
            ) : (
              <Text size="3" color="gray">
                No shared enclaves found. Create one using the form above.
              </Text>
            )}
          </Box>
        </Card>
      </Flex>
      </Container>
    </Box>
  );
}
