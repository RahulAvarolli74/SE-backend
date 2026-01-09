import mongoose, { Schema } from "mongoose";

const cleanlogSchema = new Schema(
  {
    room_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    worker: {
      type: Schema.Types.ObjectId,
      ref: "Worker", 
      required: true,
    },
    cleaningType: {
      type: [String], 
      required: true, 
      enum: ["Sweeping", "Room Cleaning", "Bathroom Cleaning", "Corridor Cleaning"],
    },
    cleanstatus: {
      type: String,
      enum: ["Pending", "Completed", "Verified"], 
      default: "Pending",
      required: true,
    },
    room_no: {
       type: String,
       required: true 
    },
    feedback: {
      type: String,
      trim:true ,
      default: "" 
    },
    rating: {
      type: Number, 
      min: 1, 
      max: 5,
      default: null 
    },
    image: {
      type: String, 
      default: ""
    }
  },
  { 
    timestamps: true 
  }
);

export const Log = mongoose.model("Log", cleanlogSchema);