export const submitContactRequest = {
  firstName: { required: true, type: "string", minLength: 1, label: "First name", trim: true },
  lastName: { required: true, type: "string", minLength: 1, label: "Last name", trim: true },
  email: { required: true, type: "email", label: "Email" },
  phone: { required: true, type: "phone", label: "Phone" },
  service: { required: true, type: "string", minLength: 1, label: "Service", trim: true },
  location: { required: true, type: "string", minLength: 1, label: "Location", trim: true },
  budget: { type: "string", label: "Budget", trim: true },
  targetDate: { type: "string", label: "Target date", trim: true },
  message: { required: true, type: "string", minLength: 10, maxLength: 5000, label: "Message", trim: true },
  requestCallback: { type: "boolean", label: "Request callback" },
  callbackTime: { type: "string", label: "Callback time", trim: true },
  privacyConsent: { required: true, type: "boolean", label: "Privacy consent" },
  source: { type: "string", label: "Source", trim: true },
};

export const updateContactRequest = {
  status: { type: "enum", enum: ["new", "contacted", "quoted", "won", "lost", "archived"], label: "Status" },
  priority: { type: "enum", enum: ["low", "normal", "high", "urgent"], label: "Priority" },
  internal_notes: { type: "string", label: "Internal notes", trim: true },
  assigned_to_user_id: { type: "uuid", label: "Assigned user" },
  last_contacted_at: { type: "string", label: "Last contacted at" },
};
