const allRoles = {
  user: [],
  admin: ['getUsers', 'manageUsers'],
  guest: [], // GUEST users have no rights - they can't access protected routes
};

const enumRoles = {
  ADMIN: 1,
  USER: 2,
  GUEST: 3,
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
  enumRoles,
};
