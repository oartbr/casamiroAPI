const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { User } = require('../models');
const { Group } = require('../models');
const { Membership } = require('../models');
const { List } = require('../models');

/**
 * Get onboarding status for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>}
 */
const getOnboardingStatus = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Check if user needs onboarding
  const needsOnboarding = !user.onboardingCompleted;

  // Get user's groups
  const memberships = await Membership.find({ user_id: userId, status: 'active' }).populate('group_id');
  const groups = memberships.map((m) => m.group_id).filter(Boolean);

  // Find personal group
  const personalGroup = groups.find((g) => g.isPersonal);

  // Find invited group (non-personal group if exists)
  const invitedGroup = groups.find((g) => !g.isPersonal);

  // Get active group
  let activeGroup = null;
  if (user.activeGroupId) {
    activeGroup = await Group.findById(user.activeGroupId);
  }

  // Get default list for active group
  let defaultList = null;
  if (activeGroup) {
    defaultList = await List.findOne({ groupId: activeGroup._id, isDefault: true });
  }

  return {
    needsOnboarding,
    onboardingCompleted: user.onboardingCompleted,
    onboardingContext: user.onboardingContext,
    personalGroup: personalGroup
      ? {
          id: personalGroup._id.toString(),
          name: personalGroup.name,
        }
      : null,
    invitedGroup: invitedGroup
      ? {
          id: invitedGroup._id.toString(),
          name: invitedGroup.name,
        }
      : null,
    activeGroup: activeGroup
      ? {
          id: activeGroup._id.toString(),
          name: activeGroup.name,
          isPersonal: activeGroup.isPersonal,
        }
      : null,
    defaultList: defaultList
      ? {
          id: defaultList._id.toString(),
          name: defaultList.name,
          itemCount: defaultList.items?.length || 0,
        }
      : null,
  };
};

/**
 * Update onboarding context
 * @param {string} userId - User ID
 * @param {string} context - Context of use (casa, casal, republica, escritorio, condominio)
 * @returns {Promise<User>}
 */
const updateOnboardingContext = async (userId, context) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const validContexts = ['casa', 'casal', 'republica', 'escritorio', 'condominio'];
  if (!validContexts.includes(context)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid onboarding context');
  }

  user.onboardingContext = context;
  if (!user.onboardingStartedAt) {
    user.onboardingStartedAt = new Date();
  }
  await user.save();

  return user;
};

/**
 * Complete onboarding
 * @param {string} userId - User ID
 * @returns {Promise<User>}
 */
const completeOnboarding = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  user.onboardingCompleted = true;
  user.onboardingCompletedAt = new Date();
  await user.save();

  return user;
};

/**
 * Check if user is activated
 * A user is considered activated if:
 * - They have interacted with at least 1 group (list, invite, or nota)
 * - They have received at least 1 contextual suggestion
 * @param {string} userId - User ID
 * @returns {Promise<Object>}
 */
const checkUserActivation = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Check if user has interacted with groups
  // Interaction means: has items in lists, has sent/received invites, or has notas
  const memberships = await Membership.find({ user_id: userId, status: 'active' });
  const groupIds = memberships.map((m) => m.group_id);

  // Check for list interactions (items added to lists)
  const lists = await List.find({ groupId: { $in: groupIds } });
  const hasListInteraction = lists.some((list) => list.items && list.items.length > 0);

  // Check for invite interactions (user has sent or received invites)
  const hasInviteInteraction =
    (await Membership.countDocuments({
      $or: [{ user_id: userId, status: 'active' }, { invited_by: userId }],
    })) > 1; // More than just their personal group membership

  // Check for nota interactions (user has scanned notas)
  // Note: This would require checking the nota model - for now, we'll assume notas exist if user has any
  // TODO: Implement actual nota check when nota model is available

  // For now, we'll consider list interaction as the main indicator
  const hasGroupInteraction = hasListInteraction || hasInviteInteraction;

  // Check for contextual suggestions
  // TODO: Implement actual suggestion tracking when suggestion system is available
  // For now, we'll assume suggestions are received if user has completed onboarding
  const hasReceivedSuggestions = user.onboardingCompleted;

  const isActivated = hasGroupInteraction && hasReceivedSuggestions;

  return {
    isActivated,
    hasGroupInteraction,
    hasReceivedSuggestions,
    details: {
      hasListInteraction,
      hasInviteInteraction,
    },
  };
};

module.exports = {
  getOnboardingStatus,
  updateOnboardingContext,
  completeOnboarding,
  checkUserActivation,
};

