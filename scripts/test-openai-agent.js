/**
 * Script to test OpenAI Agent classification directly
 * Usage: node scripts/test-openai-agent.js
 */

// Set NODE_ENV if not already set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const config = require('../src/config/config');
const { canonicalProductService } = require('../src/services');

async function testOpenAIAgent() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('✅ Connected to MongoDB\n');

    // Test product data (simulating a nota item)
    const testProduct = {
      product: 'Leite Italac 1L',
      code: '7891234567890',
      quantity: 2,
      unitPrice: 4.99,
      totalPrice: 9.98,
    };

    console.log('🧪 Testing OpenAI Agent with sample product:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(JSON.stringify(testProduct, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('⏳ Calling OpenAI Agent...\n');

    // Test the classification
    const result = await canonicalProductService.createOrUpdateFromNotaItem(testProduct, {
      userId: 'test-user',
      groupId: null,
      useOpenAI: true,
    });

    console.log('✅ Classification successful!\n');
    console.log('📦 Canonical Product Result:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📝 Canonical Name: ${result.canonical_name}`);
    console.log(`🏷️  Brand: ${result.brand || 'N/A'}`);
    console.log(`📂 Category: ${result.category || 'N/A'} (key: ${result.category_key || 'N/A'})`);
    console.log(`📋 Subcategory: ${result.subcategory || 'N/A'}`);
    console.log(`📦 Package Size: ${result.package_size || 'N/A'}`);
    console.log(`📏 Unit: ${result.unit || 'N/A'}`);
    console.log(`🔢 Quantity: ${result.quantity || 'N/A'}`);
    console.log(`🏷️  GTIN: ${result.gtin || 'N/A'}`);
    console.log(`🍷 Alcoholic: ${result.is_alcoholic !== null ? result.is_alcoholic : 'N/A'}`);
    console.log(`🌱 Fresh Produce: ${result.is_fresh_produce !== null ? result.is_fresh_produce : 'N/A'}`);
    console.log(`⚖️  Bulk: ${result.is_bulk !== null ? result.is_bulk : 'N/A'}`);
    console.log(`📊 Confidence: ${result.confidence}`);
    console.log(`🔌 Source: ${result.source}`);
    console.log(`📚 Synonyms (${result.synonyms.length}): ${result.synonyms.slice(0, 5).join(', ')}${result.synonyms.length > 5 ? '...' : ''}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Close MongoDB connection
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    console.log('\n✨ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error testing OpenAI Agent:', error);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testOpenAIAgent()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Unhandled error:', error);
    process.exit(1);
  });

