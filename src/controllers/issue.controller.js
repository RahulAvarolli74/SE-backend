import { Issue } from "../models/issue.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiRes } from "../utils/ApiRes.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// STUDENT: Raise Issue
const raiseIssue = asyncHandler(async (req, res) => {
    const { issueType, description } = req.body;
    // Extracting room and hostel details from the authenticated student
    const { room_no, _id: room_id, hostelName } = req.user; 

    if (!issueType || !description) {
        throw new ApiError(400, "Issue Type and Description are required");
    }

    // 1. Handle Image Upload logic preserved from previous version
    let imageLocalPath;
    if (req.file && req.file.path) {
        imageLocalPath = req.file.path;
    }

    let imageURL = "";
    if (imageLocalPath) {
        const uploadResponse = await uploadOnCloudinary(imageLocalPath);
        if (uploadResponse) {
            imageURL = uploadResponse.url;
        }
    }

    // 2. Create Issue tagged with the specific hostel for correct dashboard reporting
    const newIssue = await Issue.create({
        room_id, 
        room_no,
        hostelName, // PRESERVED: Field to identify which hostel this issue belongs to
        issueType,
        description,
        image: imageURL, 
        status: "Open"
    });

    return res.status(201).json(
        new ApiRes(201, newIssue, "Issue raised successfully")
    );
});

// STUDENT: Get My Issues
const getMyIssues = asyncHandler(async (req, res) => {
    const { room_no, hostelName } = req.user; // Scoping to current student's hostel
    
    // Scoped search ensures room numbers that exist in multiple hostels don't leak data
    const issues = await Issue.find({ 
        room_no, 
        hostelName 
    }).sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiRes(200, issues, "My issues fetched successfully")
    );
});

// ADMIN: Get Issues for a Specific Room in the Admin's Hostel
const getIssuesByRoom = asyncHandler(async (req, res) => {
    const { room_no } = req.params; 
    const hostelName = req.user.hostelName; // Scoping to the logged-in Admin's hostel

    if (!room_no) {
        throw new ApiError(400, "Room number is required");
    }

    const issues = await Issue.find({ 
        room_no, 
        hostelName 
    }).sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiRes(200, issues, `Issues for room ${room_no} in ${hostelName} fetched`)
    );
});

// ADMIN: Get ALL Issues for the Admin's specific Hostel
const getAllIssues = asyncHandler(async (req, res) => {
    const hostelName = req.user.hostelName; // Identifies which hostel's issues to fetch

    const issues = await Issue.find({ hostelName }).sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiRes(200, issues, `All issues for ${hostelName} fetched successfully`)
    );
});

// ADMIN: Resolve/Update an Issue within their assigned Hostel
const resolveIssue = asyncHandler(async (req, res) => {
    const issueId = req.params.issueId || req.body.issueId; 
    const { status, adminResponse } = req.body;
    const hostelName = req.user.hostelName; // Security check: Admin can only update their hostel's issues

    if (!issueId || !status) {
        throw new ApiError(400, "Issue ID and Status are required");
    }

    // Find and update only if the issue ID and hostelName match the admin's scope
    const updatedIssue = await Issue.findOneAndUpdate(
        { _id: issueId, hostelName },
        {
            $set: {
                status: status, 
                adminResponse: adminResponse || "" 
            }
        },
        { new: true }
    );

    if (!updatedIssue) {
        throw new ApiError(404, "Issue not found or unauthorized to update");
    }

    return res.status(200).json(
        new ApiRes(200, updatedIssue, "Issue updated successfully")
    );
});

export { 
    raiseIssue, 
    getMyIssues, 
    getIssuesByRoom, 
    getAllIssues, 
    resolveIssue 
};