import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  Card,
  Badge,
} from "@radix-ui/themes";

export function OwnedObjectsPage() {
  const account = useCurrentAccount();
  const { data, isPending, error } = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: account?.address as string,
    },
    {
      enabled: !!account,
    },
  );

  return (
    <Container size="4" py="6">
      <Heading size="8" mb="6" className="text-gradient">
        My Objects
      </Heading>

      {!account ? (
        <Card className="crypto-card">
          <Box p="6">
            <Text size="4" color="gray">
              Please connect your wallet to view your objects.
            </Text>
          </Box>
        </Card>
      ) : error ? (
        <Card className="crypto-card">
          <Box p="6">
            <Text size="4" color="red">
              Error: {error.message}
            </Text>
          </Box>
        </Card>
      ) : isPending || !data ? (
        <Card className="crypto-card">
          <Box p="6">
            <Text size="4" color="gray">
              Loading...
            </Text>
          </Box>
        </Card>
      ) : data.data.length === 0 ? (
        <Card className="crypto-card">
          <Box p="6">
            <Text size="4" color="gray">
              No objects owned by the connected wallet.
            </Text>
          </Box>
        </Card>
      ) : (
        <Box
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "20px",
          }}
        >
          {data.data.map((object) => (
            <Card
              key={object.data?.objectId}
              className="crypto-card crypto-glow-hover"
            >
              <Box p="5">
                <Flex direction="column" gap="3">
                  <Flex justify="between" align="center">
                    <Badge color="violet" size="2">
                      Object
                    </Badge>
                    {object.data?.type && (
                      <Text size="1" color="gray">
                        {object.data.type.split("::").pop()}
                      </Text>
                    )}
                  </Flex>
                  <Box>
                    <Text size="2" color="gray" mb="1">
                      Object ID
                    </Text>
                    <Text
                      size="3"
                      style={{
                        fontFamily: "monospace",
                        wordBreak: "break-all",
                        color: "var(--crypto-accent)",
                      }}
                    >
                      {object.data?.objectId}
                    </Text>
                  </Box>
                  {object.data?.version && (
                    <Box>
                      <Text size="2" color="gray" mb="1">
                        Version
                      </Text>
                      <Text size="3">{object.data.version}</Text>
                    </Box>
                  )}
                </Flex>
              </Box>
            </Card>
          ))}
        </Box>
      )}
    </Container>
  );
}

