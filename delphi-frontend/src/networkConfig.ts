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
      enclaveObjectId: "0xdfaf6532a8bba34bec191f9e10bf767ba9f6633c725870bd6122b1b86332d543",
      delphiPackageId: "0xab2b77d092e180c5af290f525e8b60483682b9fb94de17309b2dca31911fe7c1",
      delphiConfigObjectId: "0x00032c64a5d00285705f45514400699c3b4ec58e4cf74e2194a4e10c4419ad2f",
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
