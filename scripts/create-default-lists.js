const mongoose = require('mongoose');
const { List, Group } = require('../src/models');
require('dotenv').config();

async function createDefaultLists() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/node-boilerplate');
    console.log('Connected to MongoDB');

    // Get all groups
    const groups = await Group.find({});
    console.log(`Found ${groups.length} groups`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const group of groups) {
      // Check if group already has a default list
      const existingDefaultList = await List.findOne({
        groupId: group._id,
        isDefault: true
      });

      if (existingDefaultList) {
        console.log(`Group "${group.name}" already has a default list`);
        skippedCount++;
        continue;
      }

      // Create default list for the group
      const defaultList = await List.create({
        name: 'Default List',
        description: 'Default list for this group',
        groupId: group._id,
        isDefault: true,
        createdBy: group.createdBy || group.ownerId, // Use group creator as list creator
        settings: {
          allowItemDeletion: true,
          requireApprovalForItems: false,
        },
      });

      console.log(`Created default list for group "${group.name}" (ID: ${defaultList._id})`);
      createdCount++;
    }

    console.log(`\nSummary:`);
    console.log(`- Created ${createdCount} default lists`);
    console.log(`- Skipped ${skippedCount} groups (already had default lists)`);
    console.log(`- Total groups processed: ${groups.length}`);

  } catch (error) {
    console.error('Error creating default lists:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
createDefaultLists();
