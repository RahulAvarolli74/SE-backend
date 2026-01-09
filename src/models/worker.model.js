import mongoose, { Schema } from 'mongoose'

const workerSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    assigned_block: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ["Active", "Inactive", "Disabled"],
        default: "Active"
    }
}, { timestamps: true });

export const Worker = mongoose.model("Worker", workerSchema);
