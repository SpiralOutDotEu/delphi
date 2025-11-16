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
      enclaveObjectId: "0x01652ee906b1cc5bf398a190dffa5b7f696fc2178fb3f96123f4dbeb8079de26",
      delphiPackageId: "0xb65fd9e7130a467bd814831bb2931ca2fcb71f0f3606268b5ab020ef4ccc1dac",
      delphiConfigObjectId: "0xa06b4ae559352d3b7ade16d3b99a314baf48229241f6a52a5e6b6e755bd3476f",
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
