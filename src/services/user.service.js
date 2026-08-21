const { User, StudentProfile, Role } = require("../models");
const auditService = require("./audit.service");
const { ConflictError, NotFoundError, ForbiddenError, BusinessRuleError } = require("../errors/AppError");
const { RESOURCE_TYPES, USER_TYPES, PERMISSIONS } = require("../config/constants");

// Admin/staff accounts control platform access, including who else can be
// made an admin, so their lifecycle is locked to the super admin specifically
// rather than to a delegable permission (see User.isSuperAdmin's docstring).
function assertCanManageStaff(actor) {
  if (!actor.isSuperAdmin()) {
    throw new ForbiddenError("Only the super admin can create, edit or remove admin accounts");
  }
}

function assertCanManageStudents(actor) {
  if (!actor.hasPermission(PERMISSIONS.MANAGE_STUDENTS)) {
    throw new ForbiddenError("You do not have permission to manage student accounts");
  }
}

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

async function create(payload, actor, req) {
  const existing = await User.findOne({ email: payload.email });
  if (existing) throw new ConflictError("An account with this email already exists");

  if (payload.userType === USER_TYPES.STAFF) {
    assertCanManageStaff(actor);
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

  assertCanManageStudents(actor);
  const user = await User.create({
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    phone: payload.phone,
    passwordHash: payload.password,
    userType: USER_TYPES.STUDENT,
  });
  await StudentProfile.create({
    user: user._id,
    fullName: `${payload.firstName} ${payload.lastName}`,
  });
  await auditService.record({
    user: actor._id,
    action: "STUDENT_USER_CREATED",
    resourceType: RESOURCE_TYPES.USER,
    resourceId: user._id,
    newValue: { email: payload.email },
    req,
  });
  return user.toSafeJSON();
}

async function update(id, payload, actor, req) {
  const user = await User.findById(id).populate("roles", "name permissions");
  if (!user) throw new NotFoundError("User not found");

  if (user.userType === USER_TYPES.STAFF) {
    assertCanManageStaff(actor);
  } else {
    assertCanManageStudents(actor);
    // Students don't have roles — silently ignore if a caller sends any
    // rather than letting a student account pick up staff permissions.
    delete payload.roles;
  }

  const previousSnapshot = user.toSafeJSON();
  Object.assign(user, payload);
  await user.save();

  await auditService.record({
    user: actor._id,
    action: user.userType === USER_TYPES.STAFF ? "STAFF_USER_UPDATED" : "STUDENT_USER_UPDATED",
    resourceType: RESOURCE_TYPES.USER,
    resourceId: user._id,
    previousValue: previousSnapshot,
    newValue: payload,
    req,
  });
  return user.toSafeJSON();
}

async function remove(id, actor, req) {
  const user = await User.findById(id).populate("roles", "name");
  if (!user) throw new NotFoundError("User not found");

  if (user.userType === USER_TYPES.STAFF) {
    assertCanManageStaff(actor);
    if (String(user._id) === String(actor._id)) {
      throw new BusinessRuleError("You cannot delete your own account");
    }
    if (user.isSuperAdmin()) {
      const superAdminRole = await Role.findOne({ name: "SUPER_ADMIN" });
      const remaining = await User.countDocuments({
        userType: USER_TYPES.STAFF,
        roles: superAdminRole._id,
        _id: { $ne: user._id },
      });
      if (remaining === 0) {
        throw new BusinessRuleError("Cannot delete the last remaining super admin account");
      }
    }
  } else {
    assertCanManageStudents(actor);
    await StudentProfile.deleteOne({ user: user._id });
  }

  await user.deleteOne();

  await auditService.record({
    user: actor._id,
    action: user.userType === USER_TYPES.STAFF ? "STAFF_USER_DELETED" : "STUDENT_USER_DELETED",
    resourceType: RESOURCE_TYPES.USER,
    resourceId: user._id,
    previousValue: user.toSafeJSON(),
    req,
  });
}

module.exports = { list, getById, create, update, remove };
