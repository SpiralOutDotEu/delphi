/// Delphi implements prediction markets for crypto price data backed by an LMSR AMM.
///
/// The module provides:
/// - Enclave-verified market creation for authenticated crypto price predictions
/// - LMSR (Logarithmic Market Scoring Rule) automated market making for trading
/// - Position lifecycle management and settlement with deterministic payouts
module delphi::delphi;

// === Imports ===
use enclave::enclave::{Self, Enclave};
use std::string::String;
use sui::balance::{Self as balance, Balance};
use sui::coin::{Self as coin, Coin};
use sui::event;
use pseudo_usdc::pseudo_usdc::PSEUDO_USDC;



// === Market Creation Constants ===
const MARKET_INTENT: u8 = 0;

// === Signature Verification Errors ===
const EInvalidSignature: u64 = 1;

// === Market Trading Errors ===
const E_MARKET_RESOLVED: u64 = 10;
const E_INVALID_POSITION_MARKET: u64 = 11;
const E_INVALID_AMOUNT: u64 = 12;
const E_INVALID_PAYMENT: u64 = 13;
const E_INSUFFICIENT_SHARES: u64 = 14;
const E_MARKET_NOT_RESOLVED: u64 = 16;
const E_INVALID_SIDE: u64 = 17;
const E_MAX_TOTAL_SHARES: u64 = 18;
const E_INVALID_TYPE: u64 = 19;
const E_INVALID_RESULT: u64 = 20;

// === Market Outcome Constants ===
const SIDE_NONE: u8 = 0;
const SIDE_YES: u8 = 1;
const SIDE_NO: u8 = 2;

// === Trade Event Constants ===
const TRADE_TYPE_MARKET_CREATED: u8 = 0;
const TRADE_TYPE_BUY: u8 = 1;
const TRADE_TYPE_SELL: u8 = 2;

// Limits / scales
const MAX_TOTAL_SHARES: u64 = 1_000_000_000;
const PRICE_SCALE_MIST: u64 = 1_000000; // 1 PSEUDO_USDC (with 6 decimals)

// Probability scale for view function
const PROBABILITY_SCALE: u64 = 10_000; // 1.0000

// Default liquidity parameters
const DEFAULT_INITIAL_VIRTUAL_PER_SIDE: u64 = 500;
const DEFAULT_B_LIQUIDITY: u64 = 500;

// === LMSR fixed-point constants (WAD = 1e12) ===
// WAD represents 2^64; all fixed-point values are treated as Q64.64 numbers.
const WAD: u128 = 18_446_744_073_709_551_616;      // 2^64
// ln(2) * 2^64 ≈ 1.2786308645202655e19
const LN2_WAD: u128 = 12_786_308_645_202_655_232;

// === Structs ===
public struct Config has key, store {
    id: UID,
    initial_virtual_per_side: u64,
    b_liquidity: u64,
}

public struct AdminCap has key, store {
    id: UID,
}

/// Market struct representing a prediction market with crypto price data and LMSR AMM trading
public struct Market has key, store {
    id: UID,
    // Market metadata: crypto price prediction parameters
    type_: u64,
    date: String,
    coin: String,
    comparator: u64,
    price: u64,
    result: u64,
    timestamp_ms: u64,
    // LMSR AMM trading state: shares, liquidity, and resolution
    yes_shares: u64,
    no_shares: u64,
    virtual_yes_shares: u64,
    virtual_no_shares: u64,
    b: u64,
    collateral: Balance<PSEUDO_USDC>,
    resolved: bool,
    outcome: u8, // 0 none, 1 YES, 2 NO
    payout_per_share: u64,
}

public struct Position has key, store {
    id: UID,
    market: ID,
    yes_shares: u64,
    no_shares: u64,
}

/// Mirrors the inner struct T used for `IntentMessage<T>` in Rust to keep signatures consistent.
public struct CryptoPricePayload has copy, drop {
    type_: u64,
    date: String,
    coin: String,
    comparator: u64,
    price: u64,
    result: u64,
}

public struct DELPHI has drop {}

// === Events ===
public struct MarketCreated has copy, drop {
    sender: address,
    market_id: ID,
    initial_virtual_per_side: u64,
    b_liquidity: u64,
    date: String,
    coin: String,
    comparator: u64,
    price: u64,
}

public struct MarketResolved has copy, drop {
    sender: address,
    market_id: ID,
    outcome: u8,
    total_collateral: u64,
    winning_shares: u64,
    payout_per_share: u64,
}

public struct PositionOpened has copy, drop {
    sender: address,
    market_id: ID,
    position_id: ID,
}

public struct SharesBought has copy, drop {
    sender: address,
    market_id: ID,
    position_id: ID,
    side: u8,
    amount: u64,
    collateral_paid: u64,
    new_yes_shares: u64,
    new_no_shares: u64,
}

public struct SharesSold has copy, drop {
    sender: address,
    market_id: ID,
    position_id: ID,
    side: u8,
    amount: u64,
    payout: u64,
    new_yes_shares: u64,
    new_no_shares: u64,
}

public struct PositionClosed has copy, drop {
    sender: address,
    market_id: ID,
    position_id: ID,
    winning_shares: u64,
    total_payout: u64,
}

public struct ConfigUpdated has copy, drop {
    sender: address,
    config_id: ID,
    old_initial_virtual_per_side: u64,
    new_initial_virtual_per_side: u64,
    old_b_liquidity: u64,
    new_b_liquidity: u64,
}

public struct Trade has copy, drop {
    sender: address,
    market_id: ID,
    trade_type: u8,
    side: u8,
    amount: u64,
    collateral_delta: u64,
    collateral_increase: bool,
    total_collateral: u64,
    cost_buy_yes: u64,
    cost_buy_no: u64,
    cost_sell_yes: u64,
    cost_sell_no: u64,
    prob_yes: u64,
    prob_no: u64,
}

// === Package Functions ===
fun init(_otw: DELPHI, ctx: &mut TxContext) {
    // Initialize enclave capability for signature verification
    let cap = enclave::new_cap(_otw, ctx);

    // Hardcoded Ed25519 public key (32 bytes) for enclave verification
    let pk = x"7610ceb95524c4451de3186485ed4047310ff9fa9545cbdae71d8dca6400e391";
    
    cap.pseudo_create_enclave_config(
        b"delphi enclave".to_string(),
        pk,
        ctx,
    );

    transfer::public_transfer(cap, ctx.sender());

    // Initialize LMSR AMM configuration with default liquidity parameters
    let config = Config {
        id: object::new(ctx),
        initial_virtual_per_side: DEFAULT_INITIAL_VIRTUAL_PER_SIDE,  // V: initial virtual shares per side
        b_liquidity: DEFAULT_B_LIQUIDITY,               // b: liquidity parameter, set ≈ V for balanced start
    };
    transfer::share_object(config);

    let admin_cap = AdminCap { id: object::new(ctx) };
    transfer::public_transfer(admin_cap, ctx.sender());
}

// === Public Functions ===
/// Creates a new prediction market: verifies enclave signature for market data, then initializes LMSR AMM
public fun create_market<T>(
    config: &Config,
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

    // Verify enclave signature to ensure market data authenticity
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
    // Only type 1 payloads (questions) are accepted for market creation.
    assert!(type_ == 1, E_INVALID_TYPE);
    
    // Initialize market with crypto price metadata and LMSR AMM trading state
    let market = Market {
        id: object::new(ctx),
        // Market metadata: crypto price prediction parameters
        type_,
        date,
        coin,
        comparator,
        price,
        result,
        timestamp_ms,
        // LMSR AMM state: initialize with virtual shares and zero actual shares
        virtual_yes_shares: config.initial_virtual_per_side,
        virtual_no_shares: config.initial_virtual_per_side,
        yes_shares: 0,
        no_shares: 0,
        collateral: balance::zero<PSEUDO_USDC>(),
        b: config.b_liquidity,
        resolved: false,
        outcome: 0,
        payout_per_share: 0,
    };
    let market_id = object::id(&market);

    emit_trade_event(
        config,
        &market,
        TRADE_TYPE_MARKET_CREATED,
        SIDE_NONE,
        0,
        0,
        true,
        tx_context::sender(ctx),
    );

    transfer::share_object(market);

    event::emit(MarketCreated {
        sender: tx_context::sender(ctx),
        market_id,
        initial_virtual_per_side: config.initial_virtual_per_side,
        b_liquidity: config.b_liquidity,
        date,
        coin,
        comparator,
        price,
    });
}

public fun open_position(
    market: &Market,
    ctx: &mut TxContext
): Position {
    assert!(!market.resolved, E_MARKET_RESOLVED);
    let position = Position {
        id: object::new(ctx),
        market: object::id(market),
        yes_shares: 0,
        no_shares: 0,
    };

    event::emit(PositionOpened {
        sender: tx_context::sender(ctx),
        market_id: object::id(market),
        position_id: object::id(&position),
    });

    position
}

/// Resolves a market: verifies enclave signature for resolution data, then resolves the market with payouts
public fun resolve_market<T>(
    _config: &Config,
    market: &mut Market,
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
    // Verify enclave signature to ensure resolution data authenticity
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
    
    // Only type 2 payloads (resolutions) are accepted when settling a market.
    assert!(type_ == 2, E_INVALID_TYPE);
    
    // Validate market state
    assert!(!market.resolved, E_MARKET_RESOLVED);
    
    // Map oracle result codes to internal outcome constants (1→YES, 2→NO).
    assert!(result == 1 || result == 2, E_INVALID_RESULT);
    let outcome = if (result == 1) { SIDE_YES } else { SIDE_NO };

    let total_collateral = balance::value(&market.collateral);
    let winning_shares = if (outcome == SIDE_YES) { market.yes_shares } else { market.no_shares };
    let payout_per_share = if (winning_shares > 0) { total_collateral / winning_shares } else { 0 };

    market.resolved = true;
    market.outcome = outcome;
    market.payout_per_share = payout_per_share;

    event::emit(MarketResolved {
        sender: ctx.sender(),
        market_id: object::id(market),
        outcome,
        total_collateral,
        winning_shares,
        payout_per_share,
    });
}

public fun buy_shares(
    config: &Config,
    market: &mut Market,
    mut position: Position,
    mut payment: Coin<PSEUDO_USDC>,
    amount: u64,
    side: u8,
    ctx: &mut TxContext,
): (Coin<PSEUDO_USDC>, Position) {
    assert!(side == SIDE_YES || side == SIDE_NO, E_INVALID_SIDE);
    assert!(!market.resolved, E_MARKET_RESOLVED);
    assert!(position.market == object::id(market), E_INVALID_POSITION_MARKET);
    assert!(amount > 0, E_INVALID_AMOUNT);

    let required_collateral = quote_buy(config, market, amount, side);
    assert!(coin::value(&payment) >= required_collateral, E_INVALID_PAYMENT);

    let payment_for_market = coin::split(&mut payment, required_collateral, ctx);
    let bal = coin::into_balance(payment_for_market);
    balance::join(&mut market.collateral, bal);

    if (side == SIDE_YES) {
        position.yes_shares = position.yes_shares + amount;
        market.yes_shares = market.yes_shares + amount;
    } else {
        position.no_shares = position.no_shares + amount;
        market.no_shares = market.no_shares + amount;
    };

    event::emit(SharesBought {
        sender: ctx.sender(),
        market_id: object::id(market),
        position_id: object::id(&position),
        side,
        amount,
        collateral_paid: required_collateral,
        new_yes_shares: market.yes_shares,
        new_no_shares: market.no_shares,
    });

    emit_trade_event(
        config,
        market,
        TRADE_TYPE_BUY,
        side,
        amount,
        required_collateral,
        true,
        ctx.sender(),
    );

    (payment, position)
}

public fun sell_shares(
    config: &Config,
    market: &mut Market,
    position: &mut Position,
    amount: u64,
    side: u8,
    ctx: &mut TxContext,
): Coin<PSEUDO_USDC> {
    assert!(side == SIDE_YES || side == SIDE_NO, E_INVALID_SIDE);
    assert!(!market.resolved, E_MARKET_RESOLVED);
    assert!(position.market == object::id(market), E_INVALID_POSITION_MARKET);
    assert!(amount > 0, E_INVALID_AMOUNT);

    if (side == SIDE_YES) {
        assert!(position.yes_shares >= amount, E_INSUFFICIENT_SHARES);
    } else {
        assert!(position.no_shares >= amount, E_INSUFFICIENT_SHARES);
    };

    let payout = quote_sell(config, market, amount, side);

    if (side == SIDE_YES) {
        position.yes_shares = position.yes_shares - amount;
        market.yes_shares = market.yes_shares - amount;
    } else {
        position.no_shares = position.no_shares - amount;
        market.no_shares = market.no_shares - amount;
    };

    event::emit(SharesSold {
        sender: ctx.sender(),
        market_id: object::id(market),
        position_id: object::id(position),
        side,
        amount,
        payout,
        new_yes_shares: market.yes_shares,
        new_no_shares: market.no_shares,
    });

    let payout_coin = coin::take(&mut market.collateral, payout, ctx);

    emit_trade_event(
        config,
        market,
        TRADE_TYPE_SELL,
        side,
        amount,
        payout,
        false,
        ctx.sender(),
    );

    payout_coin
}

public fun close_position(
    _config: &Config,
    market: &mut Market,
    position: Position,
    ctx: &mut TxContext,
): Coin<PSEUDO_USDC> {
    assert!(position.market == object::id(market), E_INVALID_POSITION_MARKET);
    assert!(market.resolved, E_MARKET_NOT_RESOLVED);

    let winning_shares = if (market.outcome == SIDE_YES) { position.yes_shares } else { position.no_shares };
    let total_payout = if (winning_shares > 0) { winning_shares * market.payout_per_share } else { 0 };

    let position_id = object::id(&position);
    let Position { id, market: _, yes_shares: _, no_shares: _ } = position;
    object::delete(id);

    event::emit(PositionClosed {
        sender: ctx.sender(),
        market_id: object::id(market),
        position_id,
        winning_shares,
        total_payout,
    });

    if (total_payout > 0) {
        coin::take(&mut market.collateral, total_payout, ctx)
    } else {
        coin::from_balance(balance::zero<PSEUDO_USDC>(), ctx)
    }
}

// === View Functions ===
public fun quote_buy(
    _config: &Config,
    market: &Market,
    amount: u64,
    side: u8,
): u64 {
    assert!(side == SIDE_YES || side == SIDE_NO, E_INVALID_SIDE);
    assert!(!market.resolved, E_MARKET_RESOLVED);
    assert!(amount > 0, E_INVALID_AMOUNT);
    assert!(market.b > 0, E_INVALID_AMOUNT);

    let q_yes_old = total_yes_shares(market);
    let q_no_old  = total_no_shares(market);

    let (q_yes_new, q_no_new) = if (side == SIDE_YES) {
        (q_yes_old + amount, q_no_old)
    } else {
        (q_yes_old, q_no_old + amount)
    };

    assert!(q_yes_new <= MAX_TOTAL_SHARES && q_no_new <= MAX_TOTAL_SHARES, E_MAX_TOTAL_SHARES);

    let old_cost = lmsr_cost_fp(q_yes_old, q_no_old, market.b);
    let new_cost = lmsr_cost_fp(q_yes_new, q_no_new, market.b);
    new_cost - old_cost
}

public fun quote_sell(
    _config: &Config,
    market: &Market,
    amount: u64,
    side: u8,
): u64 {
    assert!(side == SIDE_YES || side == SIDE_NO, E_INVALID_SIDE);
    assert!(!market.resolved, E_MARKET_RESOLVED);
    assert!(amount > 0, E_INVALID_AMOUNT);
    assert!(market.b > 0, E_INVALID_AMOUNT);

    let q_yes_old = total_yes_shares(market);
    let q_no_old  = total_no_shares(market);

    let (q_yes_new, q_no_new) = if (side == SIDE_YES) {
        (q_yes_old - amount, q_no_old)
    } else {
        (q_yes_old, q_no_old - amount)
    };

    let old_cost = lmsr_cost_fp(q_yes_old, q_no_old, market.b);
    let new_cost = lmsr_cost_fp(q_yes_new, q_no_new, market.b);
    old_cost - new_cost
}

public fun view_probabilities(market: &Market): (u64, u64) {
    // p_yes = 1 / (1 + exp(-(x - y))) with x = Q_yes/b, y = Q_no/b in WAD
    let qy = total_yes_shares(market) as u128;
    let qn = total_no_shares(market)  as u128;
    let b  = market.b as u128;

    if (qy + qn == 0) {
        return (PROBABILITY_SCALE / 2, PROBABILITY_SCALE / 2)
    };

    let x_wad = wad_div(qy, b);
    let y_wad = wad_div(qn, b);

    let (p_yes_wad, _) = softmax_pair(x_wad, y_wad);

    let p_yes_scaled: u64 = ((p_yes_wad * (PROBABILITY_SCALE as u128)) / WAD) as u64;
    (p_yes_scaled, PROBABILITY_SCALE - p_yes_scaled)
}

// === Admin Functions ===
public fun update_config(
    _admin_cap: &AdminCap,
    config: &mut Config,
    new_initial_virtual_per_side: u64,
    new_b_liquidity: u64,
    ctx: &TxContext,
) {
    assert!(new_b_liquidity > 0, E_INVALID_AMOUNT);

    let old_initial_virtual_per_side = config.initial_virtual_per_side;
    let old_b_liquidity = config.b_liquidity;

    config.initial_virtual_per_side = new_initial_virtual_per_side;
    config.b_liquidity = new_b_liquidity;

    event::emit(ConfigUpdated {
        sender: ctx.sender(),
        config_id: object::id(config),
        old_initial_virtual_per_side,
        new_initial_virtual_per_side,
        old_b_liquidity,
        new_b_liquidity,
    });
}

// === Private Functions ===
/// Total YES shares (virtual + actual)
fun total_yes_shares(market: &Market): u64 {
    market.yes_shares + market.virtual_yes_shares
}

/// Total NO shares (virtual + actual)
fun total_no_shares(market: &Market): u64 {
    market.no_shares + market.virtual_no_shares
}

fun emit_trade_event(
    config: &Config,
    market: &Market,
    trade_type: u8,
    side: u8,
    amount: u64,
    collateral_delta: u64,
    collateral_increase: bool,
    sender: address,
) {
    let (prob_yes, prob_no) = view_probabilities(market);
    let cost_buy_yes = quote_buy(config, market, 1, SIDE_YES);
    let cost_buy_no = quote_buy(config, market, 1, SIDE_NO);
    let cost_sell_yes = quote_sell_or_zero(config, market, SIDE_YES);
    let cost_sell_no = quote_sell_or_zero(config, market, SIDE_NO);
    event::emit(Trade {
        sender,
        market_id: object::id(market),
        trade_type,
        side,
        amount,
        collateral_delta,
        collateral_increase,
        total_collateral: balance::value(&market.collateral),
        cost_buy_yes,
        cost_buy_no,
        cost_sell_yes,
        cost_sell_no,
        prob_yes,
        prob_no,
    });
}

fun quote_sell_or_zero(
    config: &Config,
    market: &Market,
    side: u8,
): u64 {
    let total_shares = if (side == SIDE_YES) {
        total_yes_shares(market)
    } else {
        total_no_shares(market)
    };

    if (total_shares == 0) {
        0
    } else {
        quote_sell(config, market, 1, side)
    }
}

/// Fixed-point helpers
fun wad_mul(a: u128, b: u128): u128 {     
    // (a * b) >> 64  implemented without overflowing 128 bits
    (a / (1 << 32) * (b / (1 << 32)))}
/// means (a << 64) / b in Q64.64
fun wad_div(a: u128, b: u128): u128 { 
    // (a << 64) / b → implemented safely as ((a << 32) / b) << 32
    let hi = (a << 32) / b;
    hi << 32
    }

/// exp(+r) on r in [0, ln 2] using positive Taylor, then invert to get exp(-r)
/// exp(r) ≈ 1 + r + r^2/2 + r^3/6 + r^4/24
fun exp_pos_small(r_wad: u128): u128 {
    let one = WAD;
    let r1 = r_wad;
    let r2 = wad_mul(r1, r1);
    let r3 = wad_mul(r2, r1);
    let r4 = wad_mul(r3, r1);
    one + r1 + (r2 / 2) + (r3 / 6) + (r4 / 24)
}

/// exp(-t) with t >= 0 via range reduction by ln 2:
/// t = n*ln2 + r, r ∈ [0, ln2), exp(-t) = (1/2)^n * 1/exp(r)
fun exp_neg_fp(t_wad: u128): u128 {
    let n: u128 = t_wad / LN2_WAD;
    let r: u128 = t_wad - n * LN2_WAD;

    let exp_pos = exp_pos_small(r);
    let mut val: u128 = wad_div(WAD, exp_pos); // 1 / exp(r)

    let mut i: u128 = 0;
    while (i < n) {
        // Right shift by 1 is equivalent to dividing by 2
        // but preserves precision better
        val = val >> 1;
        i = i + 1;
    };
    val
}

/// ln(1 + z) for z ∈ [0, 1], Padé (2,1): ln(1+z) ≈ z*(6 + z)/(6 + 4z)
fun ln1p_fp(z_wad: u128): u128 {
    let six: u128 = 6 * WAD;
    let four: u128 = 4 * WAD;
    let num = wad_mul(z_wad, six + z_wad);
    let den = six + wad_mul(four, z_wad);
    wad_div(num, den)
}

/// Softmax for two logits x,y given in WAD. Returns (p_yes_wad, p_no_wad) in WAD.
fun softmax_pair(x_wad: u128, y_wad: u128): (u128, u128) {
    if (x_wad >= y_wad) {
        let t = x_wad - y_wad;              // ≥ 0
        let e_neg = exp_neg_fp(t);          // e^{-(x-y)} in WAD
        let denom = WAD + e_neg;
        (wad_div(WAD, denom), wad_div(e_neg, denom))
    } else {
        let t = y_wad - x_wad;              // ≥ 0
        let e_neg = exp_neg_fp(t);          // e^{-(y-x)} in WAD
        let denom = WAD + e_neg;
        (wad_div(e_neg, denom), wad_div(WAD, denom))
    }
}

/// LMSR cost in PSEUDO_USDC (integer, deterministic).
/// C(q) = b * ln( exp(Qy/b) + exp(Qn/b) )
/// Using: ln(e^x + e^y) = a + ln(1 + e^{-|x - y|}), where a = max(x, y)
fun lmsr_cost_fp(q_yes: u64, q_no: u64, b: u64): u64 {
    let b_u128: u128 = b as u128;
    let qy: u128 = q_yes as u128;
    let qn: u128 = q_no  as u128;

    // x = Q_yes / b, y = Q_no / b, both in Q64.64
    let x_wad: u128 = wad_div(qy, b_u128);   // Qy/b in Q64.64
    let y_wad: u128 = wad_div(qn, b_u128);   // Qn/b in Q64.64

    // a = max(x, y), t = |x - y|
    let a_wad: u128 = if (x_wad >= y_wad) { x_wad } else { y_wad };
    let diff_wad: u128 = if (x_wad >= y_wad) {
        x_wad - y_wad
    } else {
        y_wad - x_wad
    };

    // ln(e^x + e^y) = a + ln(1 + e^{-t})
    let e_neg: u128 = exp_neg_fp(diff_wad);  // e^{-t} in Q64.64
    let ln1p: u128  = ln1p_fp(e_neg);        // ln(1 + e^{-t}) in Q64.64

    let sum_wad: u128 = a_wad + ln1p;        // still Q64.64, ~ ln(e^x + e^y)

    // C_fp = b * ln(...)  (still Q64.64)
    let c_wad: u128 = b_u128 * sum_wad;

    // Convert from Q64.64 to integer PSEUDO_USDC units by:
    //   cost = C_fp * PRICE_SCALE_MIST / 2^64
    let c_mist: u128 = (c_wad * (PRICE_SCALE_MIST as u128)) / WAD;

    c_mist as u64
}


// === Test Helpers ===
#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(DELPHI {}, ctx);
}

#[test_only]
public fun get_market_fields(
    market: &Market,
): (u64, u64, u64, u64, u64, u64, bool, u8, u64) {
    (
        market.yes_shares,
        market.no_shares,
        market.virtual_yes_shares,
        market.virtual_no_shares,
        market.b,
        balance::value(&market.collateral),
        market.resolved,
        market.outcome,
        market.payout_per_share,
    )
}

#[test_only]
public fun get_position_fields(
    position: &Position,
): (ID, u64, u64) {
    (
        position.market,
        position.yes_shares,
        position.no_shares,
    )
}

#[test_only]
public fun get_config_fields(
    config: &Config,
): (u64, u64) {
    (
        config.initial_virtual_per_side,
        config.b_liquidity,
    )
}

#[test_only]
public fun create_test_market(
    config: &Config,
    ctx: &mut TxContext,
): Market {
    Market {
        id: object::new(ctx),
        type_: 1,
        date: b"01-01-2025".to_string(),
        coin: b"bitcoin".to_string(),
        comparator: 2,
        price: 50000,
        result: 0,
        timestamp_ms: 1000000,
        virtual_yes_shares: config.initial_virtual_per_side,
        virtual_no_shares: config.initial_virtual_per_side,
        yes_shares: 0,
        no_shares: 0,
        collateral: balance::zero<PSEUDO_USDC>(),
        b: config.b_liquidity,
        resolved: false,
        outcome: 0,
        payout_per_share: 0,
    }
}

#[test_only]
public fun set_market_yes_shares(market: &mut Market, shares: u64) {
    market.yes_shares = shares;
}

#[test_only]
public fun set_market_no_shares(market: &mut Market, shares: u64) {
    market.no_shares = shares;
}

#[test_only]
public fun set_market_resolved(market: &mut Market, resolved: bool) {
    market.resolved = resolved;
}

#[test_only]
public fun delete_test_market(market: Market, ctx: &mut TxContext) {
    let Market { id, type_: _, date: _, coin: _, comparator: _, price: _, result: _, timestamp_ms: _, yes_shares: _, no_shares: _, virtual_yes_shares: _, virtual_no_shares: _, b: _, collateral, resolved: _, outcome: _, payout_per_share: _ } = market;
    // Convert balance to coin and transfer it to sender (consumes the coin)
    // Test scenarios expect markets to hold zero collateral unless explicitly funded.
    let test_coin = coin::from_balance(collateral, ctx);
    transfer::public_transfer(test_coin, tx_context::sender(ctx));
    object::delete(id);
}
