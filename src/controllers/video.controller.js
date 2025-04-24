import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { apiError } from "../utils/apiError.js"
import { apiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {

    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query

    if (query && query.trim() === "") {
        throw new apiError(400, "Query cannot be empty")
    }

    const pageNumber = parseInt(page)
    const limitNumber = parseInt(limit)
    const skip = (pageNumber - 1) * limitNumber

    const video = await Video.aggregate([
        {
            $match: {
                $or: [
                    { title: { $regex: query, $options: "i" } },
                    { description: { $regex: query, $options: "i" } }
                ]
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
            }
        },
        {
            $addFields: {
                likeCount: { $size: "$likes" },
            }
        },
        {
            $project: {
                _id: 1,
                likesCnt: 1,
                owner: 1,
                "videoFile.url": 1,
                "thumbnail.url": 1,
                createdAt: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                isPublished: 1,
            }
        },
        { $sort: { [sortBy]: sortType === 'asc' ? 1 : -1 } },
        { $skip: skip },
        { $limit: limitNumber }
    ])

    if (!video || video.length === 0) {
        throw new apiError(404, "No videos found")
    }

    return res.status(200).json(new apiResponse(200, video, "Videos fetched successfully"))

})



const publishAVideo = asyncHandler(async (req, res) => {

    const { title, description} = req.body

    if(!title || !description){
        throw new apiError(401, "All fields required")
    }

    let videoFileLocalPath, thumbnailLocalPath;

    if(req.files && Array.isArray(req.files.videoFile)
        && req.files.videoFile.length > 0){
            videoFileLocalPath = req.files.videoFile[0].path;
    }

    if(req.files && Array.isArray(req.files.thumbnail)
        && req.files.thumbnail.length > 0){
            thumbnailLocalPath = req.files.thumbnail[0].path;
    }

    if(!videoFileLocalPath){
        throw new apiError(401, "video required")
    }

    if(!thumbnailLocalPath){
        throw new apiError(401, "thumbnail required")
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    // console.log(videoFile);

    if(!videoFile || !thumbnail){
        throw new apiError(400, "video or thumbnail not uploaded")
    }

    const video = await Video.create({
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        title,
        description,
        owner: req.user._id,
        duration: videoFile.duration
    })

    const createdVideo = await Video.findById(video._id)

    if(!createdVideo){
        throw new apiError(500, "Something went wrong while uploading video")
    }

    return res.status(200)
              .json(
                    new apiResponse(
                        200,
                        createdVideo,
                        "Video uploaded successfully"
                    )
              )
})



const getVideoById = asyncHandler(async (req, res) => {

    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new apiError(401, "No such videoId exists")
    }

    const video = await Video.findById(videoId)

    return res.status(200)
        .json(
            new apiResponse(
                200,
                video,
                "Video fetched successfully"
            )
        )

})



const updateVideo = asyncHandler(async (req, res) => {

    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new apiError(400, "No such videoId exists")
    }

    const { title, description } = req.body;

    if(  !title || !description){
        throw new apiError(400, "All feilds are required")
    }

    let thumbnailLocalPath = req?.file?.path || null

    if(!thumbnailLocalPath) {
        throw new apiError(400, "Thumbnail is required")
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if(!thumbnail) {
        throw new apiError(500, "Unable to upload thumbnail")
    }

    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: thumbnail.url
            }
        },
        {
            new: true
        }
    )

    return res.status(200)
              .json(
                    new apiResponse(
                        200,
                        video,
                        "video data updated successfully"
                    )
              )
})



const deleteVideo = asyncHandler(async (req, res) => {

    const { videoId } = req.params
    

    if(!isValidObjectId(videoId)){
        throw new apiError(400, "No such videoId exists")
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new apiError(401, "No such video exists")
    }

    if(video.owner.toString() != req.user._id.toString()){
        throw new apiError(400, "Can't delete, you are not owner of this video")
    }

    await Video.findByIdAndDelete(videoId);

    return res.status(200)
              .json(
                    new apiResponse(
                        200,
                        {},
                        "video deleted successfully"
                    )
              )

})



const togglePublishStatus = asyncHandler(async (req, res) => {

    const { videoId } = req.params;

    if(!isValidObjectId(videoId)){
        throw new apiError(400, "Not valid id")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new apiError(401, "No video found")
    }

    if (video?.owner.toString() !== req.user?._id.toString()) {
        throw new apiError(401, "You are not the owner of this video")
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video?.isPublished
            }
        },
        {
            new: true
        }
    )

    return res.status(200)
              .json(
                new apiResponse(
                    200,
                    updatedVideo,
                    "Publish status toggle successfully"
                )
              )

})



export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}