import mongoose, { Schema } from 'mongoose'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const userSchema = new Schema(
  {
    username: {
      type: String,
      trim: true,
      
    }, 
    room_no: {
      type: String,
      trim: true,
      uppercase: true
    },
    password: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["STUDENT", "ADMIN"],
      required: true,
    },
    refreshtoken: {
      type: String,
    },
    
  },
  { timestamps: true }
);

// userSchema.pre("validate", function (next) {
//   if (this.role === "STUDENT" && !this.room_no) {
//     return next(new Error("room_number required for STUDENT role"));
//   }
//   if (this.role === "ADMIN" && !this.username) {
//     return next(new Error("username required for ADMIN role"));
//   }
//   next();
// });


userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.ispasswordCorrect=async function(password){
    return  await bcrypt.compare(password,this.password)
}


userSchema.methods.generateAccessToken= function(){
    return jwt.sign(
        {
            _id:this._id,
            // username:this.username,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken= function(){
    return jwt.sign(
        {
            _id:this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User=mongoose.model("User",userSchema);