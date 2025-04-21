import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { apiResponse } from '../utils/apiResponse.js';
import { apiError } from '../utils/apiError.js'
import { User } from '../models/user.model.js'
import jwt from "jsonwebtoken";


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

  const { username, password, email, fullName } = req.body;
  // console.log("user deatls are: ", username, password, email, fullName);

  if (
    [username, password, email, fullName].some(field => field?.trim() === "")
  ) {
    throw new apiError(400, "All feilds are required!")
  }

  const existingUser = await User.findOne({
    $or: [{ username }, { email }]
  })

  if (existingUser) {
    throw new apiError(409, "User with email or username already exists!")
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;

  let coverImageLocalPath;
  if (req.files && Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar is required!")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath, "avatars");
  const coverImage = await uploadOnCloudinary(coverImageLocalPath, "coverImages");

  if (!avatar) {
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

  if (!createdUser) {
    throw new apiError(500, "Something went wrong while creating the user!")
  }

  return res.status(201).json(
    new apiResponse(200, createdUser, "User created successfully!")
  )

});


const generateAccessAndRefreshToken = async (userId) => {
  try {

    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };

  } catch (error) {
    throw new apiError(500, "Something went wrong while generating access and refresh token!")
  }
}


const loginUser = asyncHandler(async (req, res) => {
  // req body -> data
  // check -> username, email
  // find the user
  // password check 
  // access and refresh token
  // send cookies
  // return res


  const { username, email, password } = req.body;

  if (!(username || password)) {
    throw new apiError(300, "username or password is required!")
  }

  const user = await User.findOne({
    $or: [{ username }, { email }]
  })

  if (!user) {
    throw new apiError(404, "User not found!")
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new apiError(401, "Password is incorrect!")
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

  const options = {
    httpOnly: true,
    secure: true
  }

  return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new apiResponse(200,
        {
          user: loggedInUser, accessToken, refreshToken
        },
        "User logged in successfully!")
    )

})


const logoutUser = asyncHandler(async (req, res) => {

  await User.findOneAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined
      }
    }, {
    new: true
  }
  )

  const options = {
    httpOnly: true,
    secure: true
  }

  return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
      new apiResponse(200,
        "User logged Out successfully!")
    )
})


const refreshAccessToken = asyncHandler(async (req, res) => {

  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new apiError(401, "Refresh token is required!")
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new apiError(401, "User not found!")
    }
    if (user?.refreshToken !== incomingRefreshToken) {
      throw new apiError(401, "Refresh token is expired or used!")
    }

    const options = {
      httpOnly: true,
      secure: true
    }

    const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id);

    return res.status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new apiResponse(200,
          {
            accessRefreshToken, refreshToken: newRefreshToken
          },
          "Access token refreshed!")
      )
  } catch (error) {
    throw new apiError(401, error?.message || "Invalid refresh token!")
  }
})

export { registerUser, loginUser, logoutUser, refreshAccessToken };