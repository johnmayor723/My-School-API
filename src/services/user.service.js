const { User } = require("../models");
const auditService = require("./audit.service");
const { ConflictError, NotFoundError } = require("../errors/AppError");
const { RESOURCE_TYPES, USER_TYPES } = require("../config/constants");

async function list({ page = 1, limit = 20, userType, status, search }) {
  const filter = {};
  if (userType) filter.userType = userType;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    User.find(filter).populate("roles", "name").sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  return { items: items.map((u) => u.toSafeJSON()), total };
}

async function getById(id) {
  const user = await User.findById(id).populate("roles", "name permissions");
  if (!user) throw new NotFoundError("User not found");
  return user.toSafeJSON();
}

async function createStaffUser(payload, actor, req) {
  const existing = await User.findOne({ email: payload.email });
  if (existing) throw new ConflictError("An account with this email already exists");

  const user = await User.create({
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    phone: payload.phone,
    passwordHash: payload.password,
    userType: USER_TYPES.STAFF,
    roles: payload.roles,
  });

  await auditService.record({
    user: actor._id,
    action: "STAFF_USER_CREATED",
    resourceType: RESOURCE_TYPES.USER,
    resourceId: user._id,
    newValue: { email: payload.email, roles: payload.roles },
    req,
  });
  return user.toSafeJSON();
}

async function updateStaffUser(id, payload, actor, req) {
  const user = await User.findById(id);
  if (!user) throw new NotFoundError("User not found");
  if (user.userType !== USER_TYPES.STAFF) throw new NotFoundError("Staff user not found");

  const previousSnapshot = user.toSafeJSON();
  Object.assign(user, payload);
  await user.save();

  await auditService.record({
    user: actor._id,
    action: "STAFF_USER_UPDATED",
    resourceType: RESOURCE_TYPES.USER,
    resourceId: user._id,
    previousValue: previousSnapshot,
    newValue: payload,
    req,
  });
  return user.toSafeJSON();
}

module.exports = { list, getById, createStaffUser, updateStaffUser };
