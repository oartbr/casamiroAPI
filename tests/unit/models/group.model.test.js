const mongoose = require('mongoose');
const { Group } = require('../../../src/models');

describe('Group model', () => {
  it('should include createdAt and updatedAt fields in JSON output', () => {
    const groupData = {
      name: 'Test Group',
      description: 'Test Description',
    };

    const group = new Group(groupData);
    
    // Manually set timestamps to simulate what happens when saved to DB
    group.createdAt = new Date();
    group.updatedAt = new Date();
    
    const jsonOutput = group.toJSON();
    
    // Should have id field (converted from _id)
    expect(jsonOutput).toHaveProperty('id');
    expect(jsonOutput).not.toHaveProperty('_id');
    
    // Should NOT have __v field
    expect(jsonOutput).not.toHaveProperty('__v');
    
    // Should have createdAt and updatedAt fields (our custom behavior)
    expect(jsonOutput).toHaveProperty('createdAt');
    expect(jsonOutput).toHaveProperty('updatedAt');
    
    // Should have the group data
    expect(jsonOutput).toHaveProperty('name', 'Test Group');
    expect(jsonOutput).toHaveProperty('description', 'Test Description');
  });

  it('should create a group with all required fields', () => {
    const groupData = {
      name: 'Test Group',
      description: 'Test Description',
      createdBy: new mongoose.Types.ObjectId(),
      ownerId: new mongoose.Types.ObjectId(),
    };

    const group = new Group(groupData);
    
    expect(group.name).toBe('Test Group');
    expect(group.description).toBe('Test Description');
    expect(group.createdBy).toBeDefined();
    expect(group.ownerId).toBeDefined();
    expect(group.isPersonal).toBe(false);
    expect(group.settings.allowInvitations).toBe(true);
    expect(group.settings.requireApproval).toBe(false);
  });
});
