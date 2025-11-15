// Coin options for market creation
export const COINS = [
    { display: "Bitcoin", value: "bitcoin" },
    { display: "SUI", value: "sui" },
    { display: "Ethereum", value: "ethereum" },
    { display: "Solana", value: "solana" },
    { display: "Cardano", value: "cardano" },
    { display: "Polkadot", value: "polkadot" },
    { display: "Chainlink", value: "chainlink" },
    { display: "Polygon", value: "polygon" },
    { display: "Avalanche", value: "avalanche" },
    { display: "Litecoin", value: "litecoin" },
    { display: "Dogecoin", value: "dogecoin" },
] as const;

// Comparator options
export const COMPARATORS = [
    { display: "Less or Equal", value: 1 },
    { display: "Higher or Equal", value: 2 },
] as const;

// API endpoint for signature validation
export const API_ENDPOINT = "http://localhost:3000/process_data"; // Pseudo - Enclave API URL

// Market creation constants
export const MARKET_TYPE = 1; // Type 1 is for question
export const MARKET_RESULT = 0; // Result must be 0 for input (API requirement) 

