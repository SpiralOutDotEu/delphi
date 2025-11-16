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
    },
    testnet: {
      url: getFullnodeUrl("testnet"),
      graphqlUrl: "https://graphql.testnet.sui.io/graphql",
      enclavePackageId: "0x3ad05f3d193e0a8b16f4529d770ddbf1496fb82fb6151940e8ca99036ff2d0f0",
      enclaveObjectId: "0xdd4141ea815f54a500d0136722a6d1bf56825d8a883fc59a3a93876fa5de506a",
      delphiPackageId: "0xf5622bf11bac2c0653f6da28e53263b45e7ac2cf5f493cc53ef7fe0f3734012c",
      delphiConfigObjectId: "0x9de4688eac02dc49466582c94b11df31de86a02cec66284fe48d9a0e74e099b9",
    },
    mainnet: {
      url: getFullnodeUrl("mainnet"),
      graphqlUrl: "https://graphql.devnet.sui.io/graphql",
      enclavePackageId: "0x0", // Update with actual package ID
      enclaveObjectId: "0x0", // Update with actual Enclave<DELPHI> object ID
      delphiPackageId: "0x0", // Update with actual package ID
      delphiConfigObjectId: "0x0", // Update with actual Config object ID
    },
  });

export { useNetworkVariable, useNetworkVariables, networkConfig };
