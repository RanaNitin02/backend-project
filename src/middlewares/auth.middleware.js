import jwt from "jsonwebtoken"
import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

// _ means it(res) is not in use
export const verifyJWT = asyncHandler(async(req, _, next) => {

    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
    
        if( !token ){
            throw new apiError(401, "unauthorization request")
        }
    
        const decodedToken = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if( !user ){
            throw new apiError(401, "Invalid Access Token")
        }
    
        req.user = user;
        next();
    } catch (error) {
        throw new apiError(401, error?.message || "Invalid Access Token") 
    }
})