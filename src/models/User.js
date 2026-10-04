const { Schema, model } = require("mongoose");
const bcrypt = require("bcryptjs");
const env = require("../config/env");
const { USER_TYPES, USER_STATUS, PERMISSIONS } = require("../config/constants");

const userSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    // Students may sign up with email OR phone (see the pre-validate check
    // below); STAFF always has email (admin console login is password-based).
    // Both are sparse-unique so phone-only and email-only accounts coexist.
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address"],
    },
    phone: { type: String, unique: true, sparse: true, trim: true },
    // Only STAFF (admin console) logs in with a password now — Student
    // accounts are OTP-only, so this is meaningless for them going forward.
    // Kept required-for-staff rather than dropped, to avoid an index/schema
    // migration on a live database for a field that's simply unused elsewhere.
    passwordHash: {
      type: String,
      required: function requiredForStaffOnly() {
        return this.userType === USER_TYPES.STAFF;
      },
      select: false,
    },
    userType: { type: String, enum: Object.values(USER_TYPES), required: true },
    roles: [{ type: Schema.Types.ObjectId, ref: "Role" }],
    status: { type: String, enum: Object.values(USER_STATUS), default: USER_STATUS.ACTIVE },

    // Student-only — Staff accounts leave this unset.
    dateOfBirth: { type: Date },

    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },

    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.index({ userType: 1 });
userSchema.index({ status: 1 });

userSchema.pre("validate", function requireAnIdentifier(next) {
  if (this.userType === USER_TYPES.STAFF && !this.email) {
    return next(new Error("Staff accounts require an email"));
  }
  if (!this.email && !this.phone) {
    return next(new Error("An account needs an email or a phone number"));
  }
  next();
});

userSchema.pre("save", async function preSave(next) {
  if (!this.isModified("passwordHash") || !this.passwordHash) return next();
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
  delete obj.__v;
  return obj;
};

module.exports = model("User", userSchema);
