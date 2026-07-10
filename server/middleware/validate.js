const VALID_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_PHONE = /^[\d\s+()-]{8,20}$/;
const VALID_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
const VALID_ROLES = ["owner", "admin", "manager", "worker", "client"];
const VALID_PRIORITIES = ["low", "medium", "high", "critical"];
const VALID_TIMESHEET_STATUS = ["pending", "submitted", "approved", "rejected"];
const VALID_LEAD_TEMPS = ["cold", "warm", "hot"];
const VALID_LEAD_STATUSES = ["new", "contacted", "qualified", "proposal", "won", "lost"];
const VALID_PROJECT_STATUSES = ["active", "on_hold", "completed", "cancelled"];
const VALID_MAINTENANCE_STATUSES = ["open", "in_progress", "resolved", "closed"];
const VALID_LEAD_ACTIVITY_TYPES = ["note", "call", "email", "meeting", "site_visit", "status_change"];
const VALID_FOLLOWUP_STATUSES = ["pending", "done", "cancelled", "overdue"];
const VALID_QUOTE_REQUEST_STATUSES = ["draft", "submitted", "reviewing", "quoted", "converted", "cancelled"];
const VALID_QUOTE_STATUSES = ["draft", "sent", "accepted", "rejected", "expired", "converted"];
const VALID_TASK_STATUSES = ["todo", "in_progress", "blocked", "done", "cancelled"];
const VALID_TASK_PRIORITIES = ["low", "medium", "high", "urgent"];
const VALID_DOC_VISIBILITY = ["internal", "client"];
const VALID_DOC_ENTITY_TYPES = ["lead", "project", "quote", "client", "general"];
const VALID_REMINDER_TYPES = ["lead_followup", "quote_expiry", "task_due", "project_due", "maintenance_pending"];

function isPresent(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  return true;
}

function isNumeric(value) {
  if (typeof value === "number" && isFinite(value)) return true;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return false;
    const parsed = Number(trimmed);
    return isFinite(parsed);
  }
  return false;
}

function toFiniteNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
}

export function validate(schema) {
  return (req, res, next) => {
    const errors = {};
    const validated = {};

    for (const [field, rules] of Object.entries(schema)) {
      const rawValue = req.body?.[field];

      // ---- required check ----
      if (rules.required) {
        if (!isPresent(rawValue)) {
          errors[field] = rules.label ? `${rules.label} is required` : `${field} is required`;
          continue;
        }
      } else if (!isPresent(rawValue)) {
        // Optional and missing — skip validation
        continue;
      }

      // ---- type-based parsing ----
      let parsedValue = rawValue;

      if (rules.trim && typeof parsedValue === "string") {
        parsedValue = parsedValue.trim();
      }

      if (rules.type === "string") {
        if (typeof parsedValue !== "string") {
          errors[field] = rules.label ? `${rules.label} must be a string` : `${field} must be a string`;
          continue;
        }
      } else if (rules.type === "boolean") {
        if (typeof parsedValue === "boolean") {
          // valid
        } else if (parsedValue === "true" || parsedValue === "1") {
          parsedValue = true;
        } else if (parsedValue === "false" || parsedValue === "0") {
          parsedValue = false;
        } else {
          errors[field] = rules.label ? `${rules.label} must be a boolean` : `${field} must be a boolean`;
          continue;
        }
      } else if (rules.type === "number") {
        if (!isNumeric(parsedValue)) {
          errors[field] = rules.label ? `${rules.label} must be a number` : `${field} must be a number`;
          continue;
        }
        parsedValue = toFiniteNumber(parsedValue);

        if (rules.minimum !== undefined && parsedValue < rules.minimum) {
          errors[field] = rules.label ? `${rules.label} must be at least ${rules.minimum}` : `${field} must be at least ${rules.minimum}`;
          continue;
        }
        if (rules.maximum !== undefined && parsedValue > rules.maximum) {
          errors[field] = rules.label ? `${rules.label} must be at most ${rules.maximum}` : `${field} must be at most ${rules.maximum}`;
          continue;
        }
        if (rules.integer && !Number.isInteger(parsedValue)) {
          errors[field] = rules.label ? `${rules.label} must be a whole number` : `${field} must be a whole number`;
          continue;
        }
        if (rules.decimalPlaces !== undefined) {
          const multiplier = Math.pow(10, rules.decimalPlaces);
          if (Math.round(parsedValue * multiplier) !== parsedValue * multiplier) {
            errors[field] = rules.label ? `${rules.label} must have at most ${rules.decimalPlaces} decimal places` : `${field} must have at most ${rules.decimalPlaces} decimal places`;
            continue;
          }
        }
      } else if (rules.type === "email") {
        if (typeof parsedValue !== "string" || !VALID_EMAIL.test(parsedValue)) {
          errors[field] = rules.label ? `Invalid ${rules.label.toLowerCase()}` : `Invalid ${field}`;
          continue;
        }
        parsedValue = parsedValue.toLowerCase().trim();
      } else if (rules.type === "phone") {
        if (typeof parsedValue !== "string" || !VALID_PHONE.test(parsedValue)) {
          errors[field] = rules.label ? `Invalid ${rules.label.toLowerCase()}` : `Invalid ${field}`;
          continue;
        }
      } else if (rules.type === "enum") {
        if (rules.enum && !rules.enum.includes(parsedValue)) {
          errors[field] = rules.label ? `Invalid ${rules.label.toLowerCase()}` : `Invalid ${field}`;
          continue;
        }
      } else if (rules.type === "array") {
        if (!Array.isArray(parsedValue)) {
          errors[field] = rules.label ? `${rules.label} must be an array` : `${field} must be an array`;
          continue;
        }
        if (rules.minLength !== undefined && parsedValue.length < rules.minLength) {
          errors[field] = rules.label ? `${rules.label} must have at least ${rules.minLength} items` : `${field} must have at least ${rules.minLength} items`;
          continue;
        }
      } else if (rules.type === "object") {
        if (typeof parsedValue !== "object" || parsedValue === null || Array.isArray(parsedValue)) {
          errors[field] = rules.label ? `${rules.label} must be an object` : `${field} must be an object`;
          continue;
        }
      } else if (rules.type === "date") {
        if (typeof parsedValue !== "string" || !VALID_ISO_DATE.test(parsedValue)) {
          errors[field] = rules.label ? `Invalid ${rules.label.toLowerCase()}, expected YYYY-MM-DD` : `Invalid ${field}, expected YYYY-MM-DD`;
          continue;
        }
      } else if (rules.type === "datetime") {
        if (typeof parsedValue !== "string" || !VALID_ISO_DATETIME.test(parsedValue)) {
          errors[field] = rules.label ? `Invalid ${rules.label.toLowerCase()}, expected ISO datetime` : `Invalid ${field}, expected ISO datetime`;
          continue;
        }
      } else if (rules.type === "uuid") {
        if (typeof parsedValue !== "string" || !VALID_UUID.test(parsedValue)) {
          errors[field] = rules.label ? `Invalid ${rules.label.toLowerCase()}` : `Invalid ${field}`;
          continue;
        }
      }

      // ---- string length checks ----
      if (rules.type === "string" && typeof parsedValue === "string") {
        if (rules.minLength !== undefined && parsedValue.length < rules.minLength) {
          errors[field] = rules.label
            ? `${rules.label} must be at least ${rules.minLength} characters`
            : `${field} must be at least ${rules.minLength} characters`;
          continue;
        }
        if (rules.maxLength !== undefined && parsedValue.length > rules.maxLength) {
          errors[field] = rules.label
            ? `${rules.label} must be at most ${rules.maxLength} characters`
            : `${field} must be at most ${rules.maxLength} characters`;
          continue;
        }
      }

      // ---- password validation ----
      if (rules.password && typeof parsedValue === "string" && parsedValue.length >= 1) {
        if (parsedValue.length < 10) {
          errors[field] = "Password must be at least 10 characters";
        } else if (!/[A-Z]/.test(parsedValue)) {
          errors[field] = "Password must contain at least one uppercase letter";
        } else if (!/[a-z]/.test(parsedValue)) {
          errors[field] = "Password must contain at least one lowercase letter";
        } else if (!/[0-9]/.test(parsedValue)) {
          errors[field] = "Password must contain at least one number";
        }
        if (errors[field]) continue;
      }

      // ---- custom validator ----
      if (rules.validate && typeof rules.validate === "function") {
        const customError = rules.validate(parsedValue);
        if (customError) {
          errors[field] = customError;
          continue;
        }
      }

      validated[field] = parsedValue;
    }

    // ---- unknown field handling (warn only, don't reject) ----
    const allowedFields = new Set(Object.keys(schema));
    for (const field of Object.keys(req.body || {})) {
      if (!allowedFields.has(field)) {
        if (process.env.DEBUG_VALIDATE) {
          console.warn(`Unexpected field in validation: ${field}`);
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      // Return 400 for backward compatibility (was 422)
      const errorMessages = Object.values(errors).join("; ");
      return res.status(400).json({
        error: errorMessages,
        fields: errors,
      });
    }

    req.validatedBody = validated;
    // Backward compatibility: merge validated values into req.body (preserve non-validated fields)
    req.body = { ...req.body, ...validated };
    next();
  };
}

export const schemas = {
  login: {
    email: { required: true, type: "email", label: "Email" },
    password: { required: true, minLength: 1, type: "string", label: "Password" },
  },
  changePassword: {
    currentPassword: { required: true, type: "string", label: "Current password" },
    newPassword: { required: true, password: true, type: "string", label: "New password" },
  },
  createUser: {
    email: { required: true, type: "email", label: "Email" },
    name: { required: true, minLength: 2, type: "string", label: "Name" },
    role: { required: true, type: "enum", enum: VALID_ROLES, label: "Role" },
    password: { required: true, password: true, type: "string", label: "Password" },
  },
  forgotPassword: {
    email: { required: true, type: "email", label: "Email" },
  },
  resetPassword: {
    token: { required: true, type: "string", label: "Token" },
    password: { required: true, password: true, type: "string", label: "Password" },
  },
  acceptInvite: {
    token: { required: true, type: "string", label: "Token" },
    password: { required: true, password: true, type: "string", label: "Password" },
  },
  resendInvite: {
    email: { required: true, type: "email", label: "Email" },
  },
  inviteUser: {
    email: { required: true, type: "email", label: "Email" },
    name: { required: true, minLength: 2, type: "string", label: "Name" },
    role: { required: true, type: "enum", enum: VALID_ROLES.filter(r => r !== 'owner'), label: "Role" },
  },
  createLead: {
    name: { required: true, minLength: 2, type: "string", label: "Name" },
    email: { required: true, type: "email", label: "Email" },
  },
  createProject: {
    title: { required: true, minLength: 2, type: "string", label: "Title" },
    clientName: { required: true, minLength: 2, type: "string", label: "Client name" },
  },
  createTimesheet: {
    projectId: { required: true, type: "string", label: "Project" },
    workDate: { required: true, type: "date", label: "Work date" },
    totalHours: { required: true, type: "number", minimum: 0, label: "Total hours" },
  },
  createMaintenance: {
    title: { required: true, minLength: 2, type: "string", label: "Title" },
    priority: { required: true, type: "enum", enum: VALID_PRIORITIES, label: "Priority" },
  },

  createLeadActivity: {
    type: { required: true, type: "enum", enum: VALID_LEAD_ACTIVITY_TYPES, label: "Type" },
    title: { required: true, minLength: 2, type: "string", label: "Title" },
  },
  createLeadFollowup: {
    title: { required: true, minLength: 2, type: "string", label: "Title" },
    due_at: { required: true, type: "datetime", label: "Due date" },
  },
  createQuoteRequest: {
    title: { required: true, minLength: 2, type: "string", label: "Title" },
  },
  createQuote: {
    title: { required: true, minLength: 2, type: "string", label: "Title" },
  },
  createQuoteItem: {
    description: { required: true, minLength: 1, type: "string", label: "Description" },
    unit_price: { required: true, type: "number", minimum: 0, label: "Unit price" },
  },
  createTask: {
    project_id: { required: true, type: "uuid", label: "Project" },
    title: { required: true, minLength: 2, type: "string", label: "Title" },
  },
  createTaskComment: {
    message: { required: true, minLength: 1, type: "string", label: "Message" },
  },
  createDocument: {
    title: { required: true, minLength: 2, type: "string", label: "Title" },
    entity_type: { required: true, type: "string", label: "Entity type" },
  },
  createDocumentFolder: {
    name: { required: true, minLength: 2, type: "string", label: "Folder name" },
    entity_type: { required: true, type: "enum", enum: VALID_DOC_ENTITY_TYPES, label: "Entity type" },
  },
  createProposalTemplate: {
    name: { required: true, minLength: 2, type: "string", label: "Name" },
  },
  createProposalVersion: {
    quote_id: { required: true, type: "uuid", label: "Quote" },
    title: { required: true, minLength: 2, type: "string", label: "Title" },
  },
  createReminderRule: {
    name: { required: true, minLength: 2, type: "string", label: "Name" },
    type: { required: true, type: "enum", enum: VALID_REMINDER_TYPES, label: "Type" },
  },

  // Pay Rules schema
  updatePayRules: {
    ordinary_hours_per_day: { type: "number", minimum: 0, label: "Ordinary hours per day" },
    ordinary_hours_per_week: { type: "number", minimum: 0, label: "Ordinary hours per week" },
    overtime_daily_after_hours: { type: "number", minimum: 0, label: "Overtime daily threshold" },
    overtime_weekly_after_hours: { type: "number", minimum: 0, label: "Overtime weekly threshold" },
    overtime_rate_multiplier: { type: "number", minimum: 1, label: "Overtime multiplier" },
    double_time_after_hours: { type: "number", nullable: true, minimum: 0, label: "Double time threshold" },
    double_time_multiplier: { type: "number", minimum: 1, label: "Double time multiplier" },
    unpaid_break_minutes_default: { type: "number", integer: true, minimum: 0, label: "Unpaid break minutes" },
  },

  // Hourly rate update
  updateHourlyRate: {
    hourlyRate: { required: true, type: "number", minimum: 0.01, maximum: 500, label: "Hourly rate" },
  },

  // Break minutes must allow zero
  updateBreakMinutes: {
    break_minutes: { required: true, type: "number", integer: true, minimum: 0, label: "Break minutes" },
  },

  // Quote item price: must allow zero
  quoteItemPrice: {
    unit_price: { required: true, type: "number", minimum: 0, label: "Unit price" },
    quantity: { type: "number", minimum: 0, label: "Quantity" },
  },

  // Progress update (0-100)
  updateProgress: {
    progress_percent: { required: true, type: "number", integer: true, minimum: 0, maximum: 100, label: "Progress" },
  },

  // Discount (0 or greater)
  updateDiscount: {
    discount_value: { type: "number", minimum: 0, label: "Discount" },
    discount_type: { type: "enum", enum: ["none", "percentage", "fixed"], label: "Discount type" },
  },
};
