import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { Tweet } from "../models/tweet.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";



const toggleVideoLike = asyncHandler(async (req, res) => {

    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new apiError(404, "Video not found");
    }

    const like = await Like.findOne({ video: videoId, likedBy: req.user._id });

    let isLiked;
    if (like) {
        await like.deleteOne();
        isLiked = false;
    } else {
        await Like.create({ video: videoId, likedBy: req.user._id });
        isLiked = true;
    }

    return res.status(200).json(apiResponse(200, { isLiked, type: "video" }, "Video like toggled successfully"));
});



const toggleCommentLike = asyncHandler(async (req, res) => {

    const { commentId } = req.params;

    if (!isValidObjectId(commentId)) {
        throw new apiError(400, "Invalid comment ID");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new apiError(404, "Comment not found");
    }

    const like = await Like.findOne({ comment: commentId, likedBy: req.user._id });

    let isLiked;
    if (like) {
        await like.deleteOne();
        isLiked = false;
    } else {
        await Like.create({ comment: commentId, likedBy: req.user._id });
        isLiked = true;
    }

    return res.status(200).json(apiResponse(200, { isLiked, type: "comment" }, "Comment like toggled successfully"));
});



const toggleTweetLike = asyncHandler(async (req, res) => {

    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
        throw new apiError(400, "Invalid tweet ID");
    }

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new apiError(404, "Tweet not found");
    }

    const like = await Like.findOne({ tweet: tweetId, likedBy: req.user._id });

    let isLiked;
    if (like) {
        await like.deleteOne();
        isLiked = false;
    } else {
        await Like.create({ tweet: tweetId, likedBy: req.user._id });
        isLiked = true;
    }

    return res.status(200).json(apiResponse(200, { isLiked, type: "tweet" }, "Tweet like toggled successfully"));
});



const getLikedVideos = asyncHandler(async (req, res) => {

    const likedVideos = await Like.find({
        likedBy: req.user._id,
        video: { $ne: null }
    })
        .populate("video") // Get full video info
        .populate("likedBy", "name profilePicture") // Get user name & profile pic only
        .sort({ createdAt: -1 }); // Sort liked videos by most recent   

    return res
        .status(200)
        .json(apiResponse(200, likedVideos, "Liked videos fetched successfully"));
});




export {
    toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike,
    getLikedVideos
};
