#[test_only]
module delphi::delphi_tests;
use delphi::delphi;
use sui::test_scenario as ts;

const ENotImplemented: u64 = 0;

#[test]
fun test_delphi() {
    // Placeholder test to ensure the module compiles successfully.
}

#[test, expected_failure(abort_code = ::delphi::delphi_tests::ENotImplemented)]
fun test_delphi_fail() {
    abort ENotImplemented
}

// === Test quote_buy ===

#[test]
fun test_quote_buy_yes_shares() {
    let mut scenario = ts::begin(@0x1);
    
    // Initialize module
    {
        delphi::init_for_testing(scenario.ctx());
    };
    
    // Next transaction to access shared objects
    scenario.next_tx(@0x1);
    {
        let config = scenario.take_shared<delphi::Config>();
        let market = delphi::create_test_market(&config, scenario.ctx());
        
        // Test buying 1 YES share (SIDE_YES = 1)
        let cost = delphi::quote_buy(&config, &market, 1, 1);
        assert!(cost > 0, 0);
        
        // Test buying 10 YES shares
        let cost_10 = delphi::quote_buy(&config, &market, 10, 1);
        assert!(cost_10 > cost, 1); // Should cost more than 1 share
        
        // Test buying 100 YES shares
        let cost_100 = delphi::quote_buy(&config, &market, 100, 1);
        assert!(cost_100 > cost_10, 2); // Should cost more than 10 shares
        
        // Cleanup
        delphi::delete_test_market(market, scenario.ctx());
        ts::return_shared(config);
    };
    
    scenario.end();
}

#[test]
fun test_quote_buy_no_shares() {
    let mut scenario = ts::begin(@0x1);
    
    // Initialize module
    {
        delphi::init_for_testing(scenario.ctx());
    };
    
    // Next transaction to access shared objects
    scenario.next_tx(@0x1);
    {
        let config = scenario.take_shared<delphi::Config>();
        let market = delphi::create_test_market(&config, scenario.ctx());
        
        // Test buying 1 NO share (SIDE_NO = 2)
        let cost = delphi::quote_buy(&config, &market, 1, 2);
        assert!(cost > 0, 0);
        
        // Test buying 10 NO shares
        let cost_10 = delphi::quote_buy(&config, &market, 10, 2);
        assert!(cost_10 > cost, 1); // Should cost more than 1 share
        
        // Test buying 100 NO shares
        let cost_100 = delphi::quote_buy(&config, &market, 100, 2);
        assert!(cost_100 > cost_10, 2); // Should cost more than 10 shares
        
        // Cleanup
        delphi::delete_test_market(market, scenario.ctx());
        ts::return_shared(config);
    };
    
    scenario.end();
}

#[test]
fun test_quote_buy_yes_vs_no_symmetry() {
    let mut scenario = ts::begin(@0x1);
    
    // Initialize module
    {
        delphi::init_for_testing(scenario.ctx());
    };
    
    // Next transaction to access shared objects
    scenario.next_tx(@0x1);
    {
        let config = scenario.take_shared<delphi::Config>();
        let market = delphi::create_test_market(&config, scenario.ctx());
        
        // A freshly initialized market should quote YES and NO symmetrically.
        let cost_yes = delphi::quote_buy(&config, &market, 1, 1);
        let cost_no = delphi::quote_buy(&config, &market, 1, 2);
        
        // Allow for up to 1% variance to accommodate integer rounding.
        let diff = if (cost_yes > cost_no) { cost_yes - cost_no } else { cost_no - cost_yes };
        let max_diff = cost_yes / 100; // 1% tolerance
        assert!(diff <= max_diff, 0);
        
        // Cleanup
        delphi::delete_test_market(market, scenario.ctx());
        ts::return_shared(config);
    };
    
    scenario.end();
}

#[test]
fun test_quote_buy_increasing_cost() {
    let mut scenario = ts::begin(@0x1);
    
    // Initialize module
    {
        delphi::init_for_testing(scenario.ctx());
    };
    
    // Next transaction to access shared objects
    scenario.next_tx(@0x1);
    {
        let config = scenario.take_shared<delphi::Config>();
        let market = delphi::create_test_market(&config, scenario.ctx());
        
        // Confirm that each additional share increases marginal cost.
        let cost_1 = delphi::quote_buy(&config, &market, 1, 1);
        let cost_2 = delphi::quote_buy(&config, &market, 2, 1);
        let cost_3 = delphi::quote_buy(&config, &market, 3, 1);
        
        // LMSR convexity requires the cost for two shares to exceed twice the single-share cost.
        assert!(cost_2 > cost_1 * 2, 0);
        // The three-share quote must exceed the two-share quote.
        assert!(cost_3 > cost_2, 1);
        
        // Cleanup
        delphi::delete_test_market(market, scenario.ctx());
        ts::return_shared(config);
    };
    
    scenario.end();
}

#[test, expected_failure(abort_code = delphi::E_INVALID_SIDE)]
fun test_quote_buy_invalid_side() {
    let mut scenario = ts::begin(@0x1);
    
    // Initialize module
    {
        delphi::init_for_testing(scenario.ctx());
    };
    
    // Next transaction to access shared objects
    scenario.next_tx(@0x1);
    {
        let config = scenario.take_shared<delphi::Config>();
        let market = delphi::create_test_market(&config, scenario.ctx());
        
        // Buying with an invalid side is expected to abort.
        let _ = delphi::quote_buy(&config, &market, 1, 99);
        
        // Cleanup
        delphi::delete_test_market(market, scenario.ctx());
        ts::return_shared(config);
    };
    
    scenario.end();
}

#[test, expected_failure(abort_code = delphi::E_INVALID_AMOUNT)]
fun test_quote_buy_zero_amount() {
    let mut scenario = ts::begin(@0x1);
    
    // Initialize module
    {
        delphi::init_for_testing(scenario.ctx());
    };
    
    // Next transaction to access shared objects
    scenario.next_tx(@0x1);
    {
        let config = scenario.take_shared<delphi::Config>();
        let market = delphi::create_test_market(&config, scenario.ctx());
        
        // Quoting zero shares must abort.
        let _ = delphi::quote_buy(&config, &market, 0, 1);
        
        // Cleanup
        delphi::delete_test_market(market, scenario.ctx());
        ts::return_shared(config);
    };
    
    scenario.end();
}

#[test, expected_failure(abort_code = delphi::E_MARKET_RESOLVED)]
fun test_quote_buy_resolved_market() {
    let mut scenario = ts::begin(@0x1);
    
    // Initialize module
    {
        delphi::init_for_testing(scenario.ctx());
    };
    
    // Next transaction to access shared objects
    scenario.next_tx(@0x1);
    {
        let config = scenario.take_shared<delphi::Config>();
        let mut market = delphi::create_test_market(&config, scenario.ctx());
        
        // Mark market as resolved
        delphi::set_market_resolved(&mut market, true);
        
        // Buying after the market resolves must abort.
        let _ = delphi::quote_buy(&config, &market, 1, 1);
        
        // Cleanup
        delphi::delete_test_market(market, scenario.ctx());
        ts::return_shared(config);
    };
    
    scenario.end();
}

// === Test quote_sell ===

#[test]
fun test_quote_sell_yes_shares() {
    let mut scenario = ts::begin(@0x1);
    
    // Initialize module
    {
        delphi::init_for_testing(scenario.ctx());
    };
    
    // Next transaction to access shared objects
    scenario.next_tx(@0x1);
    {
        let config = scenario.take_shared<delphi::Config>();
        let mut market = delphi::create_test_market(&config, scenario.ctx());
        
        // First, add some YES shares to the market
        delphi::set_market_yes_shares(&mut market, 100);
        
        // Test selling 1 YES share
        let payout = delphi::quote_sell(&config, &market, 1, 1);
        assert!(payout > 0, 0);
        
        // Test selling 10 YES shares
        let payout_10 = delphi::quote_sell(&config, &market, 10, 1);
        assert!(payout_10 > payout, 1); // Should payout more than 1 share
        
        // Test selling 50 YES shares
        let payout_50 = delphi::quote_sell(&config, &market, 50, 1);
        assert!(payout_50 > payout_10, 2); // Should payout more than 10 shares
        
        // Cleanup
        delphi::delete_test_market(market, scenario.ctx());
        ts::return_shared(config);
    };
    
    scenario.end();
}

#[test]
fun test_quote_sell_no_shares() {
    let mut scenario = ts::begin(@0x1);
    
    // Initialize module
    {
        delphi::init_for_testing(scenario.ctx());
    };
    
    // Next transaction to access shared objects
    scenario.next_tx(@0x1);
    {
        let config = scenario.take_shared<delphi::Config>();
        let mut market = delphi::create_test_market(&config, scenario.ctx());
        
        // First, add some NO shares to the market
        delphi::set_market_no_shares(&mut market, 100);
        
        // Test selling 1 NO share
        let payout = delphi::quote_sell(&config, &market, 1, 2);
        assert!(payout > 0, 0);
        
        // Test selling 10 NO shares
        let payout_10 = delphi::quote_sell(&config, &market, 10, 2);
        assert!(payout_10 > payout, 1); // Should payout more than 1 share
        
        // Test selling 50 NO shares
        let payout_50 = delphi::quote_sell(&config, &market, 50, 2);
        assert!(payout_50 > payout_10, 2); // Should payout more than 10 shares
        
        // Cleanup
        delphi::delete_test_market(market, scenario.ctx());
        ts::return_shared(config);
    };
    
    scenario.end();
}

#[test]
fun test_quote_sell_decreasing_payout() {
    let mut scenario = ts::begin(@0x1);
    
    // Initialize module
    {
        delphi::init_for_testing(scenario.ctx());
    };
    
    // Next transaction to access shared objects
    scenario.next_tx(@0x1);
    {
        let config = scenario.take_shared<delphi::Config>();
        let mut market = delphi::create_test_market(&config, scenario.ctx());
        
        // Add some YES shares to the market
        delphi::set_market_yes_shares(&mut market, 100);
        
        // Verify that payouts decline as more shares are sold.
        let payout_1 = delphi::quote_sell(&config, &market, 1, 1);
        let payout_2 = delphi::quote_sell(&config, &market, 2, 1);
        let payout_3 = delphi::quote_sell(&config, &market, 3, 1);
        
        // LMSR convexity mandates that two-share payouts stay below twice the one-share payout.
        assert!(payout_2 < payout_1 * 2, 0);
        // The three-share payout must remain below the combined one- and two-share payouts.
        assert!(payout_3 < payout_2 + payout_1, 1);
        
        // Cleanup
        delphi::delete_test_market(market, scenario.ctx());
        ts::return_shared(config);
    };
    
    scenario.end();
}

#[test]
fun test_quote_buy_then_sell() {
    let mut scenario = ts::begin(@0x1);
    
    // Initialize module
    {
        delphi::init_for_testing(scenario.ctx());
    };
    
    // Next transaction to access shared objects
    scenario.next_tx(@0x1);
    {
        let config = scenario.take_shared<delphi::Config>();
        let mut market = delphi::create_test_market(&config, scenario.ctx());
        
        // Quote buying 10 YES shares
        let buy_cost = delphi::quote_buy(&config, &market, 10, 1);
        
        // Simulate the buy by updating market state
        let (yes_shares, _, _, _, _, _, _, _, _) = delphi::get_market_fields(&market);
        delphi::set_market_yes_shares(&mut market, yes_shares + 10);
        
        // Quote selling 10 YES shares
        let sell_payout = delphi::quote_sell(&config, &market, 10, 1);
        
        // Selling immediately after buying should yield an equivalent quote.
        assert!(sell_payout == buy_cost, 0);
        
        // Cleanup
        delphi::delete_test_market(market, scenario.ctx());
        ts::return_shared(config);
    };
    
    scenario.end();
}

#[test, expected_failure(abort_code = delphi::E_INVALID_SIDE)]
fun test_quote_sell_invalid_side() {
    let mut scenario = ts::begin(@0x1);
    
    // Initialize module
    {
        delphi::init_for_testing(scenario.ctx());
    };
    
    // Next transaction to access shared objects
    scenario.next_tx(@0x1);
    {
        let config = scenario.take_shared<delphi::Config>();
        let mut market = delphi::create_test_market(&config, scenario.ctx());
        
        // Add some shares
        delphi::set_market_yes_shares(&mut market, 100);
        
        // Selling with an invalid side is expected to abort.
        let _ = delphi::quote_sell(&config, &market, 1, 99);
        
        // Cleanup
        delphi::delete_test_market(market, scenario.ctx());
        ts::return_shared(config);
    };
    
    scenario.end();
}

#[test, expected_failure(abort_code = delphi::E_INVALID_AMOUNT)]
fun test_quote_sell_zero_amount() {
    let mut scenario = ts::begin(@0x1);
    
    // Initialize module
    {
        delphi::init_for_testing(scenario.ctx());
    };
    
    // Next transaction to access shared objects
    scenario.next_tx(@0x1);
    {
        let config = scenario.take_shared<delphi::Config>();
        let mut market = delphi::create_test_market(&config, scenario.ctx());
        
        // Add some shares
        delphi::set_market_yes_shares(&mut market, 100);
        
        // Quoting a sale of zero shares must abort.
        let _ = delphi::quote_sell(&config, &market, 0, 1);
        
        // Cleanup
        delphi::delete_test_market(market, scenario.ctx());
        ts::return_shared(config);
    };
    
    scenario.end();
}

#[test, expected_failure(abort_code = delphi::E_MARKET_RESOLVED)]
fun test_quote_sell_resolved_market() {
    let mut scenario = ts::begin(@0x1);
    
    // Initialize module
    {
        delphi::init_for_testing(scenario.ctx());
    };
    
    // Next transaction to access shared objects
    scenario.next_tx(@0x1);
    {
        let config = scenario.take_shared<delphi::Config>();
        let mut market = delphi::create_test_market(&config, scenario.ctx());
        
        // Add some shares
        delphi::set_market_yes_shares(&mut market, 100);
        
        // Mark market as resolved
        delphi::set_market_resolved(&mut market, true);
        
        // Selling after the market resolves must abort.
        let _ = delphi::quote_sell(&config, &market, 1, 1);
        
        // Cleanup
        delphi::delete_test_market(market, scenario.ctx());
        ts::return_shared(config);
    };
    
    scenario.end();
}
