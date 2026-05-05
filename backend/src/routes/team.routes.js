import express from 'express';
import {
  getTeamMembers,
  getTeamMember,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  toggleTeamMemberStatus,
  resetTeamMemberPassword,
  resendInvite
} from '../controllers/team.controller.js';
import { protect, restrictTo, checkCompanyAccess } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Team management routes - Company SuperAdmin only
router.get(
  '/company/:companyId/team',
  checkCompanyAccess,
  getTeamMembers
);

router.get(
  '/company/:companyId/team/:id',
  checkCompanyAccess,
  getTeamMember
);

router.post(
  '/company/:companyId/team',
  checkCompanyAccess,
  createTeamMember
);

router.put(
  '/company/:companyId/team/:id',
  checkCompanyAccess,
  updateTeamMember
);

router.delete(
  '/company/:companyId/team/:id',
  checkCompanyAccess,
  deleteTeamMember
);

router.put(
  '/company/:companyId/team/:id/status',
  checkCompanyAccess,
  toggleTeamMemberStatus
);

router.post(
  '/company/:companyId/team/:id/reset-password',
  checkCompanyAccess,
  resetTeamMemberPassword
);

router.post(
  '/company/:companyId/team/:id/resend-invite',
  checkCompanyAccess,
  resendInvite
);

export default router;