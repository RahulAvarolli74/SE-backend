import { Router } from "express";
import { verifyJWT, verifyAdmin } from '../middlewares/auth.middleware.js';

// 1. Admin Auth & Dashboard Imports
import {
    loginadmin,
    logoutadmin,
    createStudentRoom,
    getAdminDashboard
} from '../controllers/admin.controller.js';

// 2. Log Imports
import { getAllLogs } from "../controllers/log.controller.js";

// 3. Worker Imports
import {
    getWorkersWithStats,
    toggleWorkerStatus,
    addWorker,
    editWorker
} from "../controllers/worker.controller.js";

// 4. Issue Imports (CORRECTED: All issue logic comes from issue.controller.js)
import {
    getAllIssues,
    resolveIssue,
    getIssuesByRoom
} from "../controllers/issue.controller.js";

const router = Router();

router.route('/login').post(loginadmin);



// Auth
router.route('/logout').post(verifyJWT, verifyAdmin, logoutadmin);

// Dashboard & Setup
router.route('/dashboard').get(verifyJWT, verifyAdmin, getAdminDashboard);
router.route('/create-room').post(verifyJWT, verifyAdmin, createStudentRoom);

// Logs Management
router.route('/logs').get(verifyJWT, verifyAdmin, getAllLogs);

// Worker Management
router.route('/workers').post(verifyJWT, verifyAdmin, addWorker);
router.route('/workers/:id').patch(verifyJWT, verifyAdmin, editWorker);
router.route('/workers-stats').get(verifyJWT, verifyAdmin, getWorkersWithStats);
router.route('/workers/:id/toggle').patch(verifyJWT, verifyAdmin, toggleWorkerStatus);

// Issue Management
router.route('/issues').get(verifyJWT, verifyAdmin, getAllIssues);
router.route('/issues/room/:room_no').get(verifyJWT, verifyAdmin, getIssuesByRoom);

// Note: Ensure your frontend sends 'status' and 'adminResponse' in the body
// and the controller uses req.params.issueId (if defined as /:issueId) 
// OR req.body.issueId. 
// Based on this route path, the ID is in the URL:
router.route('/issues/:issueId/resolve').patch(verifyJWT, verifyAdmin, resolveIssue);

export default router;