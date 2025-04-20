import  { uploadOnCloudinary } from '../utils/cloudinary.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { apiResponse } from '../utils/apiResponse.js';
import { apiError } from '../utils/apiError.js'
import User from '../models/user.model.js'

const registerUser = asyncHandler(async (req, res) => {

  // get all details from user
  // validate - not empty feilds
  // check if user already exists - email
  // check for images, avatar, etc
  // upload them to cloudinary, avatar
  // check usr object - create entry in db
  // remove password and refresh token from resopnse
  // check for user creation
  // return response
  
    const {username, password, email, fullName} = req.body;
    console.log("user deatls are: ", username, password, email, fullName);

    if( 
      [username, password, email, fullName].some(field => field?.trim() === "")
    ){
      throw new apiError(400, "All feilds are required!")
    }

    const existingUser = User.findOne({
      $or: [{ username }, { email }]
    })

    if(existingUser){
      throw new apiError(409, "User with email or username already exists!")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path; 
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
      throw new apiError(400, "Avatar is required!")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath, "avatars");
    const coverImage = await uploadOnCloudinary(coverImageLocalPath, "coverImages");

    if(!avatar){
      throw new apiError(400, "Avatar is required!")
    }

    const user = await User.create({
      username: username.toLowerCase(),
      password,
      email,
      fullName, 
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if(!createdUser){
      throw new apiError(500, "Something went wrong while creating the user!")
    }

    return res.status(201).json(
      new apiResponse(200, createdUser, "User created successfully!")
    )

});

export { registerUser };