const VALID_ROLES = ["owner", "admin", "manager", "worker", "client"];

export const createUser = {
  email: { required: true, type: "email", label: "Email" },
  name: { required: true, minLength: 2, type: "string", label: "Name" },
  role: { required: true, type: "enum", enum: VALID_ROLES, label: "Role" },
  password: { required: true, password: true, type: "string", label: "Password" },
  hourlyRate: { type: "number", minimum: 0.01, maximum: 500, label: "Hourly rate" },
  mustChangePassword: { type: "boolean", label: "Must change password" },
};

export const updateProfile = {
  name: { type: "string", minLength: 2, label: "Name", trim: true },
  email: { type: "email", label: "Email" },
};

export const updateRole = {
  role: { required: true, type: "enum", enum: VALID_ROLES, label: "Role" },
};

export const updateStatus = {
  status: { required: true, type: "enum", enum: ["active", "disabled"], label: "Status" },
};

export const updateHourlyRate = {
  hourlyRate: { required: true, type: "number", minimum: 0.01, maximum: 500, label: "Hourly rate" },
};

export const changePassword = {
  currentPassword: { required: true, type: "string", label: "Current password" },
  newPassword: { required: true, password: true, type: "string", label: "New password" },
};
