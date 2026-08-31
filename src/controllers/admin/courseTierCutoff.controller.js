const service = require("../../services/courseTierCutoff.service");
const { sendSuccess, paginationMeta } = require("../../responses/ApiResponse");
const { INSTITUTION_TIERS } = require("../../config/constants");

async function tiers(req, res) {
  sendSuccess(res, { data: INSTITUTION_TIERS });
}

async function listForProgramme(req, res) {
  const rows = await service.listForProgramme(req.params.programmeId);
  sendSuccess(res, { data: rows });
}

async function upsertForProgramme(req, res) {
  const rows = await service.upsertForProgramme(req.params.programmeId, req.body.cutoffs, req.user, req);
  sendSuccess(res, { message: "Cutoffs saved", data: rows });
}

async function summary(req, res) {
  const programmeIds = req.query.programmeIds ? req.query.programmeIds.split(",").filter(Boolean) : undefined;
  const result = await service.summary({ programmeIds });
  sendSuccess(res, { data: result });
}

async function gaps(req, res) {
  const { page = 1, limit = 20, search, institutionTier, admissionSession } = req.query;
  const result = await service.gaps({
    page,
    limit,
    search,
    institutionTier: institutionTier !== undefined ? Number(institutionTier) : undefined,
    admissionSession,
  });
  sendSuccess(res, {
    data: result.items,
    meta: {
      ...paginationMeta({ page: Number(page), limit: Number(limit), total: result.total }),
      totalOfferings: result.totalOfferings,
      admissionSession: result.admissionSession,
    },
  });
}

async function byInstitution(req, res) {
  const { page = 1, limit = 20, search } = req.query;
  const result = await service.listForInstitution(
    req.params.institutionId,
    { page, limit, search },
    req.user,
    req
  );
  sendSuccess(res, {
    data: result.items,
    meta: {
      ...paginationMeta({ page: Number(page), limit: Number(limit), total: result.total }),
      institution: result.institution,
      institutionTier: result.institutionTier,
      tierLabel: result.tierLabel,
    },
  });
}

module.exports = { tiers, listForProgramme, upsertForProgramme, summary, gaps, byInstitution };
