import { LidoSDKCore } from '@lidofinance/lido-ethereum-sdk';
import { createPublicClient, http } from 'viem';
import { mainnet, hoodi } from 'viem/chains';
import { LidoSDKCm, LidoSDKCsm } from './packages/csm-sdk/dist/esm/index.js';

// ============================================
// TEST CONFIGURATION - Edit methods here
// ============================================
async function testMethods(sdkCsm, sdkCm) {
  console.log('📊 Calling SDK methods...\n');

  // Call the methods you want to test

  // Get queue batches for each priority with smaller limit
  const count = await sdkCm.parameters.getCurvesCount();
  const params0 = await sdkCm.parameters.getAll(0n);
  const params1 = await sdkCm.parameters.getAll(1n);

  return {
    count,
    params0,
    params1,
  };
}
// ============================================

// Main test function
async function runTest() {
  console.log('🚀 Testing CSM SDK Methods');
  console.log('==========================\n');

  const rpcUrl = 'http://127.0.0.1:8545';
  const chain = hoodi;

  try {
    // Initialize public client for mainnet
    console.log('🔧 Initializing SDK...');
    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    // Initialize Lido SDK Core
    const core = new LidoSDKCore({
      chainId: chain.id,
      rpcProvider: publicClient,
    });

    // Initialize CSM SDK
    const sdkCsm = new LidoSDKCsm({ core });
    const sdkCm = new LidoSDKCm({ core });

    console.log('✅ SDK initialized successfully\n');

    // Call the test methods
    const results = await testMethods(sdkCsm, sdkCm);

    // Display results
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('Results:');
    console.log(JSON.stringify(results, serializeBigInt, 2));

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

function serializeBigInt(_key, value) {
  return typeof value === 'bigint' ? value.toString() : value;
}

// Run the test
runTest()
  .then(() => {
    console.log('\n🏁 All done!');
  })
  .catch((error) => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
