import { Worker } from "../models/worker.model.js";
import { Log } from "../models/cleanlog.model.js"; 
import { ApiError } from "../utils/ApiError.js";
import { ApiRes } from "../utils/ApiRes.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const addWorker = asyncHandler(async (req, res) => {
    const { name, phone, assigned_block } = req.body;
    // NEW: Scope to the admin's hostel
    const hostelName = req.user.hostelName; 

    if (!name || !phone) {
        throw new ApiError(400, "Name and Phone are required");
    }

    // UPDATED: Check for existing phone number WITHIN the same hostel
    const existing = await Worker.findOne({ phone, hostelName });
    if (existing) {
        throw new ApiError(409, "Worker with this phone number already exists in this hostel");
    }

    const worker = await Worker.create({
        name,
        phone,
        hostelName, // NEW: Save the hostel identity
        assigned_block: assigned_block || "General",
        status: "Active"
    });

    return res.status(201).json(
        new ApiRes(201, worker, "Worker added successfully")
    );
});

const getWorkersWithStats = asyncHandler(async (req, res) => {
    const hostelName = req.user.hostelName;

    const workers = await Worker.aggregate([
        {
            // NEW: Only get workers belonging to this admin's hostel
            $match: { hostelName: hostelName }
        },
        {
            $lookup: {
                from: "logs", 
                localField: "_id",
                foreignField: "worker", 
                as: "workHistory"
            }
        },
        {
            $project: {
                name: 1,
                phone: 1,
                assigned_block: 1,
                status: 1,
                hostelName: 1,
                totalJobs: { $size: "$workHistory" },
                rating: { $avg: "$workHistory.rating" }
            }
        },
        { $sort: { createdAt: -1 } }
    ]);

    return res.status(200).json(
        new ApiRes(200, workers, `Workers for ${hostelName} fetched successfully`)
    );
});

const toggleWorkerStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hostelName = req.user.hostelName;

    // UPDATED: Ensure admin can only toggle workers in their hostel
    const worker = await Worker.findOne({ _id: id, hostelName });
    if (!worker) {
        throw new ApiError(404, "Worker not found in your hostel");
    }

    worker.status = worker.status === "Active" ? "Inactive" : "Active";
    await worker.save();

    return res.status(200).json(
        new ApiRes(200, worker, `Worker status changed to ${worker.status}`)
    );
});

const getActiveWorkersList = asyncHandler(async (req, res) => {
    // UPDATED: Only fetch active workers for the current user's hostel
    const workers = await Worker.find({ 
        status: "Active", 
        hostelName: req.user.hostelName 
    }).select("_id name");

    return res.status(200).json(
        new ApiRes(200, workers, "Active workers fetched successfully")
    );
});

const editWorker = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, phone, assigned_block } = req.body;
    const hostelName = req.user.hostelName;

    // UPDATED: Ensure update is scoped to the admin's hostel
    const worker = await Worker.findOne({ _id: id, hostelName });
    if (!worker) {
        throw new ApiError(404, "Worker not found in your hostel");
    }

    if (phone && phone !== worker.phone) {
        // Check conflicts within the same hostel
        const existing = await Worker.findOne({ phone, hostelName, _id: { $ne: id } });
        if (existing) {
            throw new ApiError(409, "Worker with this phone number already exists in this hostel");
        }
        worker.phone = phone;
    }

    if (name) worker.name = name;
    if (assigned_block) worker.assigned_block = assigned_block;

    await worker.save();

    return res.status(200).json(
        new ApiRes(200, worker, "Worker updated successfully")
    );
});

export { addWorker, getWorkersWithStats, toggleWorkerStatus, getActiveWorkersList, editWorker };