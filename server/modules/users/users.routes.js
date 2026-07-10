import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole, requireSelfOrRole } from "../../middleware/roles.js";
import { validate } from "../../middleware/validate.js";
import {
  createUser,
  updateUserProfile,
  updateUserRole,
  updateUserStatus,
  updateUserHourlyRate,
  getUserById,
  listUsers,
  deleteUser,
} from "./users.service.js";
import {
  createUser as createUserSchema,
  updateProfile as updateProfileSchema,
  updateRole as updateRoleSchema,
  updateStatus as updateStatusSchema,
  updateHourlyRate as updateHourlyRateSchema,
} from "./users.schemas.js";

const router = Router();

router.use(requireAuth);

router.get("/", requireRole("owner", "admin"), (req, res) => {
  try {
    const users = listUsers();
    res.json({ success: true, data: users });
  } catch (err) {
    console.error("Error listing users:", err.message);
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to list users" } });
  }
});

router.get("/:id", requireRole("owner"), (req, res) => {
  try {
    const user = getUserById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "User not found" } });
    res.json({ success: true, data: user });
  } catch (err) {
    console.error("Error getting user:", err.message);
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to get user" } });
  }
});

router.post("/", requireRole("owner"), validate(createUserSchema), (req, res) => {
  try {
    const { email, name, role, password, hourlyRate, mustChangePassword } = req.validatedBody;
    const user = createUser(email, name, role, password, hourlyRate, mustChangePassword);
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    if (err.message.includes("not allowed") || err.message.includes("Hourly rate") || err.message.includes("required")) {
      return res.status(400).json({ error: err.message });
    }
    if (err.message === "Email already exists") {
      return res.status(409).json({ error: err.message });
    }
    console.error("Error creating user:", err.message);
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create user" } });
  }
});

router.patch("/:id/profile", requireSelfOrRole("owner"), validate(updateProfileSchema), (req, res) => {
  try {
    const user = updateUserProfile(req.params.id, req.validatedBody);
    res.json({ success: true, data: user });
  } catch (err) {
    if (err.message === "User not found") {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: err.message } });
    }
    if (err.message === "Email already in use") {
      return res.status(409).json({ error: err.message });
    }
    console.error("Error updating user profile:", err.message);
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update profile" } });
  }
});

router.patch("/:id/role", requireRole("owner"), validate(updateRoleSchema), (req, res) => {
  try {
    const user = updateUserRole(req.params.id, req.validatedBody.role, req.user.userId);
    res.json({ success: true, data: user });
  } catch (err) {
    if (err.message === "User not found") {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: err.message } });
    }
    if (err.message === "Cannot change role of the last active owner") {
      return res.status(400).json({ error: err.message });
    }
    console.error("Error updating user role:", err.message);
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update role" } });
  }
});

router.patch("/:id/status", requireRole("owner"), validate(updateStatusSchema), (req, res) => {
  try {
    const user = updateUserStatus(req.params.id, req.validatedBody.status, req.user.userId);
    res.json({ success: true, data: user });
  } catch (err) {
    if (err.message === "User not found") {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: err.message } });
    }
    if (err.message === "Cannot disable the last active owner") {
      return res.status(400).json({ error: err.message });
    }
    console.error("Error updating user status:", err.message);
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update status" } });
  }
});

router.patch("/:id/hourly-rate", requireRole("owner"), validate(updateHourlyRateSchema), (req, res) => {
  try {
    const user = updateUserHourlyRate(req.params.id, req.validatedBody.hourlyRate, req.user.userId);
    res.json({ success: true, data: user });
  } catch (err) {
    if (err.message === "User not found") {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: err.message } });
    }
    if (err.message === "Cannot set hourly rate for client users") {
      return res.status(400).json({ error: err.message });
    }
    if (err.message.includes("Hourly rate must be between")) {
      return res.status(400).json({ error: err.message });
    }
    console.error("Error updating hourly rate:", err.message);
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update hourly rate" } });
  }
});

router.delete("/:id", requireRole("owner"), (req, res) => {
  try {
    deleteUser(req.params.id, req.user.userId);
    res.json({ success: true });
  } catch (err) {
    if (err.message === "User not found") {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: err.message } });
    }
    if (err.message === "Cannot delete the last active owner") {
      return res.status(400).json({ error: err.message });
    }
    console.error("Error deleting user:", err.message);
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to delete user" } });
  }
});

export default router;
