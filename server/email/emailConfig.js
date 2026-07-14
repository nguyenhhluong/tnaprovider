export function parsePositiveInteger(value, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < min) return fallback;
  if (parsed > max) return fallback;
  return parsed;
}

export function getAttachmentLimits() {
  return {
    maxFileBytes: parsePositiveInteger(process.env.EMAIL_ATTACHMENT_MAX_FILE_BYTES, 26214400, { min: 1, max: 104857600 }),
    maxTotalBytes: parsePositiveInteger(process.env.EMAIL_ATTACHMENT_MAX_TOTAL_BYTES, 52428800, { min: 1, max: 209715200 }),
    maxFiles: parsePositiveInteger(process.env.EMAIL_ATTACHMENT_MAX_FILES, 10, { min: 1, max: 25 }),
  };
}

export function parseMultipartJsonField(value, { fieldName, code, expectArray = true }) {
  try {
    const parsed = JSON.parse(value);
    if (expectArray) {
      const result = Array.isArray(parsed) ? parsed : [parsed];
      if (result.some((item) => item == null)) {
        throw new Error("Invalid value");
      }
      return result;
    }
    return parsed;
  } catch {
    const error = new Error(`Invalid ${fieldName} field`);
    error.statusCode = 400;
    error.code = code;
    throw error;
  }
}

const VALID_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRecipient(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw Object.assign(new Error("Invalid recipient: must be an object with email"), { statusCode: 400, code: "INVALID_RECIPIENTS" });
  }
  if (typeof value.email !== "string" || !value.email.trim()) {
    throw Object.assign(new Error("Invalid recipient: email is required"), { statusCode: 400, code: "INVALID_RECIPIENTS" });
  }
  if (!VALID_EMAIL.test(value.email.trim())) {
    throw Object.assign(new Error(`Invalid recipient email: ${value.email}`), { statusCode: 400, code: "INVALID_RECIPIENTS" });
  }
  return { email: value.email.trim().toLowerCase(), name: typeof value.name === "string" ? value.name.trim() : undefined };
}

export function validateRecipients(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  return arr.map(validateRecipient);
}

export function validateReferences(value) {
  if (!Array.isArray(value)) {
    throw Object.assign(new Error("Invalid References field"), { statusCode: 400, code: "INVALID_REFERENCES" });
  }
  for (const ref of value) {
    if (typeof ref !== "string" || !ref.trim()) {
      throw Object.assign(new Error("Invalid References field: each reference must be a non-empty string"), { statusCode: 400, code: "INVALID_REFERENCES" });
    }
  }
  return value.filter(Boolean);
}
