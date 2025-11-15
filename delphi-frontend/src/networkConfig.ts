import { getFullnodeUrl } from "@mysten/sui/client";
import { createNetworkConfig } from "@mysten/dapp-kit";

const { networkConfig, useNetworkVariable, useNetworkVariables } =
  createNetworkConfig({
    devnet: {
      url: getFullnodeUrl("devnet"),
      enclavePackageId: "0x0", // Update with actual package ID
      enclaveObjectId: "0x0", // Update with actual Enclave<DELPHI> object ID
      delphiPackageId: "0x0", // Update with actual package ID
      delphiConfigObjectId: "0x0", // Update with actual Config object ID
    },
    testnet: {
      url: getFullnodeUrl("testnet"),
      enclavePackageId: "0x3ad05f3d193e0a8b16f4529d770ddbf1496fb82fb6151940e8ca99036ff2d0f0",
      enclaveObjectId: "0xda57c3204986540b5e680b80ff2bb8b83db5a0e50a2cd581f2399bf0898a9ba3",
      delphiPackageId: "0x75f47435691bc728cefaae4bb7c7a1abb22c806e602cde50f2081e69a6c6169d",
      delphiConfigObjectId: "0xb84d0750044939d717d1520f04dc8f3c03556f5d1181f3f7ca592a8aa72f8e50",
    },
    mainnet: {
      url: getFullnodeUrl("mainnet"),
      enclavePackageId: "0x0", // Update with actual package ID
      enclaveObjectId: "0x0", // Update with actual Enclave<DELPHI> object ID
      delphiPackageId: "0x0", // Update with actual package ID
      delphiConfigObjectId: "0x0", // Update with actual Config object ID
    },
  });

export { useNetworkVariable, useNetworkVariables, networkConfig };
