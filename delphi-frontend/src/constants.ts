// Dynamically import all coin images using Vite's glob import
// This handles missing images gracefully
const coinImageModules = import.meta.glob<string>(
    "./assets/images/coins/*.svg",
    { eager: true, import: "default" }
);

// Helper function to get coin image URL
// Returns empty string if image doesn't exist (will show broken image)
const getCoinImagePath = (coinValue: string): string => {
    const normalizedValue = coinValue.toLowerCase();
    // Try exact match first
    const exactPath = `./assets/images/coins/${normalizedValue}.svg`;
    if (coinImageModules[exactPath]) {
        return coinImageModules[exactPath];
    }
    // Try with hyphen variations (e.g., shiba-inu)
    const hyphenPath = `./assets/images/coins/${normalizedValue.replace(/_/g, "-")}.svg`;
    if (coinImageModules[hyphenPath]) {
        return coinImageModules[hyphenPath];
    }
    // Return empty string if not found (will show broken image icon)
    return "";
};

// Coin type definition
export interface Coin {
    name: string;
    value: string; // API value (lowercase, e.g., "bitcoin")
    symbol: string; // Trading symbol (e.g., "btc")
    image_svg_url: string; // Local image URL from Vite (empty if not found)
}

// Coin options for market creation
export const COINS: Coin[] = [
    {
        name: "Bitcoin",
        value: "bitcoin",
        symbol: "btc",
        image_svg_url: getCoinImagePath("bitcoin"),
    },
    {
        name: "Sui",
        value: "sui",
        symbol: "sui",
        image_svg_url: getCoinImagePath("sui"),
    },
    {
        name: "Ethereum",
        value: "ethereum",
        symbol: "eth",
        image_svg_url: getCoinImagePath("ethereum"),
    },
    {
        name: "BNB",
        value: "binancecoin",
        symbol: "bnb",
        image_svg_url: getCoinImagePath("bnb"),
    },
    {
        name: "Solana",
        value: "solana",
        symbol: "sol",
        image_svg_url: getCoinImagePath("solana"),
    },
    {
        name: "XRP",
        value: "ripple",
        symbol: "xrp",
        image_svg_url: getCoinImagePath("xrp"),
    },
    {
        name: "Dogecoin",
        value: "dogecoin",
        symbol: "doge",
        image_svg_url: getCoinImagePath("dogecoin"),
    },
    {
        name: "Cardano",
        value: "cardano",
        symbol: "ada",
        image_svg_url: getCoinImagePath("cardano"),
    },
    {
        name: "Avalanche",
        value: "avalanche-2",
        symbol: "avax",
        image_svg_url: getCoinImagePath("avalanche"),
    },
    {
        name: "Shiba Inu",
        value: "shiba-inu",
        symbol: "shib",
        image_svg_url: getCoinImagePath("shiba-inu"),
    },
    {
        name: "Chainlink",
        value: "chainlink",
        symbol: "link",
        image_svg_url: getCoinImagePath("chainlink"),
    },
    {
        name: "Polkadot",
        value: "polkadot",
        symbol: "dot",
        image_svg_url: getCoinImagePath("polkadot"),
    },
    {
        name: "Litecoin",
        value: "litecoin",
        symbol: "ltc",
        image_svg_url: getCoinImagePath("litecoin"),
    },
    {
        name: "TRON",
        value: "tron",
        symbol: "trx",
        image_svg_url: getCoinImagePath("tron"),
    },
    {
        name: "Polygon",
        value: "matic-network",
        symbol: "matic",
        image_svg_url: getCoinImagePath("polygon"),
    },
    {
        name: "Uniswap",
        value: "uniswap",
        symbol: "uni",
        image_svg_url: getCoinImagePath("uniswap"),
    },
    {
        name: "Optimism",
        value: "optimism",
        symbol: "op",
        image_svg_url: getCoinImagePath("optimism"),
    },
    {
        name: "Arbitrum",
        value: "arbitrum",
        symbol: "arb",
        image_svg_url: getCoinImagePath("arbitrum"),
    },
    {
        name: "Pepe",
        value: "pepe",
        symbol: "pepe",
        image_svg_url: getCoinImagePath("pepe"),
    },
];

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

