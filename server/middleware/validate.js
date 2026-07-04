const VALID_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_PHONE = /^[\d\s+()-]{8,20}$/;
const VALID_ROLES = ["owner", "admin", "manager", "worker", "client"];
const VALID_PRIORITIES = ["low", "medium", "high", "critical"];
const VALID_TIMESHEET_STATUS = ["pending", "submitted", "approved", "rejected"];
const VALID_LEAD_TEMPS = ["cold", "warm", "hot"];
const VALID_LEAD_STATUSES = ["new", "contacted", "qualified", "proposal", "won", "lost"];
const VALID_PROJECT_STATUSES = ["active", "on_hold", "completed", "cancelled"];
const VALID_MAINTENANCE_STATUSES = ["open", "in_progress", "resolved", "closed"];

export function validate(schema) {
  return (req, res, next) => {
    const errors = {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body?.[field];

      if (rules.required && (!value || (typeof value === "string" && !value.trim()))) {
        errors[field] = rules.label ? `${rules.label} is required` : `${field} is required`;
        continue;
      }

      if (!value && !rules.required) continue;

      if (rules.type === "email" && !VALID_EMAIL.test(value)) {
        errors[field] = rules.label ? `Invalid ${rules.label.toLowerCase()}` : `Invalid ${field}`;
      }

      if (rules.type === "phone" && !VALID_PHONE.test(value)) {
        errors[field] = rules.label ? `Invalid ${rules.label.toLowerCase()}` : `Invalid ${field}`;
      }

      if (rules.enum && !rules.enum.includes(value)) {
        errors[field] = rules.label ? `Invalid ${rules.label.toLowerCase()}` : `Invalid ${field}`;
      }

      if (rules.minLength && typeof value === "string" && value.trim().length < rules.minLength) {
        errors[field] = rules.label
          ? `${rules.label} must be at least ${rules.minLength} characters`
          : `${field} must be at least ${rules.minLength} characters`;
      }

      if (rules.password && typeof value === "string" && value.length >= 1) {
        if (value.length < 10) {
          errors[field] = "Password must be at least 10 characters";
        } else if (!/[A-Z]/.test(value)) {
          errors[field] = "Password must contain at least one uppercase letter";
        } else if (!/[a-z]/.test(value)) {
          errors[field] = "Password must contain at least one lowercase letter";
        } else if (!/[0-9]/.test(value)) {
          errors[field] = "Password must contain at least one number";
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: "Validation failed", fields: errors });
    }

    next();
  };
}

export const schemas = {
  login: {
    email: { required: true, type: "email", label: "Email" },
    password: { required: true, minLength: 1, label: "Password" },
  },
  changePassword: {
    currentPassword: { required: true, label: "Current password" },
    newPassword: { required: true, password: true, label: "New password" },
  },
  createUser: {
    email: { required: true, type: "email", label: "Email" },
    name: { required: true, minLength: 2, label: "Name" },
    role: { required: true, enum: VALID_ROLES, label: "Role" },
    password: { required: true, password: true, label: "Password" },
  },
  forgotPassword: {
    email: { required: true, type: "email", label: "Email" },
  },
  resetPassword: {
    token: { required: true, label: "Token" },
    password: { required: true, password: true, label: "Password" },
  },
  acceptInvite: {
    token: { required: true, label: "Token" },
    password: { required: true, password: true, label: "Password" },
  },
  resendInvite: {
    email: { required: true, type: "email", label: "Email" },
  },
  inviteUser: {
    email: { required: true, type: "email", label: "Email" },
    name: { required: true, minLength: 2, label: "Name" },
    role: { required: true, enum: VALID_ROLES.filter(r => r !== 'owner'), label: "Role" },
  },
  createLead: {
    name: { required: true, minLength: 2, label: "Name" },
    email: { required: true, type: "email", label: "Email" },
  },
  createProject: {
    title: { required: true, minLength: 2, label: "Title" },
    clientName: { required: true, minLength: 2, label: "Client name" },
  },
  createTimesheet: {
    projectId: { required: true, label: "Project" },
    workDate: { required: true, label: "Work date" },
    totalHours: { required: true, label: "Total hours" },
  },
  createMaintenance: {
    title: { required: true, minLength: 2, label: "Title" },
    priority: { required: true, enum: VALID_PRIORITIES, label: "Priority" },
  },
};
