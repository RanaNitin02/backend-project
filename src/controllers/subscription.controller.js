import mongoose, { isValidObjectId } from "mongoose"
import { Subscription } from "../models/subscription.model.js"
import { apiError } from "../utils/apiError.js"
import { apiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {

    const { channelId } = req.params

    if (!isValidObjectId(channelId)) {
        throw new apiError(400, "Invalid channel ID")
    }

    const existingSubscription = await Subscription.findOne({
        channel: channelId,
        user: req.user._id
    })

    let isSubscribed;

    if (existingSubscription) {

        const unsubscribed = await Subscription.findByIdAndDelete(existingSubscription._id)

        if (!unsubscribed) {
            throw new apiError(500, "Unable to unsubscribe from channel")
        }

        isSubscribed = false

    } else {

        const subscribed = await Subscription.create({
            channel: new mongoose.Types.ObjectId(channelId),
            user: req.user._id
        })

        if (!subscribed) {
            throw new apiError(500, "Unable to subscribe to channel")
        }

        isSubscribed = true
    }

    return res.status(200).json(apiResponse(200, { isSubscribed }, "Subscription toggled successfully"))
})


const getUserChannelSubscribers = asyncHandler(async (req, res) => {

    const { channelId } = req.params

    if (!isValidObjectId(channelId)) {
        throw new apiError(400, "Invalid channel ID")
    }

    const subscribers = await Subscription.find({ channel: channelId })

    if (subscribers.length === 0) {
        throw new apiError(404, "No subscribers found for this channel")
    }

    return res.status(200).json(apiResponse(200, { subscribers }, "Subscribers fetched successfully"))
})


const getSubscribedChannels = asyncHandler(async (req, res) => {
    
    const { subscriberId } = req.params

    if (!isValidObjectId(subscriberId)) {
        throw new apiError(400, "Invalid subscriber ID")
    }

    const subscriptions = await Subscription.find({ user: subscriberId })

    if (subscriptions.length === 0) {
        throw new apiError(404, "No channels found for this subscriber")
    }

    return res.status(200).json(apiResponse(200, { subscriptions }, "Subscribed channels fetched successfully"))
})


export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}
