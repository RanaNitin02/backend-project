import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {apiError} from "../utils/apiError.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"



const getChannelStats = asyncHandler(async (req, res) => {

    const videoStats = await Video.aggregate([
        {
            $match: { owner: req.user?._id }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $project: {
                likesCnt: {
                    $size: "$likes"
                },
                viewsCnt: "$views",
                totalVideos: 1
            }
        },
        {
            $group: {
                _id: null,
                totalLikesCnt: {
                    $sum: "$likesCnt"
                },
                totalViewsCnt: {
                    $sum: "$viewsCnt"
                },
                totalVideos: {
                    $sum: 1
                }

            }
        }
    ])

    const subscriberStats = await Subscription.aggregate([
        {
            $match: {
                channel: req.user?._id
            }
        },
        {
            $group: {
                _id: null,
                subscriberCnt: {
                    $sum: 1
                }
            }
        }
    ])


    if (!(videoStats && subscriberStats)) {
        throw new apiError(501, "Failed to fetch channel data")
    }

    const stats = {
        subscriberCount: subscriberStats[0]?.subscriberCnt || 0,
        totalLikes: videoStats[0]?.totalLikesCnt || 0,
        totalVideos: videoStats[0]?.totalVideos || 0,
        totalViews: videoStats[0]?.totalViewsCnt || 0,

    }

    return res.status(200).json(
        new apiResponse(
            200,
            stats,
            "Stats Fetched"
        )
    )
})



const getChannelVideos = asyncHandler(async (req, res) => {

    const videos = await Video.aggregate([
        {
            $match: {
                owner: req.user?._id
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
                likesCnt: { $size: "$likes" }
            }
        },
        {
            $project: {
                _id: 1,
                "videoFile.url": 1,
                "thumbnail.url": 1,
                likesCnt: 1,
                createdAt: 1,
                title: 1,
                description: 1,
                views: 1,
                duration: 1,
            }
        }
    ])


    if (!videos || videos.length === 0) {
        throw new apiError(501, "No videos found")
    }

    res.status(200).json(
        new apiResponse(200, videos, "Videos fetched successfully")
    )
})



export {
    getChannelStats, 
    getChannelVideos
}