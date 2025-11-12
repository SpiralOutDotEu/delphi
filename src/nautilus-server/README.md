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

Send a request to process data. For the delphi app, this expects a location in the request payload:

```bash
curl -X POST http://localhost:3000/process_data \
  -H "Content-Type: application/json" \
  -d '{
    "payload": {
      "location": "San Francisco"
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
      "location": "San Francisco",
      "temperature": 20
    }
  },
  "signature": "hex-encoded-signature"
}
```

The response includes:

- `response.data.location` - The location that was queried
- `response.data.temperature` - The temperature in Celsius
- `response.timestamp_ms` - The timestamp when the data was last updated
- `signature` - A cryptographic signature of the response data

## Project Structure

- `src/main.rs` - Main entry point and server setup
- `src/lib.rs` - Library module that conditionally exports app modules based on features
- `src/common.rs` - Common types and utilities shared across apps
- `src/apps/delphi/` - Delphi app implementation

The delphi app module exports a `process_data` function that handles the app-specific data processing logic.
