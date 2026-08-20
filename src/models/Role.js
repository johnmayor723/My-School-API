const { Schema, model } = require("mongoose");
const { PERMISSIONS } = require("../config/constants");

const roleSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, uppercase: true },
    description: { type: String, trim: true },
    permissions: {
      type: [String],
      enum: Object.values(PERMISSIONS),
      default: [],
    },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true }
);

roleSchema.methods.hasPermission = function hasPermission(permission) {
  return this.permissions.includes(PERMISSIONS.ALL) || this.permissions.includes(permission);
};

module.exports = model("Role", roleSchema);
