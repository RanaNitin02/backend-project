import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { apiError } from "../utils/apiError.js"
import { apiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"



const createTweet = asyncHandler(async (req, res) => {

    const { content } = req.body

    if (!content) {
        throw new apiError(400, "Content is required")
    }

    const tweet = await Tweet.create({
        content,
        owner: req.user?._id
    })

    if (!tweet) {
        throw new apiError(500, "Unable to create tweet")
    }

    return res.status(200).json(new apiResponse(200, tweet, "Tweet created successfully"))
})



const getUserTweets = asyncHandler(async (req, res) => {

    const { userId } = req.params

    if (!isValidObjectId(userId)) {
        throw new apiError(400, "Invalid user ID")
    }

    const tweets = await Tweet.find({ owner: userId }).select("_id content owner createdAt")

    if (tweets.length === 0) {
        throw new apiError(404, "No tweets found")
    }

    return res.status(200).json(new apiResponse(200, tweets, "Tweets fetched successfully"))
})



const updateTweet = asyncHandler(async (req, res) => {

    const { tweetId } = req.params
    const { content } = req.body

    if (!isValidObjectId(tweetId)) {
        throw new apiError(400, "Invalid tweet ID")
    }

    if (!content || content.trim() === "") {
        throw new apiError(400, "Content cannot be empty")
    }

    const tweet = await Tweet.findById(tweetId)

    if (!tweet) {
        throw new apiError(404, "Tweet not found")
    }

    if (tweet.owner.toString() !== req.user?._id.toString()) {
        throw new apiError(403, "You are not authorized to edit this tweet")
    }

    tweet.content = content
    await tweet.save({ validateBeforeSave: false })

    return res.status(200).json(new apiResponse(200, tweet, "Tweet updated successfully"))
})



const deleteTweet = asyncHandler(async (req, res) => {
    
    const { tweetId } = req.params

    if (!isValidObjectId(tweetId)) {
        throw new apiError(400, "Invalid tweet ID")
    }

    const tweet = await Tweet.findById(tweetId)

    if (!tweet) {
        throw new apiError(404, "Tweet not found")
    }

    if (tweet.owner.toString() !== req.user?._id.toString()) {
        throw new apiError(403, "You are not authorized to delete this tweet")
    }

    const deletedTweet = await Tweet.findByIdAndDelete(tweetId)

    if (!deletedTweet) {
        throw new apiError(500, "Failed to delete tweet")
    }

    return res.status(200).json(new apiResponse(200, deletedTweet, "Tweet deleted successfully"))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
