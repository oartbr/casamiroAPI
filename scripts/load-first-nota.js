/**
 * Script to load the first pending nota and process its items into canonical products
 * Usage: node scripts/load-first-nota.js
 */

// Set NODE_ENV if not already set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const config = require('../src/config/config');
const { notaService } = require('../src/services');

async function loadFirstNota() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('Connected to MongoDB');

    // Find and load the first pending nota
    const filter = { status: 'pending' };
    const options = { sort: { createdAt: 1 }, limit: 1 };
    
    console.log('\n🔍 Looking for first pending nota...');
    const result = await notaService.loadNota(filter, options);
    
    if (result && result.existing) {
      const nota = result.existing;
      console.log('\n✅ Nota loaded successfully!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📄 Nota ID: ${nota._id}`);
      console.log(`🔗 URL: ${nota.url}`);
      console.log(`📅 Purchase Date: ${nota.purchaseDate || 'N/A'}`);
      console.log(`💰 Total: R$ ${nota.total || 0}`);
      console.log(`🏪 Vendor: ${nota.vendorName || 'N/A'}`);
      console.log(`📦 Items: ${nota.items ? nota.items.length : 0}`);
      console.log(`✅ Status: ${nota.status}`);
      
      if (nota.items && nota.items.length > 0) {
        console.log('\n📋 Items found:');
        nota.items.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.product || item.name || 'Unknown'} - Qty: ${item.quantity || 'N/A'} - Price: R$ ${item.totalPrice || item.unitPrice || 'N/A'}`);
        });
        
        console.log('\n⏳ Processing items into canonical products...');
        console.log('   (This happens asynchronously in the background)');
        console.log('   Check the canonicalproducts collection to see results.');
      } else {
        console.log('\n⚠️  No items found in this nota.');
      }
      
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } else {
      console.log('\n⚠️  No pending notas found in the collection.');
    }

    // Wait a bit to allow async processing to start
    console.log('\n⏳ Waiting 3 seconds for background processing to start...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Close MongoDB connection
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    console.log('\n💡 Tip: Check the canonicalproducts collection to see the processed products.');
    
  } catch (error) {
    console.error('\n❌ Error loading nota:', error);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the script
loadFirstNota()
  .then(() => {
    console.log('\n✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Unhandled error:', error);
    process.exit(1);
  });

