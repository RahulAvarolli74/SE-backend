import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiRes } from "../utils/ApiRes.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { User } from "../models/user.model.js";

import { Worker } from "../models/worker.model.js";
// import { Feedback } from "../models/feedback.model.js"; // This handles "Issues"
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

  if (!room_no || !password) {
    throw new ApiError(400, "room_no and password are required");
  }

  const existing = await User.findOne({ room_no, role: "STUDENT" });
  if (existing) {
    throw new ApiError(409, "Room already exists in the database");
  }

  const user = await User.create({
    room_no,
    password,
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
        },
      },
      "Student room credentials created successfully"
    )
  );
});

const loginadmin = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    throw new ApiError(400, "All fields are required");
  }

  const userexist = await User.findOne({ username });
  if (!userexist) {
    throw new ApiError(400, "User does not exist");
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
        "User logged in successfully"
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
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const lastWeekStart = new Date();
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const [
    totalWorkers,
    cleaningsToday,
    weeklySubmissions,
    pendingIssues 
  ] = await Promise.all([
    Worker.countDocuments(),
    Log.countDocuments({ createdAt: { $gte: todayStart } }),
    Log.countDocuments({ createdAt: { $gte: lastWeekStart } }),
    Issue.countDocuments({ status: { $in: ["Open", "In Progress"] } })
  ]);

  // 3. Worker Performance Chart
  const workerPerformance = await Log.aggregate([
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

  // 4. Task Distribution Chart
  // Uses field 'cleaningType' (Array of Strings) from your Log schema
  const taskDistribution = await Log.aggregate([
    { $unwind: "$cleaningType" }, // Deconstructs the array (e.g. ["Sweeping", "Mopping"] becomes 2 docs)
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

  // 5. Weekly Trend Chart
  const weeklyTrend = await Log.aggregate([
    {
      $match: {
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

  // 6. Recent Issues List (From ISSUE model)
  const recentIssues = await Issue.find({
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
        recentIssues: recentIssues
      },
      "Admin Dashboard data fetched successfully"
    )
  );
});

export {
  createStudentRoom,
  loginadmin,
  logoutadmin,
  getAdminDashboard 
};