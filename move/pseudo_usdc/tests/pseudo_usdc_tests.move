#[test_only]
module pseudo_usdc::pseudo_usdc_tests;

use pseudo_usdc::pseudo_usdc::{
    Faucet,
    PSEUDO_USDC,
    init_for_testing,
    get_faucet_fields,
    faucet,
    return_coins,
};
use sui::test_scenario as ts;
use sui::coin::{Self as coin, Coin};

const ALICE: address = @0xA;
const BOB: address = @0xB;
const ADMIN: address = @0xAD;

// Constants matching the source module
const TOTAL_SUPPLY: u64 = 100_000_000_000_000000; // 100 billion with 6 decimals
const FAUCET_AMOUNT: u64 = 100_000000; // 100 tokens with 6 decimals

#[test]
fun test_init() {
    let mut scenario = ts::begin(ADMIN);
    
    // Initialize the module
    {
        init_for_testing(scenario.ctx());
    };
    
    // Next transaction to access shared objects
    scenario.next_tx(ADMIN);
    {
        let faucet = scenario.take_shared<Faucet>();
        let (faucet_id, cap_id, balance) = get_faucet_fields(&faucet);
        
        // Verify initial state
        assert!(balance == TOTAL_SUPPLY, 1); // Should have total supply
        assert!(faucet_id != cap_id, 2); // IDs should be different
        
        ts::return_shared(faucet);
    };
    
    scenario.end();
}

#[test]
fun test_faucet_withdraw() {
    let mut scenario = ts::begin(ALICE);
    
    // Initialize
    {
        init_for_testing(scenario.ctx());
    };
    
    // Alice withdraws from faucet
    scenario.next_tx(ALICE);
    {
        let mut faucet = scenario.take_shared<Faucet>();
        let (_, _, balance_before) = get_faucet_fields(&faucet);
        
        faucet(&mut faucet, scenario.ctx());
        
        let (_, _, balance_after) = get_faucet_fields(&faucet);
        
        // Verify balance decreased by FAUCET_AMOUNT
        assert!(balance_after == balance_before - FAUCET_AMOUNT, 1);
        assert!(balance_after == TOTAL_SUPPLY - FAUCET_AMOUNT, 2);
        
        ts::return_shared(faucet);
    };
    
    // Collect the coin Alice received
    scenario.next_tx(ALICE);
    {
        let coin = scenario.take_from_sender<Coin<PSEUDO_USDC>>();
        let amount = coin::value(&coin);
        assert!(amount == FAUCET_AMOUNT, 3);
        scenario.return_to_sender(coin);
    };
    
    scenario.end();
}

#[test]
fun test_faucet_multiple_withdraws() {
    let mut scenario = ts::begin(ALICE);
    
    // Initialize
    {
        init_for_testing(scenario.ctx());
    };
    
    // Alice withdraws first time
    scenario.next_tx(ALICE);
    {
        let mut faucet = scenario.take_shared<Faucet>();
        faucet(&mut faucet, scenario.ctx());
        ts::return_shared(faucet);
    };
    
    // Collect first coin
    scenario.next_tx(ALICE);
    {
        let coin1 = scenario.take_from_sender<Coin<PSEUDO_USDC>>();
        scenario.return_to_sender(coin1);
    };
    
    // Alice withdraws second time
    scenario.next_tx(ALICE);
    {
        let mut faucet = scenario.take_shared<Faucet>();
        let (_, _, balance_before) = get_faucet_fields(&faucet);
        
        faucet(&mut faucet, scenario.ctx());
        
        let (_, _, balance_after) = get_faucet_fields(&faucet);
        
        // Verify balance decreased again
        assert!(balance_after == balance_before - FAUCET_AMOUNT, 1);
        assert!(balance_after == TOTAL_SUPPLY - (2 * FAUCET_AMOUNT), 2);
        
        ts::return_shared(faucet);
    };
    
    // Collect second coin
    scenario.next_tx(ALICE);
    {
        let coin2 = scenario.take_from_sender<Coin<PSEUDO_USDC>>();
        scenario.return_to_sender(coin2);
    };
    
    scenario.end();
}

#[test]
fun test_return_coins() {
    let mut scenario = ts::begin(ALICE);
    
    // Initialize
    {
        init_for_testing(scenario.ctx());
    };
    
    // Alice withdraws from faucet first
    scenario.next_tx(ALICE);
    {
        let mut faucet = scenario.take_shared<Faucet>();
        faucet(&mut faucet, scenario.ctx());
        ts::return_shared(faucet);
    };
    
    // Collect the coin
    scenario.next_tx(ALICE);
    {
        let coin = scenario.take_from_sender<Coin<PSEUDO_USDC>>();
        let amount = coin::value(&coin);
        assert!(amount == FAUCET_AMOUNT, 1);
        
        // Return the coin to faucet
        scenario.next_tx(ALICE);
        {
            let mut faucet = scenario.take_shared<Faucet>();
            let (_, _, balance_before) = get_faucet_fields(&faucet);
            
            return_coins(&mut faucet, coin, scenario.ctx());
            
            let (_, _, balance_after) = get_faucet_fields(&faucet);
            
            // Verify balance increased back
            assert!(balance_after == balance_before + FAUCET_AMOUNT, 2);
            assert!(balance_after == TOTAL_SUPPLY, 3); // Back to total supply
            
            ts::return_shared(faucet);
        };
    };
    
    scenario.end();
}

#[test]
fun test_return_coins_partial() {
    let mut scenario = ts::begin(ALICE);
    
    // Initialize
    {
        init_for_testing(scenario.ctx());
    };
    
    // Alice withdraws from faucet
    scenario.next_tx(ALICE);
    {
        let mut faucet = scenario.take_shared<Faucet>();
        faucet(&mut faucet, scenario.ctx());
        ts::return_shared(faucet);
    };
    
    // Collect the coin
    scenario.next_tx(ALICE);
    {
        let mut coin = scenario.take_from_sender<Coin<PSEUDO_USDC>>();
        let return_amount = FAUCET_AMOUNT / 2; // Return half
        
        // Split the coin
        let return_coin = coin::split(&mut coin, return_amount, scenario.ctx());
        
        // Return half to faucet
        scenario.next_tx(ALICE);
        {
            let mut faucet = scenario.take_shared<Faucet>();
            let (_, _, balance_before) = get_faucet_fields(&faucet);
            
            return_coins(&mut faucet, return_coin, scenario.ctx());
            
            let (_, _, balance_after) = get_faucet_fields(&faucet);
            
            // Verify balance increased by half
            assert!(balance_after == balance_before + return_amount, 1);
            
            ts::return_shared(faucet);
        };
        
        // Keep the other half
        scenario.return_to_sender(coin);
    };
    
    scenario.end();
}

#[test]
fun test_multiple_users() {
    let mut scenario = ts::begin(ALICE);
    
    // Initialize
    {
        init_for_testing(scenario.ctx());
    };
    
    // Alice withdraws
    scenario.next_tx(ALICE);
    {
        let mut faucet = scenario.take_shared<Faucet>();
        faucet(&mut faucet, scenario.ctx());
        ts::return_shared(faucet);
    };
    
    // Collect Alice's coin
    scenario.next_tx(ALICE);
    {
        let coin = scenario.take_from_sender<Coin<PSEUDO_USDC>>();
        scenario.return_to_sender(coin);
    };
    
    // Bob withdraws
    scenario.next_tx(BOB);
    {
        let mut faucet = scenario.take_shared<Faucet>();
        let (_, _, balance_before) = get_faucet_fields(&faucet);
        
        faucet(&mut faucet, scenario.ctx());
        
        let (_, _, balance_after) = get_faucet_fields(&faucet);
        
        // Verify balance decreased
        assert!(balance_after == balance_before - FAUCET_AMOUNT, 1);
        assert!(balance_after == TOTAL_SUPPLY - (2 * FAUCET_AMOUNT), 2);
        
        ts::return_shared(faucet);
    };
    
    // Collect Bob's coin
    scenario.next_tx(BOB);
    {
        let coin = scenario.take_from_sender<Coin<PSEUDO_USDC>>();
        scenario.return_to_sender(coin);
    };
    
    scenario.end();
}

#[test]
fun test_withdraw_and_return_flow() {
    let mut scenario = ts::begin(ALICE);
    
    // Initialize
    {
        init_for_testing(scenario.ctx());
    };
    
    // Withdraw multiple times
    let mut withdrawals = 0;
    while (withdrawals < 3) {
        scenario.next_tx(ALICE);
        {
            let mut faucet = scenario.take_shared<Faucet>();
            faucet(&mut faucet, scenario.ctx());
            ts::return_shared(faucet);
        };
        
        scenario.next_tx(ALICE);
        {
            let coin = scenario.take_from_sender<Coin<PSEUDO_USDC>>();
            scenario.return_to_sender(coin);
        };
        
        withdrawals = withdrawals + 1;
    };
    
    // Verify final balance
    scenario.next_tx(ALICE);
    {
        let faucet = scenario.take_shared<Faucet>();
        let (_, _, balance) = get_faucet_fields(&faucet);
        
        assert!(balance == TOTAL_SUPPLY - (3 * FAUCET_AMOUNT), 1);
        
        ts::return_shared(faucet);
    };
    
    // Return all coins back
    scenario.next_tx(ALICE);
    {
        // Collect all coins Alice has
        let mut total_returned = 0;
        let mut i = 0;
        while (i < 3) {
            scenario.next_tx(ALICE);
            {
                let coin = scenario.take_from_sender<Coin<PSEUDO_USDC>>();
                let amount = coin::value(&coin);
                total_returned = total_returned + amount;
                
                scenario.next_tx(ALICE);
                {
                    let mut faucet = scenario.take_shared<Faucet>();
                    return_coins(&mut faucet, coin, scenario.ctx());
                    ts::return_shared(faucet);
                };
            };
            i = i + 1;
        };
        
        assert!(total_returned == 3 * FAUCET_AMOUNT, 2);
    };
    
    // Verify balance is back to total supply
    scenario.next_tx(ALICE);
    {
        let faucet = scenario.take_shared<Faucet>();
        let (_, _, balance) = get_faucet_fields(&faucet);
        
        assert!(balance == TOTAL_SUPPLY, 3);
        
        ts::return_shared(faucet);
    };
    
    scenario.end();
}
