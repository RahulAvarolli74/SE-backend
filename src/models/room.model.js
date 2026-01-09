import mongoose, { Schema } from "mongoose";

const roomSchema = new Schema(
  {
    room_no: {
      type: String,         
      required: true,
      trim: true,
      unique: true
    },
    block: {
      type: String,     
      required: true,
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,         
      default: "ACTIVE",
      trim: true,
    },
    lock_days: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

export const Room = mongoose.model("Room", roomSchema);
