import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from 'jsonwebtoken'

export const verifyJWT=asyncHandler(async(req,res,next)=>{
    try {
        const token=req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
        if(!token){
            throw new ApiError(401,"Unauthorized Request");
        }
    
        const decodedtoken=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
    
        const user =await User.findById(decodedtoken._id)
        .select("-password -refreshtoken")
    
        if(!user){
            //discussion
            throw new ApiError(401,"Invalid access token")
        }
        req.user=user;
        next();
    } catch (error) {
        throw new ApiError(401,error?.message||
            "Invalid access token"
        )
    }
})

export const verifyAdmin = (req, res, next) => {
    // Check if user exists (set by verifyJWT) and if role is ADMIN
    if (req.user && (req.user.role === "ADMIN" || req.user.isAdmin === true)) {
        next();
    } else {
        res.status(403).json({ message: "Access denied. Admins only." });
    }
};
