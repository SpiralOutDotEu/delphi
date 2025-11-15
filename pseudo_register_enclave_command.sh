#!/bin/bash
# Sui CLI command to call pseudo_register_enclave
# 
# Usage: Replace the placeholders below:
#   ENCLAVE_PACKAGE_ID - The package ID of the enclave module
#   DELPHI_PACKAGE_ID - The package ID of your delphi module (from ObjectType when creating config)
#   CONFIG_OBJECT_ID - The object ID of the PseudoEnclaveConfig object

sui client call \
  --package ENCLAVE_PACKAGE_ID \
  --module enclave \
  --function pseudo_register_enclave \
  --type-args "DELPHI_PACKAGE_ID::delphi::DELPHI" \
  --args CONFIG_OBJECT_ID \
  --gas-budget 100000000

