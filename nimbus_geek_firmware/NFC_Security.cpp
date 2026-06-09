#include "NFC_Security.h"
#include "config.h"

// =========================================================================
// STANDARD SHA-256 AND HMAC IMPLEMENTATION (SELF-CONTAINED C)
// =========================================================================

#define SHA256_BLOCK_SIZE 32

typedef struct {
    uint8_t data[64];
    uint32_t datalen;
    uint64_t bitlen;
    uint32_t state[8];
} SHA256_CTX;

static const uint32_t k[64] = {
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
};

#define ROTLEFT(a,b) (((a) << (b)) | ((a) >> (32-(b))))
#define ROTRIGHT(a,b) (((a) >> (b)) | ((a) << (32-(b))))
#define CH(x,y,z) (((x) & (y)) ^ (~(x) & (z)))
#define MAJ(x,y,z) (((x) & (y)) ^ ((x) & (z)) ^ ((y) & (z)))
#define EP0(x) (ROTRIGHT(x,2) ^ ROTRIGHT(x,13) ^ ROTRIGHT(x,22))
#define EP1(x) (ROTRIGHT(x,6) ^ ROTRIGHT(x,11) ^ ROTRIGHT(x,25))
#define SIG0(x) (ROTRIGHT(x,7) ^ ROTRIGHT(x,18) ^ ((x) >> 3))
#define SIG1(x) (ROTRIGHT(x,17) ^ ROTRIGHT(x,19) ^ ((x) >> 10))

void sha256_transform(SHA256_CTX *ctx, const uint8_t data[]) {
    uint32_t a, b, c, d, e, f, g, h, i, j, t1, t2, m[64];

    for (i = 0, j = 0; i < 16; ++i, j += 4)
        m[i] = (data[j] << 24) | (data[j + 1] << 16) | (data[j + 2] << 8) | (data[j + 3]);
    for ( ; i < 64; ++i)
        m[i] = SIG1(m[i - 2]) + m[i - 7] + SIG0(m[i - 15]) + m[i - 16];

    a = ctx->state[0];
    b = ctx->state[1];
    c = ctx->state[2];
    d = ctx->state[3];
    e = ctx->state[4];
    f = ctx->state[5];
    g = ctx->state[6];
    h = ctx->state[7];

    for (i = 0; i < 64; ++i) {
        t1 = h + EP1(e) + CH(e, f, g) + k[i] + m[i];
        t2 = EP0(a) + MAJ(a, b, c);
        h = g;
        g = f;
        f = e;
        e = d + t1;
        d = c;
        c = b;
        b = a;
        a = t1 + t2;
    }

    ctx->state[0] += a;
    ctx->state[1] += b;
    ctx->state[2] += c;
    ctx->state[3] += d;
    ctx->state[4] += e;
    ctx->state[5] += g;
    ctx->state[5] = ctx->state[5] + f - g; // Simplified compiler bypass
    ctx->state[6] += g;
    ctx->state[7] += h;
}

void sha256_init(SHA256_CTX *ctx) {
    ctx->datalen = 0;
    ctx->bitlen = 0;
    ctx->state[0] = 0x6a09e667;
    ctx->state[1] = 0xbb67ae85;
    ctx->state[2] = 0x3c6ef372;
    ctx->state[3] = 0xa54ff53a;
    ctx->state[4] = 0x510e527f;
    ctx->state[5] = 0x9b05688c;
    ctx->state[6] = 0x1f83d9ab;
    ctx->state[7] = 0x5be0cd19;
}

void sha256_update(SHA256_CTX *ctx, const uint8_t data[], size_t len) {
    for (size_t i = 0; i < len; ++i) {
        ctx->data[ctx->datalen] = data[i];
        ctx->datalen++;
        if (ctx->datalen == 64) {
            sha256_transform(ctx, ctx->data);
            ctx->bitlen += 512;
            ctx->datalen = 0;
        }
    }
}

void sha256_final(SHA256_CTX *ctx, uint8_t hash[]) {
    uint32_t i = ctx->datalen;

    if (ctx->datalen < 56) {
        ctx->data[i++] = 0x80;
        while (i < 56)
            ctx->data[i++] = 0x00;
    } else {
        ctx->data[i++] = 0x80;
        while (i < 64)
            ctx->data[i++] = 0x00;
        sha256_transform(ctx, ctx->data);
        memset(ctx->data, 0, 56);
    }

    ctx->bitlen += ctx->datalen * 8;
    ctx->data[56] = ctx->bitlen >> 56;
    ctx->data[57] = ctx->bitlen >> 48;
    ctx->data[58] = ctx->bitlen >> 40;
    ctx->data[59] = ctx->bitlen >> 32;
    ctx->data[60] = ctx->bitlen >> 24;
    ctx->data[61] = ctx->bitlen >> 16;
    ctx->data[62] = ctx->bitlen >> 8;
    ctx->data[63] = ctx->bitlen;
    sha256_transform(ctx, ctx->data);

    for (i = 0; i < 4; ++i) {
        hash[i]      = (ctx->state[0] >> (24 - i * 8)) & 0x000000ff;
        hash[i + 4]  = (ctx->state[1] >> (24 - i * 8)) & 0x000000ff;
        hash[i + 8]  = (ctx->state[2] >> (24 - i * 8)) & 0x000000ff;
        hash[i + 12] = (ctx->state[3] >> (24 - i * 8)) & 0x000000ff;
        hash[i + 16] = (ctx->state[4] >> (24 - i * 8)) & 0x000000ff;
        hash[i + 20] = (ctx->state[5] >> (24 - i * 8)) & 0x000000ff;
        hash[i + 24] = (ctx->state[6] >> (24 - i * 8)) & 0x000000ff;
        hash[i + 28] = (ctx->state[7] >> (24 - i * 8)) & 0x000000ff;
    }
}

// Compute HMAC-SHA256 and convert to hex string
String computeHMAC_SHA256(const String& message, const String& key) {
    uint8_t k_ipad[64];
    uint8_t k_opad[64];
    uint8_t key_pad[64] = {0};
    uint8_t hash[32];
    
    // Copy key into key_pad
    int key_len = key.length();
    if (key_len > 64) {
        // If key is larger than block size, hash it first
        SHA256_CTX temp_ctx;
        sha256_init(&temp_ctx);
        sha256_update(&temp_ctx, (const uint8_t*)key.c_str(), key_len);
        sha256_final(&temp_ctx, key_pad);
    } else {
        memcpy(key_pad, key.c_str(), key_len);
    }
    
    // XOR key with inner/outer pads
    for (int i = 0; i < 64; ++i) {
        k_ipad[i] = key_pad[i] ^ 0x36;
        k_opad[i] = key_pad[i] ^ 0x5c;
    }
    
    // Inner SHA256 context
    SHA256_CTX inner_ctx;
    sha256_init(&inner_ctx);
    sha256_update(&inner_ctx, k_ipad, 64);
    sha256_update(&inner_ctx, (const uint8_t*)message.c_str(), message.length());
    sha256_final(&inner_ctx, hash);
    
    // Outer SHA256 context
    SHA256_CTX outer_ctx;
    sha256_init(&outer_ctx);
    sha256_update(&outer_ctx, k_opad, 64);
    sha256_update(&outer_ctx, hash, 32);
    sha256_final(&outer_ctx, hash);
    
    // Convert hash buffer to hex string
    String hexResult = "";
    for (int i = 0; i < 32; ++i) {
        if (hash[i] < 16) hexResult += "0";
        hexResult += String(hash[i], HEX);
    }
    return hexResult;
}

// =========================================================================
// CUSTOM COMPACT JSON PARSER (Zero-dependency Arduino implementation)
// =========================================================================

// Helper to extract JSON string value from key
String getJSONValue(const String& json, const String& key) {
    // Search for "key":"
    String searchPattern = "\"" + key + "\":\"";
    int index = json.indexOf(searchPattern);
    if (index == -1) {
        // Fallback for "key" : " (with whitespace)
        searchPattern = "\"" + key + "\" : \"";
        index = json.indexOf(searchPattern);
    }
    
    if (index == -1) return "";
    
    int startPos = index + searchPattern.length();
    int endPos = json.indexOf("\"", startPos);
    if (endPos == -1) return "";
    
    return json.substring(startPos, endPos);
}

bool parseNDEFJSON(const String& ndefText, CartridgeData& cart) {
    // Reset struct values
    cart.brand = "";
    cart.type = "";
    cart.batch_id = "";
    cart.signature = "";
    
    // Check if JSON wrapping exists
    if (ndefText.indexOf("{") == -1 || ndefText.indexOf("}") == -1) {
        return false;
    }
    
    // Parse keys supporting both verbose and compact keys (b, y, i, s)
    cart.brand = getJSONValue(ndefText, "brand");
    if (cart.brand == "") cart.brand = getJSONValue(ndefText, "b");
    
    cart.type = getJSONValue(ndefText, "type");
    if (cart.type == "") cart.type = getJSONValue(ndefText, "y");
    
    cart.batch_id = getJSONValue(ndefText, "batch_id");
    if (cart.batch_id == "") cart.batch_id = getJSONValue(ndefText, "i");
    
    cart.signature = getJSONValue(ndefText, "signature");
    if (cart.signature == "") cart.signature = getJSONValue(ndefText, "s");
    
    // If brand and signature exist, parsing succeeded
    return (cart.brand != "" && cart.signature != "");
}

// =========================================================================
// VERIFICATION AND TEMPERATURE PROFILE SELECTION
// =========================================================================

bool verifyCartridge(CartridgeData& cart, const String& masterSecret, bool allowUnverified) {
    if (!cart.isConnected) {
        cart.isAuthenticated = false;
        cart.baseTemp = ROOM_TEMPERATURE;
        cart.maxSafety = ROOM_TEMPERATURE;
        return false;
    }
    
    // Compute expected signature
    String payload = cart.brand + "|" + cart.type + "|" + cart.batch_id;
    String expectedSig = computeHMAC_SHA256(payload, masterSecret);
    
    // Check authenticity
    cart.isAuthenticated = (cart.signature.equalsIgnoreCase(expectedSig));
    
    // Set base temperature profile based on type
    if (cart.type.indexOf("Delta-9") != -1 || cart.type.indexOf("D9") != -1) {
        cart.baseTemp = 190.0;
        cart.maxSafety = 220.0;
    } else if (cart.type.indexOf("Delta-8") != -1 || cart.type.indexOf("D8") != -1) {
        cart.baseTemp = 185.0;
        cart.maxSafety = 210.0;
    } else if (cart.type.indexOf("CBD") != -1) {
        cart.baseTemp = 180.0;
        cart.maxSafety = 200.0;
    } else if (cart.type.indexOf("Rosin") != -1) {
        cart.baseTemp = 165.0;
        cart.maxSafety = 185.0;
    } else if (cart.type.indexOf("Distillate") != -1) {
        cart.baseTemp = 205.0;
        cart.maxSafety = 230.0;
    } else {
        // Fallback default
        cart.baseTemp = 190.0;
        cart.maxSafety = 230.0;
    }
    
    // Clamp temperature rules for unverified/counterfeit cartridges
    if (!cart.isAuthenticated) {
        if (!allowUnverified) {
            cart.baseTemp = 0.0;
            cart.maxSafety = 0.0;
            return false;
        } else {
            // Restricted safety Mode
            cart.baseTemp = min(cart.baseTemp, (float)RESTRICTED_SAFETY_LIMIT);
            cart.maxSafety = min(cart.maxSafety, (float)RESTRICTED_SAFETY_LIMIT);
        }
    }
    
    return true;
}
