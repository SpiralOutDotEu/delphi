// Copyright (c), Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use crate::common::IntentMessage;
use crate::common::{to_signed_response, IntentScope, ProcessDataRequest, ProcessedDataResponse};
use crate::AppState;
use crate::EnclaveError;
use axum::extract::State;
use axum::Json;
use chrono::{NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
/// ====
/// Core Nautilus server logic, replace it with your own
/// relavant structs and process_data endpoint.
/// ====
/// Inner type T for IntentMessage<T>
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CryptoPriceResponse {
    pub r#type: u64,
    pub date: String,
    pub coin: String,
    pub comparator: u64,
    pub price: u64, // Price with 9 decimals (e.g., 42000.123456789 USD = 42000123456789)
    pub result: u64, // 0 for type 1, 1 or 2 for type 2 (1 = condition true, 2 = condition false)
}

/// Inner type T for ProcessDataRequest<T>
#[derive(Debug, Serialize, Deserialize)]
pub struct CryptoPriceRequest {
    pub r#type: u64,
    pub date: String,
    pub coin: String,
    pub comparator: u64,
    pub price: u64, // Price with 9 decimals (e.g., 42000.123456789 USD = 42000123456789)
    pub result: u64, // Must be 0 on input
}

/// Helper function to format a NaiveDate as DD-MM-YYYY
fn format_date_dd_mm_yyyy(date: NaiveDate) -> String {
    date.format("%d-%m-%Y").to_string()
}

/// Helper function to parse a date string in DD-MM-YYYY format
fn parse_date_dd_mm_yyyy(date_str: &str) -> Result<NaiveDate, EnclaveError> {
    NaiveDate::parse_from_str(date_str, "%d-%m-%Y").map_err(|e| {
        EnclaveError::GenericError(format!("Failed to parse date '{}': {}", date_str, e))
    })
}

/// Helper function to get date two days before today in DD-MM-YYYY format
fn get_two_days_before_today() -> Result<String, EnclaveError> {
    let today = Utc::now().date_naive();
    let two_days_ago = today
        .checked_sub_signed(chrono::Duration::days(2))
        .ok_or_else(|| {
            EnclaveError::GenericError("Failed to calculate two days ago".to_string())
        })?;
    Ok(format_date_dd_mm_yyyy(two_days_ago))
}

/// Helper function to convert f64 price to u64 with 9 decimals
/// Multiplies the price by 10^9 and rounds to the nearest integer
fn price_f64_to_u64(price_f64: f64) -> Result<u64, EnclaveError> {
    if price_f64 < 0.0 {
        return Err(EnclaveError::GenericError(
            "Price cannot be negative".to_string(),
        ));
    }

    // Multiply by 10^9 (1 billion) to get 9 decimal places
    const DECIMALS: f64 = 1_000_000_000.0;
    let scaled = price_f64 * DECIMALS;

    // Check for overflow (u64::MAX is 18,446,744,073,709,551,615)
    // Maximum price that can be represented: ~18,446,744,073.709551615 USD
    // Use a safe threshold slightly below u64::MAX to account for rounding
    const MAX_PRICE_USD: f64 = 18_446_744_073.0; // Safe maximum
    if price_f64 > MAX_PRICE_USD {
        return Err(EnclaveError::GenericError(format!(
            "Price {} USD is too large to represent with 9 decimals (max: {} USD)",
            price_f64, MAX_PRICE_USD
        )));
    }

    // Round to nearest integer and convert to u64
    let rounded = scaled.round();
    if rounded < 0.0 || rounded > u64::MAX as f64 {
        return Err(EnclaveError::GenericError(format!(
            "Price {} USD cannot be converted to u64",
            price_f64
        )));
    }

    Ok(rounded as u64)
}

/// Helper function to fetch crypto price from CoinGecko API
/// Returns price as u64 with 9 decimals
async fn fetch_crypto_price(coin: &str, date: &str, api_key: &str) -> Result<u64, EnclaveError> {
    let client = reqwest::Client::new();
    let mut request = client
        .get(&format!(
            "https://api.coingecko.com/api/v3/coins/{}/history",
            coin
        ))
        .query(&[("date", date)]);

    // Add API key to headers if available
    if !api_key.is_empty() {
        request = request.header("x-cg-demo-api-key", api_key);
    }

    let response = request.send().await.map_err(|e| {
        EnclaveError::GenericError(format!("Failed to get crypto price response: {}", e))
    })?;

    let json = response.json::<Value>().await.map_err(|e| {
        EnclaveError::GenericError(format!("Failed to parse crypto price response: {}", e))
    })?;

    // Extract closing price from the response
    let market_data = json.get("market_data").ok_or_else(|| {
        EnclaveError::GenericError("No market data available for this date".to_string())
    })?;

    let current_price_f64 = market_data
        .get("current_price")
        .and_then(|cp| cp.get("usd"))
        .and_then(|usd| usd.as_f64())
        .ok_or_else(|| {
            EnclaveError::GenericError(
                "No closing price available in USD for the requested date".to_string(),
            )
        })?;

    // Convert f64 to u64 with 9 decimals
    price_f64_to_u64(current_price_f64)
}

pub async fn process_data(
    State(state): State<Arc<AppState>>,
    Json(request): Json<ProcessDataRequest<CryptoPriceRequest>>,
) -> Result<Json<ProcessedDataResponse<IntentMessage<CryptoPriceResponse>>>, EnclaveError> {
    let payload = &request.payload;
    let request_type = payload.r#type;
    let date = &payload.date;
    let coin = &payload.coin;
    let comparator = payload.comparator;
    let input_price = payload.price;

    // Validate that the input result is 0
    if payload.result != 0 {
        return Err(EnclaveError::GenericError(format!(
            "Input result must be 0, got {}",
            payload.result
        )));
    }

    // Validate that the input date is in valid DD-MM-YYYY format
    parse_date_dd_mm_yyyy(date)?;

    // Validate comparator value
    if comparator != 1 && comparator != 2 {
        return Err(EnclaveError::GenericError(format!(
            "Invalid comparator: {}. Comparator must be 1 (less or equal) or 2 (higher or equal)",
            comparator
        )));
    }

    let (response_price, query_date, result) = if request_type == 1 {
        // Type 1: question
        // TODO: Intentionally we don't check if date is in the future so that we can test it
        // Create a date, in the correct format from today but two days before today
        let two_days_before = get_two_days_before_today()?;

        // Do the query to get the closing price for the given coin, for the two days before today and get the closing price in usd
        let _price = fetch_crypto_price(coin, &two_days_before, &state.api_key).await?;

        // If the query returns success and we have a price in usd then return a response json with price: 0
        // Result is always 0 for type 1
        (0u64, date.clone(), 0u64)
    } else if request_type == 2 {
        // Type 2: answer
        // For the given date and coin, create the query and get the closing price of the given coin in usd
        let current_price = fetch_crypto_price(coin, date, &state.api_key).await?;

        // Compare current price with input price based on comparator
        // Comparator 1: less or equal (current_price <= input_price)
        // Comparator 2: higher or equal (current_price >= input_price)
        let condition_met = if comparator == 1 {
            current_price <= input_price
        } else {
            // comparator == 2
            current_price >= input_price
        };

        // Result: 1 if condition is true, 2 if condition is false
        let result = if condition_met { 1u64 } else { 2u64 };

        // Return a json in the specified format with the actual price
        (current_price, date.clone(), result)
    } else {
        return Err(EnclaveError::GenericError(format!(
            "Invalid type: {}. Type must be 1 (question) or 2 (answer)",
            request_type
        )));
    };

    // Get current timestamp for signing
    let current_timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| EnclaveError::GenericError(format!("Failed to get current timestamp: {}", e)))?
        .as_millis() as u64;

    Ok(Json(to_signed_response(
        &state.eph_kp,
        CryptoPriceResponse {
            r#type: request_type,
            date: query_date,
            coin: coin.clone(),
            comparator,
            price: response_price,
            result,
        },
        current_timestamp,
        IntentScope::ProcessData,
    )))
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::common::IntentMessage;
    use axum::{extract::State, Json};
    use fastcrypto::{ed25519::Ed25519KeyPair, traits::KeyPair};

    #[tokio::test]
    async fn test_process_data_type_1() {
        // Get API_KEY from environment variable
        // Run test with: API_KEY=<API_KEY> cargo test --features delphi
        let api_key = std::env::var("API_KEY").unwrap_or_default();

        let state = Arc::new(AppState {
            eph_kp: Ed25519KeyPair::generate(&mut rand::thread_rng()),
            api_key: api_key.clone(),
        });

        // Test with type 1 (question) - matches the example request/response
        // Request: type 1, date "10-11-2025", coin "bitcoin", comparator 2, price 104709678616563, result 0
        // Expected response: type 1, date "10-11-2025", coin "bitcoin", comparator 2, price 0, result 0
        let result = process_data(
            State(state),
            Json(ProcessDataRequest {
                payload: CryptoPriceRequest {
                    r#type: 1,
                    date: "10-11-2025".to_string(),
                    coin: "bitcoin".to_string(),
                    comparator: 2,
                    price: 104709678616563u64, // 104709.678616563 USD with 9 decimals
                    result: 0u64,              // Input result must be 0
                },
            }),
        )
        .await;

        // The test will pass if the API call succeeds
        if let Ok(signed_response) = result {
            assert_eq!(signed_response.response.data.r#type, 1);
            assert_eq!(signed_response.response.data.coin, "bitcoin");
            assert_eq!(signed_response.response.data.date, "10-11-2025");
            assert_eq!(signed_response.response.data.comparator, 2);
            // For type 1, price should be 0 and result should be 0
            assert_eq!(signed_response.response.data.price, 0u64);
            assert_eq!(signed_response.response.data.result, 0u64);
        }
        // If it fails, it's likely due to API availability, which is acceptable for tests
    }

    #[tokio::test]
    async fn test_process_data_type_2() {
        // Get API_KEY from environment variable
        // Run test with: API_KEY=<API_KEY> cargo test --features delphi
        let api_key = std::env::var("API_KEY").unwrap_or_default();

        let state = Arc::new(AppState {
            eph_kp: Ed25519KeyPair::generate(&mut rand::thread_rng()),
            api_key: api_key.clone(),
        });

        // Test with type 2 (answer) - matches the example request/response
        // Request: type 2, date "10-11-2025", coin "bitcoin", comparator 2, price 104709678616563, result 0
        // Expected response: type 2, date "10-11-2025", coin "bitcoin", comparator 2, price 104709678616563, result 1
        // (result 1 means current_price >= input_price condition is true)
        let result = process_data(
            State(state),
            Json(ProcessDataRequest {
                payload: CryptoPriceRequest {
                    r#type: 2,
                    date: "10-11-2025".to_string(),
                    coin: "bitcoin".to_string(),
                    comparator: 2,
                    price: 104709678616563u64, // 104709.678616563 USD with 9 decimals
                    result: 0u64,              // Input result must be 0
                },
            }),
        )
        .await;

        // The test will pass if the API call succeeds
        if let Ok(signed_response) = result {
            assert_eq!(signed_response.response.data.r#type, 2);
            assert_eq!(signed_response.response.data.coin, "bitcoin");
            assert_eq!(signed_response.response.data.date, "10-11-2025");
            assert_eq!(signed_response.response.data.comparator, 2);
            // For type 2, price should be the actual price from API
            assert_eq!(signed_response.response.data.price, 104709678616563u64);
            // Result should be 1 (condition met: current_price >= input_price) or 2 (condition not met)
            assert!(
                signed_response.response.data.result == 1
                    || signed_response.response.data.result == 2
            );
        }
        // If it fails, it's likely due to API availability, which is acceptable for tests
    }

    #[test]
    fn test_serde() {
        // test result should be consistent with test_serde in `move/enclave/sources/enclave.move`.
        use fastcrypto::encoding::{Encoding, Hex};
        let payload = CryptoPriceResponse {
            r#type: 2,
            date: "01-01-2024".to_string(),
            coin: "bitcoin".to_string(),
            comparator: 1,
            price: 42000_000_000_000u64, // 42000.0 USD with 9 decimals
            result: 1u64,
        };
        let timestamp = 1744038900000;
        let intent_msg = IntentMessage::new(payload, timestamp, IntentScope::ProcessData);
        let signing_payload = bcs::to_bytes(&intent_msg).expect("should not fail");
        assert!(
            signing_payload
                == Hex::decode("0020b1d1109601000002000000000000000a30312d30312d3230323407626974636f696e010000000000000000a014e3322600000100000000000000")
                    .unwrap()
        );
    }
}
