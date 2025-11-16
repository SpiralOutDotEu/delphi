import { networkConfig } from "../networkConfig";

export interface Market {
    address: string;
    asMoveObject: {
        contents: {
            json: {
                id?: {
                    id: string;
                };
                type_?: string;
                date: string;
                coin: string;
                comparator: string;
                price: string;
                result?: string;
                timestamp_ms: string;
                yes_shares?: string;
                no_shares?: string;
                virtual_yes_shares?: string;
                virtual_no_shares?: string;
                resolved?: boolean | string;
                outcome?: string;
                // Allow for any additional fields that might be present
                [key: string]: any;
            };
        };
    };
}

export interface MarketsResponse {
    data: {
        objects: {
            edges: Array<{
                node: Market;
            }>;
        };
    };
}

/**
 * Get the GraphQL URL for the current network
 */
export function getGraphQLUrl(network: string): string {
    const config = networkConfig[network as keyof typeof networkConfig] as any;
    return config?.graphqlUrl || "https://graphql.testnet.sui.io/graphql";
}

/**
 * Fetch Market objects from GraphQL
 */
export async function fetchMarkets(
    network: string,
    delphiPackageId: string
): Promise<Market[]> {
    const graphqlUrl = getGraphQLUrl(network);
    const marketType = `${delphiPackageId}::delphi::Market`;

    const query = `
    query getMarkets {
      objects(
        filter: {
          ownerKind: SHARED
          type: "${marketType}"
        }
      ) {
        edges {
          node {
            address
            asMoveObject {
              contents {
                json
              }
            }
          }
        }
      }
    }
  `;

    try {
        const response = await fetch(graphqlUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ query }),
        });

        if (!response.ok) {
            throw new Error(`GraphQL request failed: ${response.statusText}`);
        }

        const result: MarketsResponse = await response.json();

        if (result.data?.objects?.edges) {
            return result.data.objects.edges.map((edge) => edge.node);
        }

        return [];
    } catch (error) {
        console.error("Error fetching markets:", error);
        throw error;
    }
}

