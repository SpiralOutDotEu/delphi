# Nautilus Server

Nautilus Server is a Rust-based server application that supports multiple app implementations through feature flags. You can select which app to use by enabling the corresponding feature when building or running the server.

## Available Features

The server supports multiple app implementations through feature flags. This guide focuses on the **`delphi`** app implementation.

## Building and Running

### Build with a specific feature

To build the server with the delphi app, use the `--features` flag:

```bash
cargo build --features delphi
```

### Run with a specific feature

To run the server with the delphi app, you need to provide the `API_KEY` environment variable. You can pass it in several ways:

**Option 1: Inline environment variable (recommended for quick testing)**

```bash
API_KEY="your-api-key-here" cargo run --features delphi
```

**Option 2: Export the environment variable first**

```bash
# Export the API_KEY
export API_KEY="your-api-key-here"

# Then run with delphi app
cargo run --features delphi
```

**Option 3: Using a .env file (if using dotenv)**

If you're using a tool like `dotenv`, you can create a `.env` file:

```
API_KEY=your-api-key-here
```

Then run:

```bash
cargo run --features delphi
```

### Testing

To run tests with the delphi app:

```bash
cargo test --features delphi
```

## Environment Variables

The server requires the `API_KEY` environment variable to be set when running with the `delphi` feature. See the [Run with a specific feature](#run-with-a-specific-feature) section above for examples of how to pass this variable.

## Server Endpoints

The server exposes the following endpoints:

- `GET /` - Ping endpoint (returns "Pong!")
- `GET /get_attestation` - Returns the enclave attestation document
- `POST /process_data` - Processes data using the selected app's implementation
- `GET /health_check` - Health check endpoint that returns the enclave's public key and endpoint connectivity status

The server listens on `0.0.0.0:3000` by default.

## Sending Requests

Once the server is running, you can send requests to it using `curl` or any HTTP client. Here are examples for each endpoint:

### Ping Endpoint

Test if the server is running:

```bash
curl http://localhost:3000/
```

**Response:**

```
Pong!
```

### Health Check

Get the server's public key and endpoint connectivity status:

```bash
curl http://localhost:3000/health_check
```

**Response:**

```json
{
  "pk": "hex-encoded-public-key",
  "endpoints_status": {
    "api.weatherapi.com": true
  }
}
```

### Get Attestation

Get the enclave attestation document:

```bash
curl http://localhost:3000/get_attestation
```

**Response:**

```json
{
  "attestation": "hex-encoded-attestation-document"
}
```

### Process Data

The delphi app provides a crypto price oracle service that answers questions about historical cryptocurrency prices. The service supports two types of requests:

> **"Was the closing price of [coin] on [date] less than or equal to [price]?"** or **"Was the closing price of [coin] on [date] higher than or equal to [price]?"**

#### How It Works

The service operates in two modes:

- **Type 1 (Question Validation)**: Validates whether a question can be answered. It checks if historical price data is available by querying the price from two days before today. If the query succeeds, it confirms the question is valid. The response always returns `price: 0` and `result: 0` for type 1 requests.

- **Type 2 (Answer)**: Actually answers the question by fetching the historical closing price for the specified date and coin, then comparing it with your input price based on the comparator. Returns the actual price and whether the condition was met (`result: 1` if true, `result: 2` if false).

#### Request Format

The request payload must include the following fields:

- `type` (u64): Either `1` for question validation or `2` for getting the answer
- `date` (string): Date in `DD-MM-YYYY` format (e.g., `"10-11-2025"`)
- `coin` (string): Coin identifier as used by CoinGecko API (e.g., `"bitcoin"`, `"ethereum"`)
- `comparator` (u64): `1` for "less than or equal to" (`<=`), `2` for "higher than or equal to" (`>=`)
- `price` (u64): Price in USD with 9 decimal places (e.g., `104709678616563` represents `104709.678616563 USD`)
- `result` (u64): Must always be `0` in the request

#### Example: Type 1 (Question Validation)

Validate if a question about Bitcoin's price can be answered:

```bash
curl -X POST http://localhost:3000/process_data \
  -H "Content-Type: application/json" \
  -d '{
    "payload": {
      "type": 1,
      "date": "10-11-2025",
      "coin": "bitcoin",
      "comparator": 2,
      "price": 104709678616563,
      "result": 0
    }
  }'
```

**Response:**

```json
{
  "response": {
    "intent": 0,
    "timestamp_ms": 1234567890000,
    "data": {
      "type": 1,
      "date": "10-11-2025",
      "coin": "bitcoin",
      "comparator": 2,
      "price": 0,
      "result": 0
    }
  },
  "signature": "hex-encoded-signature"
}
```

**Response Meaning:**

- `price: 0` - Always 0 for type 1 (validation only)
- `result: 0` - Always 0 for type 1 (confirms question is valid)
- If the request succeeds, it means historical price data is available and the question can be answered

#### Example: Type 2 (Get Answer)

Get the actual answer to the question:

```bash
curl -X POST http://localhost:3000/process_data \
  -H "Content-Type: application/json" \
  -d '{
    "payload": {
      "type": 2,
      "date": "10-11-2025",
      "coin": "bitcoin",
      "comparator": 2,
      "price": 104709678616563,
      "result": 0
    }
  }'
```

**Response:**

```json
{
  "response": {
    "intent": 0,
    "timestamp_ms": 1234567890000,
    "data": {
      "type": 2,
      "date": "10-11-2025",
      "coin": "bitcoin",
      "comparator": 2,
      "price": 104709678616563,
      "result": 1
    }
  },
  "signature": "hex-encoded-signature"
}
```

**Response Meaning:**

- `price` - The actual closing price in USD with 9 decimal places (e.g., `104709678616563` = `104709.678616563 USD`)
- `result` - `1` if the condition is true (e.g., actual price >= input price when comparator is 2), `2` if the condition is false
- `date` - The date that was queried (same as input)
- `coin` - The coin that was queried (same as input)
- `comparator` - The comparison operator used (same as input)
- `signature` - Cryptographic signature of the response data for verification

#### Price Format

Prices are represented as integers with 9 decimal places. To convert:

- **From USD to integer**: Multiply by 1,000,000,000 (e.g., `104709.678616563 USD` → `104709678616563`)
- **From integer to USD**: Divide by 1,000,000,000 (e.g., `104709678616563` → `104709.678616563 USD`)

## Project Structure

- `src/main.rs` - Main entry point and server setup
- `src/lib.rs` - Library module that conditionally exports app modules based on features
- `src/common.rs` - Common types and utilities shared across apps
- `src/apps/delphi/` - Delphi app implementation

The delphi app module exports a `process_data` function that handles the app-specific data processing logic.
