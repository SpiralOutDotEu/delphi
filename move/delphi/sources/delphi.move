
module delphi::delphi;

use enclave::enclave::{Self, Enclave};
use std::string::String;

/// ====
/// Core onchain app logic for Delphi market creation.
/// ====

const MARKET_INTENT: u8 = 0;
const EInvalidSignature: u64 = 1;

public struct Market has key, store {
    id: UID,
    type_: u64,
    date: String,
    coin: String,
    comparator: u64,
    price: u64,
    result: u64,
    timestamp_ms: u64,
}

/// Should match the inner struct T used for IntentMessage<T> in Rust.
public struct CryptoPricePayload has copy, drop {
    type_: u64,
    date: String,
    coin: String,
    comparator: u64,
    price: u64,
    result: u64,
}

public struct DELPHI has drop {}

fun init(_otw: DELPHI, ctx: &mut TxContext) {
    let cap = enclave::new_cap(_otw, ctx);

    // Hardcoded Ed25519 public key (32 bytes)
    let pk = x"7610ceb95524c4451de3186485ed4047310ff9fa9545cbdae71d8dca6400e391";
    
    cap.pseudo_create_enclave_config(
        b"delphi enclave".to_string(),
        pk,
        ctx,
    );

    transfer::public_transfer(cap, ctx.sender())
}

public fun create_market<T>(
    type_: u64,
    date: String,
    coin: String,
    comparator: u64,
    price: u64,
    result: u64,
    timestamp_ms: u64,
    sig: &vector<u8>,
    enclave: &Enclave<T>,
    ctx: &mut TxContext,
) {
    let payload = CryptoPricePayload {
        type_,
        date,
        coin,
        comparator,
        price,
        result,
    };
    
    let res = enclave.verify_signature(
        MARKET_INTENT,
        timestamp_ms,
        payload,
        sig,
    );
    assert!(res, EInvalidSignature);
    
    // Create market
    let market = Market {
        id: object::new(ctx),
        type_,
        date,
        coin,
        comparator,
        price,
        result,
        timestamp_ms,
    };
    transfer::share_object(market);
}
