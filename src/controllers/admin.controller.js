import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiRes } from "../utils/ApiRes.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { User } from "../models/user.model.js";
import { Worker } from "../models/worker.model.js";
import { Log } from "../models/cleanlog.model.js";
import { Issue } from "../models/issue.model.js";

const generateAccessTokenandRefreshToken = async (id) => {
  try {
    const user = await User.findById(id);
    if (!user) {
      throw new ApiError(404, "User not found while generating tokens");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshtoken = refreshToken;

    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Token generation error:", error);
    throw new ApiError(
      500,
      "Something went wrong while generating access & refresh tokens"
    );
  }
};

const createStudentRoom = asyncHandler(async (req, res) => {
  const { room_no, password } = req.body;
  const adminHostel = req.user.hostelName; // Scoped to admin's assigned hostel

  if (!room_no || !password) {
    throw new ApiError(400, "room_no and password are required");
  }

  // Scoped check: Room must be unique within this specific hostel
  const existing = await User.findOne({ 
    room_no: room_no.toUpperCase(), 
    hostelName: adminHostel, 
    role: "STUDENT" 
  });

  if (existing) {
    throw new ApiError(409, `Room ${room_no} already exists in ${adminHostel}`);
  }

  const user = await User.create({
    room_no: room_no.toUpperCase(),
    password,
    hostelName: adminHostel, // Tag the new room with the admin's hostel
    role: "STUDENT",
  });

  return res.status(201).json(
    new ApiRes(
      201,
      {
        user: {
          _id: user._id,
          room_no: user.room_no,
          role: user.role,
          hostelName: user.hostelName
        },
      },
      "Student room credentials created successfully"
    )
  );
});

const loginadmin = asyncHandler(async (req, res) => {
  console.log("LOGIN DATA RECEIVED:", req.body);
  const { username, password, hostelName } = req.body; // Retrieve hostelName from frontend
  
  if (!username || !password || !hostelName) {
    throw new ApiError(400, "Username, password, and hostel selection are required");
  }

  // Find admin within specific hostel
  const userexist = await User.findOne({ username, hostelName, role: "ADMIN" });
  if (!userexist) {
    throw new ApiError(400, "Admin user does not exist in the selected hostel");
  }

  const ispassvalid = await userexist.ispasswordCorrect(password);
  if (!ispassvalid) {
    throw new ApiError(400, "Invalid Credentials.");
  }

  const { accessToken, refreshToken } =
    await generateAccessTokenandRefreshToken(userexist._id);

  const loggedinuser = await User.findById(userexist._id).select("-password");

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiRes(
        200,
        {
          user: loggedinuser,
          accessToken,
          refreshToken,
        },
        "Admin logged in successfully"
      )
    );
});

const logoutadmin = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshtoken: 1,
      },
    },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiRes(200, {}, "User logged out successfully"));
});


const getAdminDashboard = asyncHandler(async (req, res) => {
  const hostel = req.user.hostelName; // Identify which hostel we are reporting for
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const lastWeekStart = new Date();
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  // 1. Scoped Counters
  const [
    totalWorkers,
    cleaningsToday,
    weeklySubmissions,
    pendingIssues 
  ] = await Promise.all([
    Worker.countDocuments({ hostelName: hostel }),
    Log.countDocuments({ hostelName: hostel, createdAt: { $gte: todayStart } }),
    Log.countDocuments({ hostelName: hostel, createdAt: { $gte: lastWeekStart } }),
    Issue.countDocuments({ hostelName: hostel, status: { $in: ["Open", "In Progress"] } })
  ]);

  // 2. Scoped Worker Performance Chart
  const workerPerformance = await Log.aggregate([
    { $match: { hostelName: hostel } }, // Filter by hostel first
    {
      $group: {
        _id: "$worker", 
        count: { $sum: 1 }
      }
    },
    {
      $lookup: { 
        from: "workers", 
        localField: "_id",
        foreignField: "_id",
        as: "workerInfo"
      }
    },
    { $unwind: "$workerInfo" },
    {
      $project: {
        name: "$workerInfo.name",
        count: 1,
        _id: 0
      }
    },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);

  // 3. Scoped Task Distribution Chart
  const taskDistribution = await Log.aggregate([
    { $match: { hostelName: hostel } }, // Filter by hostel
    { $unwind: "$cleaningType" },
    { 
      $group: { 
        _id: "$cleaningType", 
        value: { $sum: 1 } 
      }
    },
    {
      $project: {
        name: "$_id",
        value: 1,
        _id: 0
      }
    }
  ]);

  // 4. Scoped Weekly Trend Chart
  const weeklyTrend = await Log.aggregate([
    {
      $match: {
        hostelName: hostel,
        createdAt: { $gte: lastWeekStart }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // 5. Scoped Recent Issues List
  const recentIssues = await Issue.find({
    hostelName: hostel,
    status: { $in: ["Open", "In Progress"] }
  })
  .sort({ createdAt: -1 })
  .limit(5)
  .select("room_no issueType description status createdAt");

  return res.status(200).json(
    new ApiRes(
      200,
      {
        stats: {
          totalWorkers,
          cleaningsToday,
          weeklySubmissions,
          pendingIssues
        },
        charts: {
          workerPerformance,
          taskDistribution,
          weeklyTrend
        },
        recentIssues: recentIssues,
        hostelName: hostel // NEW: Include hostel name in response
      },
      `Admin Dashboard data for ${hostel} fetched successfully`
    )
  );
});

export {
  createStudentRoom,
  loginadmin,
  logoutadmin,
  getAdminDashboard 
};