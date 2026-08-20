const { Programme, InstitutionProgramme } = require("../models");
const auditService = require("./audit.service");
const { NotFoundError } = require("../errors/AppError");
const { RESOURCE_TYPES, RECORD_STATUS } = require("../config/constants");

async function list({ page = 1, limit = 20, search, faculty, institution, status = RECORD_STATUS.ACTIVE }) {
  const filter = {};
  if (faculty) filter.faculty = faculty;
  if (status) filter.status = status;
  if (search) filter.$text = { $search: search };

  let programmeIds;
  if (institution) {
    const offerings = await InstitutionProgramme.find({ institution, status: RECORD_STATUS.ACTIVE }).select("programme");
    programmeIds = offerings.map((o) => o.programme);
    filter._id = { $in: programmeIds };
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Programme.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    Programme.countDocuments(filter),
  ]);
  return { items, total };
}

async function search(query, limit = 20) {
  const filter = query ? { $text: { $search: query }, status: RECORD_STATUS.ACTIVE } : { status: RECORD_STATUS.ACTIVE };
  return Programme.find(filter).limit(limit);
}

async function getById(id) {
  const programme = await Programme.findById(id).populate("relatedProgrammes", "name slug");
  if (!programme) throw new NotFoundError("Programme not found");
  const offerings = await InstitutionProgramme.find({ programme: id, status: RECORD_STATUS.ACTIVE }).populate(
    "institution",
    "name slug state ownership institutionType"
  );
  return { programme, offeredBy: offerings.map((o) => o.institution) };
}

async function create(payload, actor, req) {
  const programme = await Programme.create({ ...payload, createdBy: actor._id, updatedBy: actor._id });
  await auditService.record({
    user: actor._id,
    action: "PROGRAMME_CREATED",
    resourceType: RESOURCE_TYPES.PROGRAMME,
    resourceId: programme._id,
    newValue: payload,
    req,
  });
  return programme;
}

async function update(id, payload, actor, req) {
  const previous = await Programme.findById(id);
  if (!previous) throw new NotFoundError("Programme not found");
  const previousSnapshot = previous.toObject();

  Object.assign(previous, payload, { updatedBy: actor._id });
  await previous.save();

  await auditService.record({
    user: actor._id,
    action: "PROGRAMME_UPDATED",
    resourceType: RESOURCE_TYPES.PROGRAMME,
    resourceId: previous._id,
    previousValue: previousSnapshot,
    newValue: payload,
    req,
  });
  return previous;
}

module.exports = { list, search, getById, create, update };
