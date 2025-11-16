module pseudo_usdc::pseudo_usdc;
use sui::coin_registry;
use sui::coin::{Self, Coin, TreasuryCap};
use sui::balance;

const TOTAL_SUPPLY: u64 = 100_000_000_000_000000; // 100 billion with 6 decimals
const FAUCET_AMOUNT: u64 = 100_000000; // 100 tokens with 6 decimals

public struct PSEUDO_USDC has drop {}

/// Stores the treasury cap and balance for the faucet
public struct Faucet has key {
    id: UID,
    cap: TreasuryCap<pseudo_usdc::pseudo_usdc::PSEUDO_USDC>,
    balance: balance::Balance<pseudo_usdc::pseudo_usdc::PSEUDO_USDC>,
}

/// Module initializer: mints the total supply and stores it in the Faucet object
fun init(witness: PSEUDO_USDC, ctx: &mut TxContext) {
    let (currency, mut treasury_cap) = coin_registry::new_currency_with_otw(
        witness,
        6, // Decimals
        b"USDC".to_string(), // Symbol
        b"Pseudo USDC".to_string(), // Name
        b"Cannot be minted nor burned".to_string(), // Description
        b"https://www.circle.com/hubfs/Brand/USDC/USDC_icon_32x32.png".to_string(), // Icon URL
        ctx,
    );

    // Mint the total supply and store it in the faucet balance
    let total_supply_coin = treasury_cap.mint(TOTAL_SUPPLY, ctx);
    let total_supply_balance = coin::into_balance(total_supply_coin);

    // Finalize and claim metadata cap
    let metadata_cap = currency.finalize(ctx);

    // Store the treasury cap and entire supply in a Faucet object
    // Note: We don't call make_supply_fixed because we need the treasury_cap
    // to continue minting through the faucet if needed
    let faucet = Faucet {
        id: object::new(ctx),
        cap: treasury_cap,
        balance: total_supply_balance,
    };
    transfer::share_object(faucet);

    // Transfer metadata cap to publisher
    transfer::public_transfer(metadata_cap, ctx.sender());
}

/// Faucet function: anyone can call to get 100 tokens, until empty
entry fun faucet(faucet: &mut Faucet, ctx: &mut TxContext) {
    let available = balance::value(&faucet.balance);
    assert!(available >= FAUCET_AMOUNT, 0); // 0 = "Faucet empty"
    let coin = coin::take(&mut faucet.balance, FAUCET_AMOUNT, ctx);
    transfer::public_transfer(coin, ctx.sender());
}

/// Return coins function: anyone can return coins back to the faucet
entry fun return_coins(
    faucet: &mut Faucet,
    payment: Coin<pseudo_usdc::pseudo_usdc::PSEUDO_USDC>,
    _ctx: &mut TxContext
) {
    let amount = coin::value(&payment);
    assert!(amount > 0, 1); // 1 = "Amount must be greater than zero"
    
    // Convert coin to balance and add it to the faucet balance
    let payment_balance = coin::into_balance(payment);
    balance::join(&mut faucet.balance, payment_balance);
}

// === View Functions ===

/// Get the current balance of the faucet
public fun balance(faucet: &Faucet): u64 {
    balance::value(&faucet.balance)
}

// === Test Functions ===

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(PSEUDO_USDC {}, ctx);
}

#[test_only]
public fun get_faucet_fields(
    faucet: &Faucet,
): (ID, ID, u64) {
    (
        object::id(faucet),
        object::id(&faucet.cap),
        balance::value(&faucet.balance),
    )
}



