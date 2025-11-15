import { getFullnodeUrl } from "@mysten/sui/client";
import { createNetworkConfig } from "@mysten/dapp-kit";

const { networkConfig, useNetworkVariable, useNetworkVariables } =
  createNetworkConfig({
    devnet: {
      url: getFullnodeUrl("devnet"),
      enclavePackageId: "0x0", // Update with actual package ID
    },
    testnet: {
      url: getFullnodeUrl("testnet"),
      enclavePackageId: "0x5233dab10091ab481816a0d8f89bc6d3b9cf483a4a41c37ed0bfe4e6f79ff646", // Update with actual package ID
    },
    mainnet: {
      url: getFullnodeUrl("mainnet"),
      enclavePackageId: "0x0", // Update with actual package ID
    },
  });

export { useNetworkVariable, useNetworkVariables, networkConfig };
