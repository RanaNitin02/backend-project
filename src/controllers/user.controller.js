import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { apiResponse } from '../utils/apiResponse.js';
import { apiError } from '../utils/apiError.js';
import { User } from '../models/user.model.js';
import mongoose from 'mongoose';
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


const changeCurrentPassword = asyncHandler(async (req, res) => {

  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new apiError(401, "Old password is incorrect!")
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new apiResponse(200, {}, "Password changed successfully!")
  );
})


const getCurrentUser = asyncHandler(async (req, res) => {

  return res.status(200).json(
    new apiResponse(200, req.user, "Current user fetched successfully!")
  );
})


const updateAccountDetails = asyncHandler(async (req, res) => {

  const { fullName, email } = req.body;

  if (!(fullName && email)) {
    throw new apiError(400, "Full name and email are required!")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email: email

      }
    },
    { new: true }
  ).select("-password");

  return res.status(200).json(
    new apiResponse(200, user, "Account details updated successfully!")
  );
})


const updateUserAvatar = asyncHandler(async (req, res) => {

  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar file is missing!")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new apiError(400, "Error while uploading an avatar!")
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: avatar.url
      }
    },
    { new: true }
  ).select("-password");

  return res.status(200).json(
    new apiResponse(200, user, "Avatar updated successfully!")
  );
})


const updateUserCoverImage = asyncHandler(async (req, res) => {

  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new apiError(400, "Cover Image file is missing!")
  }

  const coverImage = await uploadOnCloudinary(avatarLocalPath);

  if (!coverImage.url) {
    throw new apiError(400, "Error while uploading an avatar!")
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverImage: coverImage.url
      }
    },
    { new: true }
  ).select("-password");

  return res.status(200).json(
    new apiResponse(200, user, "Cover Image updated successfully!")
  );
})


const getUserChannelProfile = asyncHandler(async (req, res) => {

  const { username } = req.params

  if (!username?.trim()) {
    throw new apiError(400, "username is missing!")
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase()
      }
    },
    {
      $lookup: {
        from: "subscriptions",  // 's' is added at the end of name in the db 
        localField: "_id",
        foreignField: "channel",
        as: "subscribers"   // this name is created by us 
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo"
      }
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers"
        },
        channelIsSubscribedTo: {
          $size: "$subscribedTo"
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false
          }
        }
      }
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelIsSubscribedTo: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1
      }
    }
  ])

  if (!channel?.length) {
    throw new apiError(400, "channel is not created!")
  }

  return res.status(200).json(
    new apiResponse(200, channel[0], "User Channel fetched successfully!")
  );

})


const getWatchHistory = asyncHandler(async (req, res) => {

  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id)
      }
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  }
                }
              ]
            }
          },
          {
            $addFields: {
              owner: {
                $first: "$owner"
              }
            }
          }
        ]
      }
    }
  ])

  return res.status(200).json(new apiResponse(200, user[0].watchHistory, "Watch history fetched successfully"))
})



export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory
};