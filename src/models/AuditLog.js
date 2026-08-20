const { Schema, model } = require("mongoose");
const { RESOURCE_TYPES } = require("../config/constants");

const auditLogSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", default: null },
    action: { type: String, required: true },
    resourceType: { type: String, enum: Object.values(RESOURCE_TYPES), required: true },
    resourceId: { type: Schema.Types.ObjectId },
    previousValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    ip: { type: String },
    userAgent: { type: String },
    correlationId: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ user: 1, createdAt: -1 });

module.exports = model("AuditLog", auditLogSchema);
