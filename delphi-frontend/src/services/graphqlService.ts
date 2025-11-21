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

export interface ObjectResponse {
    data: {
        object: {
            address: string;
            asMoveObject: {
                contents: {
                    type: {
                        repr: string;
                    };
                    json: any;
                };
            };
        } | null;
    };
}

export interface Position {
    address: string;
    version: string;
    asMoveObject: {
        contents: {
            json: {
                id: string;
                market: string;
                yes_shares: string;
                no_shares: string;
            };
        };
    };
}

export interface PositionsResponse {
    data: {
        objects: {
            nodes: Position[];
        };
    };
}

export interface TradeEvent {
    sender: {
        address: string;
    };
    timestamp: string;
    contents: {
        type: {
            repr: string;
        };
        json: {
            sender: string;
            market_id: string;
            trade_type: number; // 0 = MARKET_CREATED, 1 = BUY, 2 = SELL
            side: number; // 0 = NONE, 1 = YES, 2 = NO
            amount: string;
            collateral_delta: string;
            collateral_increase: boolean;
            total_collateral: string;
            cost_buy_yes: string;
            cost_buy_no: string;
            cost_sell_yes: string;
            cost_sell_no: string;
            prob_yes: string;
            prob_no: string;
        };
    };
}

export interface TradesResponse {
    data: {
        serviceConfig?: {
            maxPageSize: number;
        };
        events: {
            nodes: TradeEvent[];
            pageInfo?: {
                hasNextPage: boolean;
                hasPreviousPage: boolean;
                startCursor: string;
                endCursor: string;
            };
        };
    };
}

export interface PositionClosedEvent {
    sender: {
        address: string;
    };
    timestamp: string;
    contents: {
        type: {
            repr: string;
        };
        json: {
            sender: string;
            market_id: string;
            position_id: string;
            winning_shares: string;
            total_payout: string;
        };
    };
}

export interface PositionClosedResponse {
    data: {
        events: {
            nodes: PositionClosedEvent[];
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

/**
 * Fetch any object by address from GraphQL (generic function)
 */
export async function fetchObjectByAddress(
    network: string,
    address: string
): Promise<ObjectResponse["data"]["object"]> {
    const graphqlUrl = getGraphQLUrl(network);

    const query = `
    query getObjectByAddress {
      object(address: "${address}") {
        address
        asMoveObject {
          contents {
            type {
              repr
            }
            json
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

        const result: ObjectResponse = await response.json();

        return result.data?.object || null;
    } catch (error) {
        console.error("Error fetching object:", error);
        throw error;
    }
}

/**
 * Fetch all open positions for a user
 */
export async function getUserPositions(
    network: string,
    owner: string,
    delphiPackageId: string
): Promise<Position[]> {
    const graphqlUrl = getGraphQLUrl(network);
    const positionType = `${delphiPackageId}::delphi::Position`;

    const query = `
    query GetUserPositions($owner: SuiAddress!) {
      objects(filter: { owner: $owner, type: "${positionType}" }) {
        nodes {
          address
          version
          asMoveObject {
            contents {
              json
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
            body: JSON.stringify({
                query,
                variables: { owner },
            }),
        });

        if (!response.ok) {
            throw new Error(`GraphQL request failed: ${response.statusText}`);
        }

        const result: PositionsResponse = await response.json();

        if (result.data?.objects?.nodes) {
            return result.data.objects.nodes;
        }

        return [];
    } catch (error) {
        console.error("Error fetching user positions:", error);
        throw error;
    }
}

/**
 * Fetch positions for a user filtered by market ID
 */
export async function getUserPositionsForMarket(
    network: string,
    owner: string,
    marketId: string,
    delphiPackageId: string
): Promise<Position[]> {
    const allPositions = await getUserPositions(network, owner, delphiPackageId);

    // Filter positions by market ID
    return allPositions.filter(
        (position) => position.asMoveObject.contents.json.market === marketId
    );
}

/**
 * Fetch Trade events for a specific market
 * Uses pagination to fetch all trades, then filters by market ID
 */
export async function fetchMarketTrades(
    network: string,
    marketId: string,
    delphiPackageId: string
): Promise<TradeEvent[]> {
    const graphqlUrl = getGraphQLUrl(network);
    const tradeEventType = `${delphiPackageId}::delphi::Trade`;
    const allTrades: TradeEvent[] = [];
    let beforeCursor: string | null = null;
    let hasMorePages = true;
    const pageSize = 50;

    try {
        // Fetch all pages of events
        while (hasMorePages) {
            const query = `
        query getMarketTrades {
          serviceConfig {
            maxPageSize(type: "Query", field: "events")
          }
          events(
            last: ${pageSize}${beforeCursor ? `, before: "${beforeCursor}"` : ""}
            filter: {
              type: "${tradeEventType}"
            }
          ) {
            nodes {
              sender {
                address
              }
              timestamp
              contents {
                type {
                  repr
                }
                json
              }
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
          }
        }
      `;

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

            const result: TradesResponse = await response.json();

            if (result.data?.events?.nodes) {
                allTrades.push(...result.data.events.nodes);
            }

            // Check if there are more pages to fetch
            const pageInfo = result.data?.events?.pageInfo;
            if (pageInfo?.hasPreviousPage && pageInfo.startCursor) {
                beforeCursor = pageInfo.startCursor;
                hasMorePages = true;
            } else {
                hasMorePages = false;
            }
        }

        // Filter by market_id and sort by timestamp (oldest first)
        const filteredTrades = allTrades
            .filter(
                (event) =>
                    event.contents.json.market_id.toLowerCase() ===
                    marketId.toLowerCase()
            )
            .sort(
                (a, b) =>
                    new Date(a.timestamp).getTime() -
                    new Date(b.timestamp).getTime()
            );

        return filteredTrades;
    } catch (error) {
        console.error("Error fetching market trades:", error);
        throw error;
    }
}

/**
 * Fetch PositionClosed events for a specific user
 */
export async function getUserClosedPositions(
    network: string,
    owner: string,
    delphiPackageId: string
): Promise<PositionClosedEvent[]> {
    const graphqlUrl = getGraphQLUrl(network);
    const positionClosedEventType = `${delphiPackageId}::delphi::PositionClosed`;

    const query = `
    query GetUserClosedPositions {
      serviceConfig {
        maxPageSize(type: "Query", field: "events")
      }
      events(
        last: 50,
        filter: {
          type: "${positionClosedEventType}"
        }
      ) {
        nodes {
          sender {
            address
          }
          timestamp
          contents {
            type {
              repr
            }
            json
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
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

        const result: PositionClosedResponse = await response.json();

        if (result.data?.events?.nodes) {
            // Filter by sender address and sort by timestamp (newest first)
            const ownerLower = owner.toLowerCase();
            return result.data.events.nodes
                .filter(
                    (event) =>
                        event.sender.address.toLowerCase() === ownerLower ||
                        event.contents.json.sender?.toLowerCase() === ownerLower
                )
                .sort(
                    (a, b) =>
                        new Date(b.timestamp).getTime() -
                        new Date(a.timestamp).getTime()
                );
        }

        return [];
    } catch (error) {
        console.error("Error fetching closed positions:", error);
        throw error;
    }
}

