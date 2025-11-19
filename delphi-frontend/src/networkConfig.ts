import { getFullnodeUrl } from "@mysten/sui/client";
import { createNetworkConfig } from "@mysten/dapp-kit";

const { networkConfig, useNetworkVariable, useNetworkVariables } =
  createNetworkConfig({
    devnet: {
      url: getFullnodeUrl("devnet"),
      graphqlUrl: "https://graphql.mainnet.sui.io/graphql",
      enclavePackageId: "0x0", // Update with actual package ID
      enclaveObjectId: "0x0", // Update with actual Enclave<DELPHI> object ID
      delphiPackageId: "0x0", // Update with actual package ID
      delphiConfigObjectId: "0x0", // Update with actual Config object ID
      pseudoUsdcPackageId: "0x0", // Update with actual package ID
      pseudoUsdcFaucetObjectId: "0x0", // Update with actual Faucet object ID
    },
    testnet: {
      url: getFullnodeUrl("testnet"),
      graphqlUrl: "https://graphql.testnet.sui.io/graphql",
      enclavePackageId: "0x3ad05f3d193e0a8b16f4529d770ddbf1496fb82fb6151940e8ca99036ff2d0f0",
      enclaveObjectId: "0x9ba542cf0f38cce1c7867a0359eecc33861ff27b4b3eb61293693d8867611f6f",
      delphiPackageId: "0x2ea743c056f85f4fb931cc5cd9b79faaba74e35630ef668711ffc40f48022669",
      delphiConfigObjectId: "0x437fc674948e44fbb50a5b8a76c420e2fb94607d7044d6b7de86815ed0e28481",
      pseudoUsdcPackageId: "0x647a2acf348ed70ba023654262fe5dfee0ecd2903c5f3d4fbc094f492e2a02b8",
      pseudoUsdcFaucetObjectId: "0x19b80c192cbbef170340904ed3b365dbe32b7119a8448c8f11556f4c44711093",
    },
    mainnet: {
      url: getFullnodeUrl("mainnet"),
      graphqlUrl: "https://graphql.devnet.sui.io/graphql",
      enclavePackageId: "0x0", // Update with actual package ID
      enclaveObjectId: "0x0", // Update with actual Enclave<DELPHI> object ID
      delphiPackageId: "0x0", // Update with actual package ID
      delphiConfigObjectId: "0x0", // Update with actual Config object ID
      pseudoUsdcPackageId: "0x0", // Update with actual package ID
      pseudoUsdcFaucetObjectId: "0x0", // Update with actual Faucet object ID
    },
  });

export { useNetworkVariable, useNetworkVariables, networkConfig };
