const { Institution, InstitutionProgramme } = require("../models");
const auditService = require("./audit.service");
const { NotFoundError } = require("../errors/AppError");
const { RESOURCE_TYPES, RECORD_STATUS } = require("../config/constants");

async function list({ page = 1, limit = 20, state, ownership, institutionType, search, status = RECORD_STATUS.ACTIVE }) {
  const filter = {};
  if (state) filter.state = state;
  if (ownership) filter.ownership = ownership;
  if (institutionType) filter.institutionType = institutionType;
  if (status) filter.status = status;
  if (search) filter.$text = { $search: search };

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Institution.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    Institution.countDocuments(filter),
  ]);
  return { items, total };
}

async function getById(id) {
  const institution = await Institution.findById(id);
  if (!institution) throw new NotFoundError("Institution not found");
  const offerings = await InstitutionProgramme.find({ institution: id, status: RECORD_STATUS.ACTIVE }).populate(
    "programme",
    "name slug faculty degreeType"
  );
  return { institution, programmesOffered: offerings.map((o) => o.programme) };
}

async function create(payload, actor, req) {
  const institution = await Institution.create({ ...payload, createdBy: actor._id, updatedBy: actor._id });
  await auditService.record({
    user: actor._id,
    action: "INSTITUTION_CREATED",
    resourceType: RESOURCE_TYPES.INSTITUTION,
    resourceId: institution._id,
    newValue: payload,
    req,
  });
  return institution;
}

async function update(id, payload, actor, req) {
  const previous = await Institution.findById(id);
  if (!previous) throw new NotFoundError("Institution not found");
  const previousSnapshot = previous.toObject();

  const { metadata, ...rest } = payload;
  Object.assign(previous, rest, { updatedBy: actor._id });
  if (metadata) {
    const merged = { ...previousSnapshot.metadata, ...metadata };
    // competitivenessManuallySet is server-derived, never client-set directly: presence of
    // competitivenessIndex in the payload marks it manual, null clears it back to auto.
    if (Object.prototype.hasOwnProperty.call(metadata, "competitivenessIndex")) {
      merged.competitivenessManuallySet = metadata.competitivenessIndex !== null;
      if (metadata.competitivenessIndex === null) merged.competitivenessIndex = undefined;
    } else {
      merged.competitivenessManuallySet = previousSnapshot.metadata?.competitivenessManuallySet;
    }
    previous.metadata = merged;
  }
  await previous.save();

  await auditService.record({
    user: actor._id,
    action: "INSTITUTION_UPDATED",
    resourceType: RESOURCE_TYPES.INSTITUTION,
    resourceId: previous._id,
    previousValue: previousSnapshot,
    newValue: payload,
    req,
  });
  return previous;
}

async function remove(id, actor, req) {
  const institution = await Institution.findById(id);
  if (!institution) throw new NotFoundError("Institution not found");
  institution.status = RECORD_STATUS.INACTIVE;
  institution.updatedBy = actor._id;
  await institution.save();

  await auditService.record({
    user: actor._id,
    action: "INSTITUTION_DEACTIVATED",
    resourceType: RESOURCE_TYPES.INSTITUTION,
    resourceId: institution._id,
    req,
  });
  return institution;
}

async function addProgrammeOffering(institutionId, programmeId, actor, req) {
  const offering = await InstitutionProgramme.findOneAndUpdate(
    { institution: institutionId, programme: programmeId },
    { $set: { status: RECORD_STATUS.ACTIVE } },
    { upsert: true, new: true }
  );
  await auditService.record({
    user: actor._id,
    action: "INSTITUTION_PROGRAMME_OFFERING_ADDED",
    resourceType: RESOURCE_TYPES.INSTITUTION,
    resourceId: institutionId,
    newValue: { programmeId },
    req,
  });
  return offering;
}

module.exports = { list, getById, create, update, remove, addProgrammeOffering };
