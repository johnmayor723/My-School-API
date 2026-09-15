const programmeService = require("../services/programme.service");
const { sendSuccess, paginationMeta } = require("../responses/ApiResponse");

async function list(req, res) {
  const { page = 1, limit = 20, search, faculty, institution } = req.query;
  const { items, total } = await programmeService.list({ page, limit, search, faculty, institution });
  sendSuccess(res, { data: items, meta: paginationMeta({ page, limit, total }) });
}

function splitList(value) {
  return value ? value.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
}

function parseOlevel(value) {
  if (!value) return undefined;
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    // The legacy shape was a plain comma-separated subject list with no
    // grades — treat every subject as a bare credit pass (C6) for callers
    // still on that shape.
    return splitList(value)?.map((subject) => ({ subject, grade: "C6" }));
  }
  if (!Array.isArray(parsed)) return undefined;
  return parsed
    .filter((row) => row && row.subject && row.grade)
    .map((row) => ({ subject: row.subject, grade: row.grade, examType: row.exam_type || row.examType }));
}

async function search(req, res) {
  const oLevelSubjects = parseOlevel(req.query.olevel) || (req.query.olevelSubjects ? splitList(req.query.olevelSubjects)?.map((subject) => ({ subject, grade: "C6" })) : undefined);
  const utmeSubjects = splitList(req.query.utmeSubjects);
  const academicSnapshot = oLevelSubjects?.length
    ? {
        oLevelSubjects,
        utmeSubjects,
        utmeScore: req.query.utmeScore ? Number(req.query.utmeScore) : undefined,
      }
    : undefined;
  const items = await programmeService.search(req.query.q, req.query.limit ? Number(req.query.limit) : 20, academicSnapshot);
  sendSuccess(res, { data: items });
}

async function getById(req, res) {
  const result = await programmeService.getById(req.params.id);
  sendSuccess(res, { data: result });
}

module.exports = { list, search, getById };
