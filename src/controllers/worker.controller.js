import { Worker } from "../models/worker.model.js";
import { Log } from "../models/cleanlog.model.js"; // To count jobs per worker
import { ApiError } from "../utils/ApiError.js";
import { ApiRes } from "../utils/ApiRes.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const addWorker = asyncHandler(async (req, res) => {
    const { name, phone, assigned_block } = req.body;

    if (!name || !phone) {
        throw new ApiError(400, "Name and Phone are required");
    }

    const existing = await Worker.findOne({ phone });
    if (existing) {
        throw new ApiError(409, "Worker with this phone number already exists");
    }

    const worker = await Worker.create({
        name,
        phone,
        assigned_block: assigned_block || "General",
        status: "Active"
    });

    return res.status(201).json(
        new ApiRes(201, worker, "Worker added successfully")
    );
});

const getWorkersWithStats = asyncHandler(async (req, res) => {
    const workers = await Worker.aggregate([
        {
            $lookup: {
                from: "logs", // Collection name for CleanLog
                localField: "_id",
                foreignField: "worker", // The field in Log model referencing Worker
                as: "workHistory"
            }
        },
        {
            $project: {
                name: 1,
                phone: 1,
                assigned_block: 1,
                status: 1,
                totalJobs: { $size: "$workHistory" },
                rating: { $avg: "$workHistory.rating" }
            }
        },
        { $sort: { createdAt: -1 } }
    ]);

    return res.status(200).json(
        new ApiRes(200, workers, "Workers fetched successfully")
    );
});

const toggleWorkerStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const worker = await Worker.findById(id);
    if (!worker) {
        throw new ApiError(404, "Worker not found");
    }

    worker.status = worker.status === "Active" ? "Inactive" : "Active";
    await worker.save();

    return res.status(200).json(
        new ApiRes(200, worker, `Worker status changed to ${worker.status}`)
    );
});

const getActiveWorkersList = asyncHandler(async (req, res) => {
    const workers = await Worker.find({ status: "Active" }).select("_id name");
    return res.status(200).json(
        new ApiRes(200, workers, "Active workers fetched successfully")
    );
});

const editWorker = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, phone, assigned_block } = req.body;

    const worker = await Worker.findById(id);
    if (!worker) {
        throw new ApiError(404, "Worker not found");
    }

    // Check if phone is being changed and if it conflicts with another worker
    if (phone && phone !== worker.phone) {
        const existing = await Worker.findOne({ phone, _id: { $ne: id } });
        if (existing) {
            throw new ApiError(409, "Worker with this phone number already exists");
        }
        worker.phone = phone;
    }

    // Update other fields if provided
    if (name) worker.name = name;
    if (assigned_block) worker.assigned_block = assigned_block;

    await worker.save();

    return res.status(200).json(
        new ApiRes(200, worker, "Worker updated successfully")
    );
});

// Update exports
export { addWorker, getWorkersWithStats, toggleWorkerStatus, getActiveWorkersList, editWorker };
