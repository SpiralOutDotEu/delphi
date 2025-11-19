import { Dialog, Flex, Text, Button, Box, Heading } from "@radix-ui/themes";
import { useNavigate } from "react-router-dom";

interface HowItWorksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HowItWorksModal({ open, onOpenChange }: HowItWorksModalProps) {
  const navigate = useNavigate();

  const handleLearnMore = () => {
    onOpenChange(false);
    navigate("/faq");
  };
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 600 }}>
        <Dialog.Title>How Delphi Works</Dialog.Title>

        <Flex direction="column" gap="5" mt="5">
          {/* Step 1 */}
          <Flex align="start" gap="3">
            <Box
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "var(--oracle-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Text size="4" weight="bold" style={{ color: "white" }}>
                1
              </Text>
            </Box>
            <Box style={{ flex: 1 }}>
              <Heading size="4" mb="2">
                Create a Market
              </Heading>
              <Text size="3" style={{ color: "var(--oracle-text-secondary)", lineHeight: 1.6 }}>
                Create a prediction market by asking a question like "Will Bitcoin price be higher
                than $100,000 on 11-12-2025?". The question is verified by our{" "}
                <strong>TEE Oracle</strong> (Trusted Execution Environment), which validates the coin
                and returns a cryptographically signed response. The signature proves the question
                came from our verified, tamper-proof enclave.
              </Text>
            </Box>
          </Flex>

          {/* Step 2 */}
          <Flex align="start" gap="3">
            <Box
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "var(--oracle-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Text size="4" weight="bold" style={{ color: "white" }}>
                2
              </Text>
            </Box>
            <Box style={{ flex: 1 }}>
              <Heading size="4" mb="2">
                Trade Shares
              </Heading>
              <Text size="3" style={{ color: "var(--oracle-text-secondary)", lineHeight: 1.6 }}>
                Buy YES or NO shares based on your prediction. The automated market maker (AMM)
                adjusts prices dynamically based on market sentiment. When more people buy YES, YES
                shares become more expensive and NO shares become cheaper. This reflects{" "}
                <strong>collective market intelligence</strong> in real-time, showing what the
                crowd thinks will happen.
              </Text>
            </Box>
          </Flex>

          {/* Step 3 */}
          <Flex align="start" gap="3">
            <Box
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "var(--oracle-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Text size="4" weight="bold" style={{ color: "white" }}>
                3
              </Text>
            </Box>
            <Box style={{ flex: 1 }}>
              <Heading size="4" mb="2">
                Resolve the Market
              </Heading>
              <Text size="3" style={{ color: "var(--oracle-text-secondary)", lineHeight: 1.6 }}>
                When the resolution date arrives, any user can query the <strong>TEE Oracle</strong>{" "}
                for the answer. The oracle fetches the actual closing price from verified data
                sources, compares it with the market's threshold, and returns the result with a
                cryptographic signature. The signed answer is verified on-chain, ensuring the
                outcome is based on tamper-proof, verifiable data.
              </Text>
            </Box>
          </Flex>

          {/* Step 4 */}
          <Flex align="start" gap="3">
            <Box
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "var(--oracle-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Text size="4" weight="bold" style={{ color: "white" }}>
                4
              </Text>
            </Box>
            <Box style={{ flex: 1 }}>
              <Heading size="4" mb="2">
                Claim Rewards
              </Heading>
              <Text size="3" style={{ color: "var(--oracle-text-secondary)", lineHeight: 1.6 }}>
                After resolution, winners share the entire collateral pool pro-rata. This creates a
                pari-mutuel style pool that rewards <strong>early correct predictions</strong> and{" "}
                <strong>contrarian positions</strong> (betting against the crowd when correct). By
                incentivizing accurate early predictions, Delphi harnesses{" "}
                <strong>collective intelligence</strong> to create better forecasts.
              </Text>
            </Box>
          </Flex>
        </Flex>

        <Flex gap="3" justify="end" mt="6">
          <Button
            size="3"
            variant="soft"
            onClick={handleLearnMore}
            style={{ color: "var(--oracle-primary)" }}
          >
            Learn more
          </Button>
          <Dialog.Close>
            <Button size="3" style={{ background: "var(--oracle-primary)" }}>
              Got it!
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

