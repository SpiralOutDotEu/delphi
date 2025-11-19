import { Container, Flex, Heading, Text, Box, Card } from "@radix-ui/themes";
import { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";

interface FAQItemProps {
  value: string;
  question: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

function FAQItem({ question, children, isOpen, onToggle }: FAQItemProps) {
  return (
    <Card
      className="crypto-card"
      style={{ cursor: "pointer" }}
      onClick={onToggle}
    >
      <Box p="6">
        <Flex justify="between" align="center" mb={isOpen ? "4" : "0"}>
          <Heading size="5" style={{ flex: 1 }}>
            {question}
          </Heading>
          <Box style={{ marginLeft: "16px", flexShrink: 0 }}>
            {isOpen ? (
              <ChevronUpIcon width="20" height="20" />
            ) : (
              <ChevronDownIcon width="20" height="20" />
            )}
          </Box>
        </Flex>
        {isOpen && (
          <Box style={{ animation: "fadeIn 0.2s ease-in" }}>{children}</Box>
        )}
      </Box>
    </Card>
  );
}

export function FAQPage() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (value: string) => {
    setOpenItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(value)) {
        newSet.delete(value);
      } else {
        newSet.add(value);
      }
      return newSet;
    });
  };
  return (
    <Box className="page-container">
      <Container
        size="4"
        py="8"
        px={{ initial: "4", sm: "5", md: "6", lg: "8" }}
        style={{
          width: "100%",
          maxWidth: "100%",
          margin: "0 auto",
        }}
      >
        <Box mb="8" style={{ textAlign: "center" }}>
          <Heading
            size="9"
            mb="3"
            className="text-gradient"
            style={{ fontWeight: 700 }}
          >
            Frequently Asked Questions
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
            Learn how Delphi works in detail. Everything you need to know about
            prediction markets, TEE oracles, and collective intelligence.
          </Text>
        </Box>

        <Flex direction="column" gap="4">
          {/* What is Delphi */}
          <FAQItem
            value="what-is-delphi"
            question="What is Delphi?"
            isOpen={openItems.has("what-is-delphi")}
            onToggle={() => toggleItem("what-is-delphi")}
          >
            <Text
              size="3"
              style={{ color: "var(--oracle-text-secondary)", lineHeight: 1.7 }}
            >
              Delphi is a decentralized prediction market platform built on the
              Sui blockchain. It enables users to create and trade binary
              markets (Yes/No questions) about cryptocurrency prices. The
              platform combines Automated Market Making (AMM) with Trusted
              Execution Environment (TEE) oracles to provide verifiable,
              trustless market creation and resolution. Delphi is built on top
              of <strong>Nautilus</strong>, Sui's framework for verifiable
              off-chain computation, which ensures the TEE Oracle code is
              publicly verifiable and independently auditable.
            </Text>
          </FAQItem>

          {/* How does market creation work */}
          <FAQItem
            value="market-creation"
            question="How does market creation work?"
            isOpen={openItems.has("market-creation")}
            onToggle={() => toggleItem("market-creation")}
          >
            <Text
              size="3"
              style={{ color: "var(--oracle-text-secondary)", lineHeight: 1.7 }}
              mb="3"
            >
              Anyone can create a prediction market by asking a question like
              "Will Bitcoin price be higher than $100,000 on 11-12-2025?".
              Here's the detailed process:
            </Text>
            <Box
              pl="4"
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <Box>
                <Text
                  size="3"
                  weight="bold"
                  mb="1"
                  style={{ display: "block" }}
                >
                  1. Question Submission
                </Text>
                <Text
                  size="2"
                  style={{
                    color: "var(--oracle-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  The question is formatted with the coin, date, comparator (≤
                  or ≥), and price threshold. This is sent to our TEE Oracle for
                  validation.
                </Text>
              </Box>
              <Box>
                <Text
                  size="3"
                  weight="bold"
                  mb="1"
                  style={{ display: "block" }}
                >
                  2. TEE Oracle Verification
                </Text>
                <Text
                  size="2"
                  style={{
                    color: "var(--oracle-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  Our TEE Oracle (Trusted Execution Environment) running in an
                  AWS Nitro Enclave validates that:
                </Text>
                <Box pl="4" mt="1">
                  <Text
                    size="2"
                    style={{
                      color: "var(--oracle-text-secondary)",
                      lineHeight: 1.6,
                    }}
                  >
                    • The coin is supported and valid
                  </Text>
                  <Text
                    size="2"
                    style={{
                      color: "var(--oracle-text-secondary)",
                      lineHeight: 1.6,
                    }}
                  >
                    • The question format is correct
                  </Text>
                  <Text
                    size="2"
                    style={{
                      color: "var(--oracle-text-secondary)",
                      lineHeight: 1.6,
                    }}
                  >
                    • The date is in the correct format (DD-MM-YYYY)
                  </Text>
                </Box>
              </Box>
              <Box>
                <Text
                  size="3"
                  weight="bold"
                  mb="1"
                  style={{ display: "block" }}
                >
                  3. Cryptographic Signature
                </Text>
                <Text
                  size="2"
                  style={{
                    color: "var(--oracle-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  The TEE Oracle returns the validated question data with a
                  cryptographically signed response. This signature proves the
                  question came from our verified, tamper-proof enclave. Thanks
                  to reproducible builds, anyone can independently build the
                  code and verify that the running instance matches the
                  published source code. This shifts trust from runtime to build
                  time, ensuring complete transparency.
                </Text>
              </Box>
              <Box>
                <Text
                  size="3"
                  weight="bold"
                  mb="1"
                  style={{ display: "block" }}
                >
                  4. On-Chain Market Creation
                </Text>
                <Text
                  size="2"
                  style={{
                    color: "var(--oracle-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  The signed data is submitted to the Sui smart contract, which
                  verifies the signature against the registered enclave public
                  key and Platform Configuration Registers (PCRs) before
                  creating the market. This ensures only valid, verified
                  questions can create markets.
                </Text>
              </Box>
            </Box>
          </FAQItem>

          {/* What is TEE Oracle */}
          <FAQItem
            value="tee-oracle"
            question="What is a TEE Oracle and why is it important?"
            isOpen={openItems.has("tee-oracle")}
            onToggle={() => toggleItem("tee-oracle")}
          >
            <Text
              size="3"
              style={{ color: "var(--oracle-text-secondary)", lineHeight: 1.7 }}
              mb="3"
            >
              TEE stands for Trusted Execution Environment. Delphi uses
              Nautilus, Sui's framework for verifiable off-chain computation.
              Our TEE Oracle runs in an AWS Nitro Enclave, which is a secure,
              isolated computing environment. Here's why it matters:
            </Text>
            <Box
              pl="4"
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <Box>
                <Text
                  size="3"
                  weight="bold"
                  mb="1"
                  style={{ display: "block" }}
                >
                  🔒 Independent Verification
                </Text>
                <Text
                  size="2"
                  style={{
                    color: "var(--oracle-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  The enclave code is publicly available and uses reproducible
                  builds. This means anyone can build the code locally and
                  verify that the running instance matches the published source
                  code. You don't have to trust us—you can verify it yourself.
                  Any changes to the software result in different measurements,
                  making unauthorized modifications immediately detectable.
                </Text>
              </Box>
              <Box>
                <Text
                  size="3"
                  weight="bold"
                  mb="1"
                  style={{ display: "block" }}
                >
                  ✍️ Cryptographic Signatures
                </Text>
                <Text
                  size="2"
                  style={{
                    color: "var(--oracle-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  Every response from the TEE Oracle is cryptographically
                  signed. This signature can be verified on-chain using the
                  enclave's public key, ensuring that market creation and
                  resolution data comes from the trusted environment and hasn't
                  been tampered with.
                </Text>
              </Box>
              <Box>
                <Text
                  size="3"
                  weight="bold"
                  mb="1"
                  style={{ display: "block" }}
                >
                  🛡️ Certificate Chain Verification
                </Text>
                <Text
                  size="2"
                  style={{
                    color: "var(--oracle-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  The attestation document from AWS Nitro Enclave includes a
                  certificate chain that can be verified on-chain using AWS as
                  the root certificate authority. This confirms the enclave
                  instance is running unmodified software, as validated by its
                  Platform Configuration Registers (PCRs). The verification
                  happens during enclave registration, ensuring the highest
                  level of trust.
                </Text>
              </Box>
              <Box>
                <Text
                  size="3"
                  weight="bold"
                  mb="1"
                  style={{ display: "block" }}
                >
                  ☁️ Cloud Provider Security
                </Text>
                <Text
                  size="2"
                  style={{
                    color: "var(--oracle-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  AWS Nitro Enclaves benefit from cloud provider security: rapid
                  response to vulnerabilities, strong physical security at data
                  centers, and compliance with strict standards (SOC 2, ISO
                  27001, CSA STAR). This provides an additional layer of
                  security beyond the enclave itself.
                </Text>
              </Box>
            </Box>
          </FAQItem>

          {/* How does trading work */}
          <FAQItem
            value="trading"
            question="How does trading work?"
            isOpen={openItems.has("trading")}
            onToggle={() => toggleItem("trading")}
          >
            <Text
              size="3"
              style={{ color: "var(--oracle-text-secondary)", lineHeight: 1.7 }}
              mb="3"
            >
              Once a market is created, users can trade YES or NO shares based
              on their predictions. Delphi uses a Logarithmic Market Scoring
              Rule (LMSR) Automated Market Maker (AMM):
            </Text>
            <Box
              pl="4"
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <Box>
                <Text
                  size="3"
                  weight="bold"
                  mb="1"
                  style={{ display: "block" }}
                >
                  Dynamic Pricing
                </Text>
                <Text
                  size="2"
                  style={{
                    color: "var(--oracle-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  The AMM automatically adjusts prices based on the ratio of
                  YES/NO shares:
                </Text>
                <Box pl="4" mt="1">
                  <Text
                    size="2"
                    style={{
                      color: "var(--oracle-text-secondary)",
                      lineHeight: 1.6,
                    }}
                  >
                    • 50/50 split → Equal prices (~0.5 per share)
                  </Text>
                  <Text
                    size="2"
                    style={{
                      color: "var(--oracle-text-secondary)",
                      lineHeight: 1.6,
                    }}
                  >
                    • More YES shares → YES becomes expensive, NO becomes cheap
                  </Text>
                  <Text
                    size="2"
                    style={{
                      color: "var(--oracle-text-secondary)",
                      lineHeight: 1.6,
                    }}
                  >
                    • More NO shares → NO becomes expensive, YES becomes cheap
                  </Text>
                </Box>
              </Box>
              <Box>
                <Text
                  size="3"
                  weight="bold"
                  mb="1"
                  style={{ display: "block" }}
                >
                  Continuous Liquidity
                </Text>
                <Text
                  size="2"
                  style={{
                    color: "var(--oracle-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  The LMSR AMM provides continuous liquidity, meaning you can
                  always buy or sell shares at any time before the market
                  freezes. There's no need to wait for a matching order from
                  another trader.
                </Text>
              </Box>
              <Box>
                <Text
                  size="3"
                  weight="bold"
                  mb="1"
                  style={{ display: "block" }}
                >
                  Market Sentiment Indicator
                </Text>
                <Text
                  size="2"
                  style={{
                    color: "var(--oracle-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  The dynamic pricing reflects collective market sentiment in
                  real-time. The current price of YES shares represents the
                  market's implied probability that the outcome will be YES.
                  This gives you insights into what the crowd thinks will
                  happen.
                </Text>
              </Box>
            </Box>
          </FAQItem>

          {/* How does resolution work */}
          <FAQItem
            value="resolution"
            question="How does market resolution work?"
            isOpen={openItems.has("resolution")}
            onToggle={() => toggleItem("resolution")}
          >
            <Text
              size="3"
              style={{ color: "var(--oracle-text-secondary)", lineHeight: 1.7 }}
              mb="3"
            >
              When the resolution date arrives, any user can trigger the
              resolution process:
            </Text>
            <Box
              pl="4"
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <Box>
                <Text
                  size="3"
                  weight="bold"
                  mb="1"
                  style={{ display: "block" }}
                >
                  1. Query the TEE Oracle
                </Text>
                <Text
                  size="2"
                  style={{
                    color: "var(--oracle-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  The user sends a request to the TEE Oracle with the market's
                  question parameters (type 2 request for resolution).
                </Text>
              </Box>
              <Box>
                <Text
                  size="3"
                  weight="bold"
                  mb="1"
                  style={{ display: "block" }}
                >
                  2. Price Fetching & Comparison
                </Text>
                <Text
                  size="2"
                  style={{
                    color: "var(--oracle-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  The TEE Oracle fetches the actual closing price for the
                  specified coin and date from verified data sources (CoinGecko
                  API). It then compares the actual price with the market's
                  threshold based on the comparator:
                </Text>
                <Box pl="4" mt="1">
                  <Text
                    size="2"
                    style={{
                      color: "var(--oracle-text-secondary)",
                      lineHeight: 1.6,
                    }}
                  >
                    • Comparator 1 (≤): Checks if actual price ≤ threshold
                  </Text>
                  <Text
                    size="2"
                    style={{
                      color: "var(--oracle-text-secondary)",
                      lineHeight: 1.6,
                    }}
                  >
                    • Comparator 2 (≥): Checks if actual price ≥ threshold
                  </Text>
                </Box>
              </Box>
              <Box>
                <Text
                  size="3"
                  weight="bold"
                  mb="1"
                  style={{ display: "block" }}
                >
                  3. Signed Response
                </Text>
                <Text
                  size="2"
                  style={{
                    color: "var(--oracle-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  The TEE Oracle returns the result (1 = condition met, 2 =
                  condition not met) along with the actual price and a
                  cryptographic signature. This signature proves the answer came
                  from the trusted environment.
                </Text>
              </Box>
              <Box>
                <Text
                  size="3"
                  weight="bold"
                  mb="1"
                  style={{ display: "block" }}
                >
                  4. On-Chain Verification & Resolution
                </Text>
                <Text
                  size="2"
                  style={{
                    color: "var(--oracle-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  The signed resolution is submitted to the smart contract,
                  which verifies the signature against the registered enclave
                  public key. If valid, the market is resolved, determining the
                  winning outcome (YES or NO) and calculating payouts.
                </Text>
              </Box>
            </Box>
          </FAQItem>

          {/* How do payouts work */}
          <FAQItem
            value="payouts"
            question="How do payouts work?"
            isOpen={openItems.has("payouts")}
            onToggle={() => toggleItem("payouts")}
          >
            <Text
              size="3"
              style={{ color: "var(--oracle-text-secondary)", lineHeight: 1.7 }}
              mb="3"
            >
              Delphi uses a pari-mutuel style payout system where winners share
              the entire collateral pool pro-rata:
            </Text>
            <Box
              pl="4"
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <Box>
                <Text
                  size="3"
                  weight="bold"
                  mb="1"
                  style={{ display: "block" }}
                >
                  Pro-Rata Distribution
                </Text>
                <Text
                  size="2"
                  style={{
                    color: "var(--oracle-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  After resolution, the total collateral in the market is
                  divided equally among all winning shares. If you hold more
                  winning shares, you receive a larger portion of the pool.
                  Losing side holders receive nothing.
                </Text>
              </Box>
              <Box>
                <Text
                  size="3"
                  weight="bold"
                  mb="1"
                  style={{ display: "block" }}
                >
                  Rewarding Early Predictions
                </Text>
                <Text
                  size="2"
                  style={{
                    color: "var(--oracle-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  Since shares are cheaper early in the market's lifecycle,
                  users who correctly predict the outcome early receive higher
                  returns. For example, if you bought YES shares when they cost
                  $0.30 and the market resolves YES, you get a larger return
                  than someone who bought YES shares at $0.80.
                </Text>
              </Box>
              <Box>
                <Text
                  size="3"
                  weight="bold"
                  mb="1"
                  style={{ display: "block" }}
                >
                  Contrarian Rewards
                </Text>
                <Text
                  size="2"
                  style={{
                    color: "var(--oracle-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  When most traders bet on one side, that side becomes
                  expensive. If you bet against the crowd (the contrarian
                  position) and win, you get rewarded more because you bought
                  shares when they were cheaper. This incentivizes independent
                  thinking and helps correct market mispricing.
                </Text>
              </Box>
            </Box>
          </FAQItem>

          {/* Collective Intelligence */}
          <FAQItem
            value="collective-intelligence"
            question="What is collective intelligence and how does Delphi harness it?"
            isOpen={openItems.has("collective-intelligence")}
            onToggle={() => toggleItem("collective-intelligence")}
          >
            <Text
              size="3"
              style={{ color: "var(--oracle-text-secondary)", lineHeight: 1.7 }}
              mb="3"
            >
              Collective intelligence refers to the idea that groups of
              individuals can make better decisions than individuals alone.
              Delphi incentivizes this through its reward structure:
            </Text>
            <Box
              pl="4"
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <Box>
                <Text
                  size="3"
                  weight="bold"
                  mb="1"
                  style={{ display: "block" }}
                >
                  🎯 Incentivizing Accuracy
                </Text>
                <Text
                  size="2"
                  style={{
                    color: "var(--oracle-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  By rewarding early correct predictions, Delphi encourages
                  users to do research and make informed predictions. The
                  earlier you're right, the more you're rewarded.
                </Text>
              </Box>
              <Box>
                <Text
                  size="3"
                  weight="bold"
                  mb="1"
                  style={{ display: "block" }}
                >
                  💡 Encouraging Contrarian Thinking
                </Text>
                <Text
                  size="2"
                  style={{
                    color: "var(--oracle-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  When the market leans heavily to one side, contrarian
                  positions become cheaper. If you're right when betting against
                  the crowd, you're rewarded more. This helps correct market
                  mispricing and brings the market price closer to the true
                  probability.
                </Text>
              </Box>
              <Box>
                <Text
                  size="3"
                  weight="bold"
                  mb="1"
                  style={{ display: "block" }}
                >
                  📊 Real-Time Market Insights
                </Text>
                <Text
                  size="2"
                  style={{
                    color: "var(--oracle-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  The dynamic pricing mechanism reveals what the collective
                  thinks in real-time. The current price of YES shares
                  represents the market's consensus on the probability of that
                  outcome. This aggregated information is valuable for
                  decision-making.
                </Text>
              </Box>
              <Box>
                <Text
                  size="3"
                  weight="bold"
                  mb="1"
                  style={{ display: "block" }}
                >
                  🧠 Wisdom of the Crowd
                </Text>
                <Text
                  size="2"
                  style={{
                    color: "var(--oracle-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  By combining many individual predictions through the AMM
                  mechanism, Delphi creates a more accurate forecast than any
                  single individual could provide. The market price reflects the
                  collective wisdom of all participants.
                </Text>
              </Box>
            </Box>
          </FAQItem>

          {/* Future Markets */}
          <FAQItem
            value="future-markets"
            question="Will Delphi support other types of markets?"
            isOpen={openItems.has("future-markets")}
            onToggle={() => toggleItem("future-markets")}
          >
            <Text
              size="3"
              style={{ color: "var(--oracle-text-secondary)", lineHeight: 1.7 }}
              mb="3"
            >
              Yes! Cryptocurrency price predictions are just the beginning.
              Delphi is designed to expand and support a wide variety of
              prediction markets in the future:
            </Text>
            <Box
              pl="4"
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <Box>
                <Text
                  size="3"
                  weight="bold"
                  mb="1"
                  style={{ display: "block" }}
                >
                  📈 Traditional Assets
                </Text>
                <Text
                  size="2"
                  style={{
                    color: "var(--oracle-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  Stock prices, commodities, forex rates, and other traditional
                  financial instruments. Predict whether the S&P 500 will reach
                  a certain level, or if gold prices will exceed a threshold.
                </Text>
              </Box>
              <Box>
                <Text
                  size="3"
                  weight="bold"
                  mb="1"
                  style={{ display: "block" }}
                >
                  ⚽ Sports & Events
                </Text>
                <Text
                  size="2"
                  style={{
                    color: "var(--oracle-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  Sports outcomes, election results, award ceremonies, and other
                  real-world events. Create markets on game scores, tournament
                  winners, or political outcomes.
                </Text>
              </Box>
              <Box>
                <Text
                  size="3"
                  weight="bold"
                  mb="1"
                  style={{ display: "block" }}
                >
                  🌍 Global Events
                </Text>
                <Text
                  size="2"
                  style={{
                    color: "var(--oracle-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  Weather predictions, economic indicators, technology
                  milestones, and more. The platform's flexible architecture
                  allows for any verifiable outcome.
                </Text>
              </Box>
              <Box>
                <Text
                  size="3"
                  weight="bold"
                  mb="1"
                  style={{ display: "block" }}
                >
                  🔮 The Future
                </Text>
                <Text
                  size="2"
                  style={{
                    color: "var(--oracle-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  As long as there's a reliable data source that can be verified
                  by our TEE Oracle, we can create prediction markets for it.
                  The same trust and verification mechanisms that secure crypto
                  price markets will secure all future market types.
                </Text>
              </Box>
            </Box>
            <Box
              mt="4"
              style={{
                background: "rgba(33, 150, 243, 0.1)",
                padding: "12px",
                borderRadius: "6px",
                border: "1px solid rgba(33, 150, 243, 0.2)",
              }}
            >
              <Text
                size="2"
                style={{ color: "var(--oracle-primary)", lineHeight: 1.6 }}
              >
                <strong>🚀 Building the Future:</strong> We're starting with
                crypto prices to prove the concept, but our vision is much
                broader. Delphi aims to become the go-to platform for verifiable
                prediction markets across all domains.
              </Text>
            </Box>
          </FAQItem>

          {/* Development Note */}
          <FAQItem
            value="development-note"
            question="Development Note"
            isOpen={openItems.has("development-note")}
            onToggle={() => toggleItem("development-note")}
          >
            <Box
              style={{
                background: "rgba(255, 193, 7, 0.05)",
                padding: "16px",
                borderRadius: "8px",
                border: "1px solid rgba(255, 193, 7, 0.2)",
              }}
            >
              <Text
                size="2"
                style={{
                  color: "var(--oracle-text-secondary)",
                  lineHeight: 1.6,
                }}
              >
                During this initial Proof of Concept (PoC) phase, more relaxed
                rules are applied to facilitate testing:
              </Text>
              <Box pl="4" mt="2">
                <Text
                  size="2"
                  style={{
                    color: "var(--oracle-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  • Markets can be created for past prices (allowing immediate
                  testing of resolution)
                </Text>
                <Text
                  size="2"
                  style={{
                    color: "var(--oracle-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  • No freezing period is enforced (trading continues until
                  resolution)
                </Text>
                <Text
                  size="2"
                  style={{
                    color: "var(--oracle-text-secondary)",
                    lineHeight: 1.6,
                  }}
                  mt="2"
                >
                  Additionally, a <strong>pseudo-enclave</strong> API and Move
                  contract are used instead of a full AWS Nitro Enclave
                  deployment for easier testing without additional
                  infrastructure costs.
                </Text>
              </Box>
            </Box>
          </FAQItem>
        </Flex>
      </Container>
    </Box>
  );
}
