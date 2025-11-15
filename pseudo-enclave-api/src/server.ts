import express from 'express';

import axios from 'axios';

import nacl from 'tweetnacl';

import { bcs } from '@mysten/bcs';

import dotenv from 'dotenv';

dotenv.config();

const app = express();

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Allow all origins in development
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

app.use(express.json());

// ===== Types matching the Rust structs =====

interface CryptoPriceRequest {

  // Rust: r#type

  type: number;       // 1 = question, 2 = answer

  date: string;       // "DD-MM-YYYY"

  coin: string;       // "bitcoin", "ethereum", ...

  comparator: number; // 1 = <=, 2 = >=

  price: string | number; // u64 with 9 decimals, but input can be decimal-like

  result: number;     // must be 0 on input

}

interface CryptoPriceResponse {

  type: number;

  date: string;

  coin: string;

  comparator: number;

  price: string;   // u64 (as string to avoid JS precision issues)

  result: number;  // 0, 1, or 2

}

interface ProcessDataRequest<T> {

  payload: T;

}

// ===== BCS setup (must match Rust / Move layouts) =====

// Same field order and types as Rust's CryptoPriceResponse

const CryptoPriceResponseStruct = bcs.struct('CryptoPriceResponse', {

  type: bcs.u64(),

  date: bcs.string(),

  coin: bcs.string(),

  comparator: bcs.u64(),

  price: bcs.u64(),

  result: bcs.u64(),

});

const IntentMessageCryptoPriceStruct = bcs.struct('IntentMessageCryptoPrice', {

  intent: bcs.u8(),

  timestamp_ms: bcs.u64(),

  payload: CryptoPriceResponseStruct,

});

// IntentScope::ProcessData in Rust is 0

const INTENT_SCOPE_PROCESS_DATA = 0;

// ===== Ed25519 keypair for the "fake enclave" API =====

// Use ED25519_SEED as a 32-byte hex seed (same each time => same keypair)

// e.g. export ED25519_SEED=0000000000000000000000000000000000000000000000000000000000000001

const seedHex = process.env.ED25519_SEED;

if (!seedHex) {

  throw new Error('ED25519_SEED env var must be set to a 32-byte hex seed');

}

const seed = Buffer.from(seedHex, 'hex');

if (seed.length !== 32) {

  throw new Error('ED25519_SEED must be 32 bytes (64 hex chars)');

}

const keyPair = nacl.sign.keyPair.fromSeed(new Uint8Array(seed));

const PUBLIC_KEY_HEX = Buffer.from(keyPair.publicKey).toString('hex');

// ===== Helpers =====

function parseDateDDMMYYYY(dateStr: string): Date {

  const [ddStr, mmStr, yyyyStr] = dateStr.split('-');

  const dd = Number(ddStr);

  const mm = Number(mmStr);

  const yyyy = Number(yyyyStr);

  if (!dd || !mm || !yyyy) {

    throw new Error(`Invalid date format (expected DD-MM-YYYY): ${dateStr}`);

  }

  // Use UTC to avoid TZ issues

  return new Date(Date.UTC(yyyy, mm - 1, dd));

}

function formatDateDDMMYYYY(date: Date): string {

  const dd = String(date.getUTCDate()).padStart(2, '0');

  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');

  const yyyy = String(date.getUTCFullYear());

  return `${dd}-${mm}-${yyyy}`;

}

function getTwoDaysBeforeToday(): string {

  const now = new Date();

  const twoDaysAgo = new Date(Date.UTC(

    now.getUTCFullYear(),

    now.getUTCMonth(),

    now.getUTCDate() - 2,

  ));

  return formatDateDDMMYYYY(twoDaysAgo);

}

// Convert f64 price to u64 with 9 decimals (as string)

function priceF64ToU64String(price: number): string {

  if (price < 0) {

    throw new Error('Price cannot be negative');

  }

  const DECIMALS = 1_000_000_000;

  // Use BigInt for safe integer math:

  const scaled = BigInt(Math.round(price * DECIMALS));

  if (scaled < 0n) {

    throw new Error('Price cannot be converted to u64');

  }

  return scaled.toString(10);

}

async function fetchCryptoPrice(

  coin: string,

  date: string,

  apiKey: string | undefined,

): Promise<string> {

  const url = `https://api.coingecko.com/api/v3/coins/${coin}/history`;

  const params = { date }; // "DD-MM-YYYY"

  const headers: Record<string, string> = {};

  if (apiKey && apiKey.trim() !== '') {

    headers['x-cg-demo-api-key'] = apiKey;

  }

  const resp = await axios.get(url, { params, headers });

  const json = resp.data;

  if (!json.market_data || !json.market_data.current_price || json.market_data.current_price.usd == null) {

    throw new Error('No market data or USD price in response');

  }

  const priceUsd = Number(json.market_data.current_price.usd);

  if (!Number.isFinite(priceUsd)) {

    throw new Error('Invalid price from API');

  }

  return priceF64ToU64String(priceUsd);

}

// Build the IntentMessage bytes and sign

function signResponseIntent(

  intentScope: number,

  timestampMs: bigint,

  response: CryptoPriceResponse,

): { messageBytes: Uint8Array; signatureHex: string } {

  const serialized = IntentMessageCryptoPriceStruct.serialize({

    intent: intentScope,

    timestamp_ms: timestampMs.toString(), // BCS u64, as string

    payload: {

      type: response.type.toString(),

      date: response.date,

      coin: response.coin,

      comparator: response.comparator.toString(),

      price: response.price,

      result: response.result.toString(),

    },

  });

  const msgBytes = serialized.toBytes();

  const signature = nacl.sign.detached(msgBytes, keyPair.secretKey);

  const signatureHex = Buffer.from(signature).toString('hex');

  return { messageBytes: msgBytes, signatureHex };

}

// ===== Express route (simulating process_data) =====

app.post('/process_data', async (req, res) => {

  try {

    const body: ProcessDataRequest<CryptoPriceRequest> = req.body;

    if (!body || !body.payload) {

      return res.status(400).json({ error: 'Missing payload' });

    }

    const payload = body.payload;

    const {

      type,

      date,

      coin,

      comparator,

      price,

      result,

    } = payload;

    if (result !== 0) {

      return res.status(400).json({

        error: `Input result must be 0, got ${result}`,

      });

    }

    // Validate date format

    try {

      parseDateDDMMYYYY(date);

    } catch (e: any) {

      return res.status(400).json({ error: e.message });

    }

    if (comparator !== 1 && comparator !== 2) {

      return res.status(400).json({

        error:

          `Invalid comparator: ${comparator}. ` +

          'Comparator must be 1 (less or equal) or 2 (higher or equal)',

      });

    }

    const apiKey = process.env.COINGECKO_API_KEY;

    let responsePriceU64 = '0';

    let queryDate = date;

    let outputResult = 0;

    if (type === 1) {

      // Type 1: "question" – we *actually* query two-days-ago just to simulate,

      // but we always return price=0, result=0 on output.

      const twoDaysBefore = getTwoDaysBeforeToday();

      await fetchCryptoPrice(coin, twoDaysBefore, apiKey); // discard, side-effect only

      responsePriceU64 = '0';

      queryDate = date;

      outputResult = 0;

    } else if (type === 2) {

      // Type 2: "answer" – get actual price for provided date

      const currentPriceU64 = await fetchCryptoPrice(coin, date, apiKey);

      const inputPriceU64 = BigInt(

        typeof price === 'string' ? price : String(price),

      );

      const currentPriceBig = BigInt(currentPriceU64);

      const conditionMet =

        comparator === 1

          ? currentPriceBig <= inputPriceU64

          : currentPriceBig >= inputPriceU64;

      outputResult = conditionMet ? 1 : 2;

      responsePriceU64 = currentPriceU64;

      queryDate = date;

    } else {

      return res.status(400).json({

        error:

          `Invalid type: ${type}. ` +

          'Type must be 1 (question) or 2 (answer)',

      });

    }

    const nowMs = BigInt(Date.now());

    const responsePayload: CryptoPriceResponse = {

      type,

      date: queryDate,

      coin,

      comparator,

      price: responsePriceU64,

      result: outputResult,

    };

    const { messageBytes, signatureHex } = signResponseIntent(

      INTENT_SCOPE_PROCESS_DATA,

      nowMs,

      responsePayload,

    );

    // This is the "signed envelope" your Move code can verify.

    // You can adjust this shape however you like, as long as you pass

    // intent_scope, timestamp_ms, payload, signature, and pk into Move.

    return res.json({

      intent_scope: INTENT_SCOPE_PROCESS_DATA,

      timestamp_ms: nowMs.toString(),

      payload: responsePayload,

      signature: `0x${signatureHex}`,

      public_key: `0x${PUBLIC_KEY_HEX}`,

      // optional debug: raw BCS payload for inspection

      message_bcs: `0x${Buffer.from(messageBytes).toString('hex')}`,

    });

  } catch (error: any) {

    console.error('Error in /process_data:', error);

    return res.status(500).json({ error: error.message ?? 'Internal error' });

  }

});

// ===== Start server =====

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(`Fake Nautilus enclave API listening on port ${PORT}`);

  console.log(`API public key (Ed25519): 0x${PUBLIC_KEY_HEX}`);

});

