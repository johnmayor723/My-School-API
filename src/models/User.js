const { Schema, model } = require("mongoose");
const bcrypt = require("bcryptjs");
const env = require("../config/env");
const { USER_TYPES, USER_STATUS, PERMISSIONS } = require("../config/constants");

const userSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address"],
    },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    userType: { type: String, enum: Object.values(USER_TYPES), required: true },
    roles: [{ type: Schema.Types.ObjectId, ref: "Role" }],
    status: { type: String, enum: Object.values(USER_STATUS), default: USER_STATUS.ACTIVE },

    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    emailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },

    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.index({ userType: 1 });
userSchema.index({ status: 1 });

userSchema.pre("save", async function preSave(next) {
  if (!this.isModified("passwordHash")) return next();
  if (this.passwordHash.startsWith("$2")) return next(); // already hashed
  this.passwordHash = await bcrypt.hash(this.passwordHash, env.bcryptSaltRounds);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.methods.getPermissions = function getPermissions() {
  if (this.userType !== USER_TYPES.STAFF) return [];
  const roles = (this.roles || []).filter((r) => r && r.permissions);
  const permissionSet = new Set();
  for (const role of roles) {
    for (const permission of role.permissions) permissionSet.add(permission);
  }
  return Array.from(permissionSet);
};

userSchema.methods.hasPermission = function hasPermission(permission) {
  const perms = this.getPermissions();
  return perms.includes(PERMISSIONS.ALL) || perms.includes(permission);
};

// Hard identity check (not permission-based) for actions that must stay
// locked to the super admin even if a custom role is ever granted a
// permission like MANAGE_USERS — e.g. creating/editing other admin accounts,
// where a permission-only gate could be used to self-escalate.
userSchema.methods.isSuperAdmin = function isSuperAdmin() {
  if (this.userType !== USER_TYPES.STAFF) return false;
  return (this.roles || []).some((role) => role && role.name === "SUPER_ADMIN");
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toObject({ virtuals: true });
  delete obj.passwordHash;
  delete obj.passwordResetTokenHash;
  delete obj.passwordResetExpires;
  delete obj.emailVerificationTokenHash;
  delete obj.emailVerificationExpires;
  delete obj.__v;
  return obj;
};

module.exports = model("User", userSchema);
