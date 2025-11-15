# Pseudo-Enclave Server

A TypeScript Express server that simulates a Nautilus enclave API for processing crypto price data.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file from the example:

```bash
cp .env.example .env
```

3. Set the `ED25519_SEED` environment variable (required):

   - Must be a 32-byte hex string (64 hex characters)
   - Example: `0000000000000000000000000000000000000000000000000000000000000001`

   **How to generate a seed:**

   Using Node.js:

   ```bash
   node -e "const crypto = require('crypto'); console.log(crypto.randomBytes(32).toString('hex'));"
   ```

   Using OpenSSL:

   ```bash
   openssl rand -hex 32
   ```

   Using Python:

   ```bash
   python3 -c "import secrets; print(secrets.token_hex(32))"
   ```

   Add the generated seed to your `.env` file:

   ```
   ED25519_SEED=your_generated_64_character_hex_string_here
   ```

4. Optionally set `COINGECKO_API_KEY` for higher rate limits

## Development

Run in development mode with hot reload:

```bash
npm run dev
```

## Build

Build the TypeScript project:

```bash
npm run build
```

## Start

Start the production server:

```bash
npm start
```

The server will listen on port 3000 (or the port specified in the `PORT` environment variable).

## API Endpoint

### POST `/process_data`

Processes crypto price requests and returns signed responses.

**Request Body:**

```json
{
  "payload": {
    "type": 1, // 1 = question, 2 = answer
    "date": "01-01-2024", // DD-MM-YYYY format
    "coin": "bitcoin",
    "comparator": 1, // 1 = <=, 2 = >=
    "price": "50000000000", // u64 with 9 decimals
    "result": 0 // must be 0 on input
  }
}
```

**Response:**

```json
{
  "intent_scope": 0,
  "timestamp_ms": "1234567890",
  "payload": {
    "type": 1,
    "date": "01-01-2024",
    "coin": "bitcoin",
    "comparator": 1,
    "price": "50000000000",
    "result": 0
  },
  "signature": "0x...",
  "public_key": "0x...",
  "message_bcs": "0x..."
}
```

## Examples

### Question (Type 1)

A question request queries the price but always returns `price: "0"` and `result: 0`. The server internally queries the price from two days ago for simulation purposes.

```bash
curl -X POST http://localhost:3000/process_data \
  -H "Content-Type: application/json" \
  -d '{
    "payload": {
      "type": 1,
      "date": "15-01-2024",
      "coin": "bitcoin",
      "comparator": 1,
      "price": "0",
      "result": 0
    }
  }'
```

**Expected Response:**

- `payload.price`: `"0"`
- `payload.result`: `0`
- Includes signed `signature` and `public_key` for verification

### Answer (Type 2)

An answer request fetches the actual price for the given date and compares it with the provided price threshold.

**Example 1: Check if Bitcoin price was <= $100,000 on a specific date**

```bash
curl -X POST http://localhost:3000/process_data \
  -H "Content-Type: application/json" \
  -d '{
    "payload": {
      "type": 2,
      "date": "15-01-2024",
      "coin": "bitcoin",
      "comparator": 1,
      "price": "100000000000",
      "result": 0
    }
  }'
```

**Response:**

- `payload.price`: Actual price in u64 format (with 9 decimals)
- `payload.result`:
  - `1` if condition is met (actual price <= threshold)
  - `2` if condition is not met (actual price > threshold)

**Example 2: Check if Ethereum price was >= $3,000 on a specific date**

```bash
curl -X POST http://localhost:3000/process_data \
  -H "Content-Type: application/json" \
  -d '{
    "payload": {
      "type": 2,
      "date": "15-01-2024",
      "coin": "ethereum",
      "comparator": 2,
      "price": "3000000000000",
      "result": 0
    }
  }'
```

**Note:**

- Prices are in u64 format with 9 decimals (multiply by 1,000,000,000)
- Example: $50,000 = `50000000000` (50,000 × 1,000,000,000)
- Example: $3,000 = `3000000000000` (3,000 × 1,000,000,000)
- Date format must be `DD-MM-YYYY`
- The `result` field must be `0` in the request
