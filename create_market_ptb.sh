#!/bin/bash
# Sui CLI command to call create_market using PTB (Programmable Transaction Builder)
# This properly handles the signature as a vector<u8> and shared objects
# 
# Usage: Update the values below from your API response
#   DELPHI_CONFIG_OBJECT_ID - The Config shared object ID (created during package init)
#   ENCLAVE_OBJECT_ID - The Enclave shared object ID

# Values from API response
SIGNATURE_HEX="0xd970296fd6123a7beb436631d370ab5e6552769b74ba2911609aa3957091aa910f6a16693fa4077cc4787cefdd994507271a0838a14f688c1a84b8ef6cfe180e"
TIMESTAMP_MS="1763232178259"
TYPE=1
DATE="10-11-2025"
COIN="bitcoin"
COMPARATOR=2
PRICE=0
RESULT=0

# Object IDs
DELPHI_CONFIG_OBJECT_ID="0x9de4688eac02dc49466582c94b11df31de86a02cec66284fe48d9a0e74e099b9"  # Replace with your Config object ID (shared object created during init)
ENCLAVE_OBJECT_ID="0xdd4141ea815f54a500d0136722a6d1bf56825d8a883fc59a3a93876fa5de506a"
DELPHI_PACKAGE_ID="0xf5622bf11bac2c0653f6da28e53263b45e7ac2cf5f493cc53ef7fe0f3734012c"

# Remove 0x prefix for conversion
SIG_HEX_NO_PREFIX="${SIGNATURE_HEX#0x}"

# Convert hex to vector array using Python
SIG_ARRAY=$(python3 - <<EOF
def hex_to_vector(hex_string):
    byte_values = [str(int(hex_string[i:i+2], 16)) for i in range(0, len(hex_string), 2)]
    rust_array = [f"{byte}u8" for byte in byte_values]
    return f"[{', '.join(rust_array)}]"

print(hex_to_vector("$SIG_HEX_NO_PREFIX"))
EOF
)

# Validate required object IDs
if [ "$DELPHI_CONFIG_OBJECT_ID" = "0x0" ] || [ -z "$DELPHI_CONFIG_OBJECT_ID" ]; then
    echo "Error: DELPHI_CONFIG_OBJECT_ID is not set or is 0x0"
    exit 1
fi

if [ "$ENCLAVE_OBJECT_ID" = "0x0" ] || [ -z "$ENCLAVE_OBJECT_ID" ]; then
    echo "Error: ENCLAVE_OBJECT_ID is not set or is 0x0"
    exit 1
fi

echo "Converted signature to vector array"
echo "Using timestamp: $TIMESTAMP_MS"
echo "Using price: $PRICE"
echo "Using config object: $DELPHI_CONFIG_OBJECT_ID"
echo "Using enclave object: $ENCLAVE_OBJECT_ID"

sui client ptb \
  --move-call "${DELPHI_PACKAGE_ID}::delphi::create_market<${DELPHI_PACKAGE_ID}::delphi::DELPHI>" \
    @${DELPHI_CONFIG_OBJECT_ID} \
    $TYPE \
    "\"$DATE\"" \
    "\"$COIN\"" \
    $COMPARATOR \
    $PRICE \
    $RESULT \
    $TIMESTAMP_MS \
    "vector${SIG_ARRAY}" \
    @${ENCLAVE_OBJECT_ID} \
  --gas-budget 100000000
