import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const getVideoComments = asyncHandler(async (req, res) => {

    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!isValidObjectId(videoId)) {
        throw new apiError(400, "Not a valid ObjectId");
    }

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const comments = await Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
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
                foreignField: "comment",
                as: "likes"
            }
        },
        {
            $addFields: {
                likeCount: { $size: "$likes" }
            }
        },
        {
            $project: {
                _id: 1,
                content: 1,
                createdAt: 1,
                likeCount: 1,
                owner: 1
            }
        },
        { $sort: { createdAt: -1 } }, // recently added comments will show first
        { $skip: skip },
        { $limit: limitNumber }
    ]);

    if (!comments.length) {
        throw new apiError(404, "No comments found");
    }

    res.status(200).json(apiResponse(200, comments, "Comments retrieved successfully"));
});


const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { content } = req.body;

    if (!isValidObjectId(videoId)) {
        throw new apiError(400, "Not a valid ObjectId");
    }

    if (!content?.trim()) {
        throw new apiError(400, "Please add some content!");
    }

    const newComment = await Comment.create({
        content,
        video: new mongoose.Types.ObjectId(videoId),
        user: new mongoose.Types.ObjectId(req.user?._id)
    });

    return res.status(201).json(apiResponse(201, newComment, "Comment added successfully"));
});



const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!commentId?.trim()) {
        throw new apiError(400, "Comment ID cannot be empty");
    }

    if (!isValidObjectId(commentId)) {
        throw new apiError(400, "Not a valid comment ID");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new apiError(404, "Comment not found");
    }

    if (comment.user.toString() !== req.user._id.toString()) {
        throw new apiError(403, "You are not authorized to update this comment");
    }

    if (!content?.trim()) {
        throw new apiError(400, "Content cannot be empty");
    }

    comment.content = content;
    await comment.save();

    return res.status(200).json(apiResponse(200, comment, "Comment updated successfully"));
});



const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!isValidObjectId(commentId)) {
        throw new apiError(400, "Not a valid comment ID");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new apiError(404, "Comment not found");
    }

    if (comment.user.toString() !== req.user._id.toString()) {
        throw new apiError(403, "You are not authorized to delete this comment");
    }

    await comment.remove();

    return res.status(200).json(apiResponse(200, null, "Comment deleted successfully"));
});

export { addComment, updateComment, deleteComment, getVideoComments };
