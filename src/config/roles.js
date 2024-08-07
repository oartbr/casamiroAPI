const allRoles = {
  user: [],
  admin: ['getUsers', 'manageUsers'],
};

const enumRoles = {
  ADMIN: 1,
  USER: 2,
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
  enumRoles,
};
