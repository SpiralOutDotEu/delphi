#!/bin/bash
# Sui CLI command to call pseudo_register_enclave using PTB
# 
# Usage: Set the variables below and execute the script
#   ENCLAVE_PACKAGE_ID - The package ID of the enclave module
#   DELPHI_PACKAGE_ID - The package ID of your delphi module (from ObjectType when creating config)
#   PSEUDO_ENCLAVE_CONFIG_OBJECT_ID - The object ID of the PseudoEnclaveConfig object

# ===== CONFIGURATION =====
# Set these variables before running the script

ENCLAVE_PACKAGE_ID="0x3ad05f3d193e0a8b16f4529d770ddbf1496fb82fb6151940e8ca99036ff2d0f0"
DELPHI_PACKAGE_ID="0x2ea743c056f85f4fb931cc5cd9b79faaba74e35630ef668711ffc40f48022669"
PSEUDO_ENCLAVE_CONFIG_OBJECT_ID="0x7acc46baef6154a5bbedc36eda984586af84373c499b755140289f993bb88c2d"
GAS_BUDGET=100000000      # Gas budget for the transaction

# ===== SCRIPT =====

# Check if required variables are set
if [ "$ENCLAVE_PACKAGE_ID" = "0x0" ] || [ -z "$ENCLAVE_PACKAGE_ID" ]; then
    echo "Error: ENCLAVE_PACKAGE_ID is not set or is 0x0"
    exit 1
fi

if [ "$DELPHI_PACKAGE_ID" = "0x0" ] || [ -z "$DELPHI_PACKAGE_ID" ]; then
    echo "Error: DELPHI_PACKAGE_ID is not set or is 0x0"
    exit 1
fi

if [ "$PSEUDO_ENCLAVE_CONFIG_OBJECT_ID" = "0x0" ] || [ -z "$PSEUDO_ENCLAVE_CONFIG_OBJECT_ID" ]; then
    echo "Error: PSEUDO_ENCLAVE_CONFIG_OBJECT_ID is not set or is 0x0"
    exit 1
fi

echo "Calling pseudo_register_enclave with:"
echo "  ENCLAVE_PACKAGE_ID: $ENCLAVE_PACKAGE_ID"
echo "  DELPHI_PACKAGE_ID: $DELPHI_PACKAGE_ID"
echo "  PSEUDO_ENCLAVE_CONFIG_OBJECT_ID: $PSEUDO_ENCLAVE_CONFIG_OBJECT_ID"
echo "  GAS_BUDGET: $GAS_BUDGET"
echo ""

# Execute sui client ptb command
sui client ptb \
    --move-call "${ENCLAVE_PACKAGE_ID}::enclave::pseudo_register_enclave<${DELPHI_PACKAGE_ID}::delphi::DELPHI>" @${PSEUDO_ENCLAVE_CONFIG_OBJECT_ID} \
    --gas-budget "$GAS_BUDGET"
