#!/bin/bash
# Sui CLI command to call create_market using PTB (Programmable Transaction Builder)
# This properly handles the signature as a vector<u8> and shared objects
# 
# Usage: Update the values below from your API response

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
ENCLAVE_OBJECT_ID="0xaba39ab14f4c153b7fc2ea020c4f198eac7d2a975c49e468fffd2f4dd7a900c7"
DELPHI_PACKAGE_ID="0x299d4838cee74046325153b7e54ba20c935faa49dcd458c56b8ed54a403165f1"

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

echo "Converted signature to vector array"
echo "Using timestamp: $TIMESTAMP_MS"
echo "Using price: $PRICE"

sui client ptb \
  --move-call "${DELPHI_PACKAGE_ID}::delphi::create_market<${DELPHI_PACKAGE_ID}::delphi::DELPHI>" \
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
