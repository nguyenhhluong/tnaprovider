import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/roles.js";
import { validate, schemas } from "../../middleware/validate.js";
import { submitContactRequest, listContactRequests, getContactRequest, updateContactRequest, convertContactRequestToLead } from "./contactRequests.service.js";
import { submitContactRequest as submitSchema, updateContactRequest as updateSchema } from "./contactRequests.schemas.js";

const router = Router();

router.post("/contact", validate(submitSchema), async (req, res) => {
  try {
    const result = submitContactRequest(req.body);
    const emailDeliveryStatus = await getEmailDeliveryForContact(result.id);
    res.status(200).json({
      success: true,
      referenceNumber: result.referenceNumber,
      data: result,
      emailDelivery: emailDeliveryStatus === 'sent' ? 'sent' : 'pending',
    });
  } catch (err) {
    console.error("Error submitting contact request:", err.message);
    if (err.message === "Privacy consent is required") {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: "Submission failed" });
  }
});

async function getEmailDeliveryForContact(contactId) {
  try {
    const { listEmailJobs } = await import('../../email/emailJobService.js');
    const jobs = listEmailJobs({ relatedEntityType: 'contact_request', relatedEntityId: contactId, limit: 10 });
    const allSent = jobs.data.every(j => j.status === 'SENT');
    const anySent = jobs.data.some(j => j.status === 'SENT');
    if (allSent && jobs.data.length > 0) return 'sent';
    if (anySent) return 'partial';
    return 'pending';
  } catch {
    return 'pending';
  }
}

router.get("/contact-requests", requireAuth, requireRole("owner", "admin"), (req, res) => {
  try {
    const result = listContactRequests(req.query, req.user.userId, req.user.role);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("Error listing contact requests:", err.message);
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to list contact requests" } });
  }
});

router.get("/contact-requests/:id", requireAuth, requireRole("owner", "admin"), (req, res) => {
  try {
    const row = getContactRequest(req.params.id);
    if (!row) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Contact request not found" } });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error("Error getting contact request:", err.message);
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to get contact request" } });
  }
});

router.patch("/contact-requests/:id", requireAuth, requireRole("owner", "admin"), validate(updateSchema), (req, res) => {
  try {
    const row = updateContactRequest(req.params.id, req.validatedBody);
    if (!row) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Contact request not found" } });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error("Error updating contact request:", err.message);
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update contact request" } });
  }
});

router.post("/contact-requests/:id/convert", requireAuth, requireRole("owner", "admin"), (req, res) => {
  try {
    const result = convertContactRequestToLead(req.params.id, req.user.userId);
    if (!result) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Contact request not found" } });
    res.json({ success: true, data: result.lead, alreadyConverted: result.alreadyConverted });
  } catch (err) {
    console.error("Error converting contact request to lead:", err.message);
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to convert contact request to lead" } });
  }
});

export default router;
