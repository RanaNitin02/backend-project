import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { apiError } from "../utils/apiError.js"
import { apiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {

    const { name, description } = req.body

    if( !name ){
        return apiError(res, 400, "Playlist name is required")
    }

    const playlist = await Playlist.create({
        name,
        description,
        user: req.user._id
    })

    if( !playlist ){
        return apiError(res, 500, "Unable to create playlist")
    }

    return res.status(200).json(new apiResponse(200, playlist, "Playlist created successfully"));
})

const getUserPlaylists = asyncHandler(async (req, res) => {

    const { userId } = req.params

    if( !(isValidObjectId(userId)) ){
        return apiError(res, 400, "Invalid user id")
    }

    const userPlaylist = await Playlist.find({
        user: userId
    })

    if( !userPlaylist ){
        return apiError(res, 404, "No playlist found")
    }

    return res.status(200).json(apiResponse(200, userPlaylist, "User playlists fetched successfully"))
})

const getPlaylistById = asyncHandler(async (req, res) => {

    const { playlistId } = req.params
     
    if( !(isValidObjectId(playlistId)) ){
        throw new apiError(res, 400, "Invalid playlist id")
    }

    const playlist = await Playlist.findById(playlistId);

    if( !playlist ){
        throw new apiError(404, "Playlist not found")
    }

    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new apiError(401, "you cannot access the playlist as you are not owner")
    }

    return res.status(200).json(new apiResponse(200, playlist, "Playlist fetched successfully"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {

    const { playlistId, videoId } = req.params

    if(  !(isValidObjectId(playlistId)) || !(isValidObjectId(videoId)) ){
        throw new apiError(400, "Invalid object id")
    }

    const playlist = await Playlist.findById(playlistId)

    if( !playlist ){
        throw new apiError(404, "Playlist not found")
    }

    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new apiError(401, "you cannot access the playlist as you are not owner")
    }

    playlist.videos.push(videoId)
    await playlist.save({ValiditeBeforeSave: false})

    return res.status(200).json(new apiResponse(200, playlist, "Video added to playlist successfully"))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {

    const { playlistId, videoId } = req.params
     
    if(  !(isValidObjectId(playlistId)) || !(isValidObjectId(videoId)) ){
        throw new apiError(400, "Invalid object id")
    }

    const playlist = await Playlist.findById(playlistId)

    if( !playlist ){
        throw new apiError(404, "Playlist not found")
    }

    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new apiError(401, "you cannot access the playlist as you are not owner")
    }

    const videoIndex = playlist.videos.indexOf(videoId)

    if( videoIndex === -1 ){
        throw new apiError(404, "Video not found in playlist")
    }

    playlist.videos.splice(videoIndex, 1)
    await playlist.save({ validateBeforeSave: false })

    return res.status(200).json(new apiResponse(200, playlist, "Video removed from playlist successfully"))
})

const deletePlaylist = asyncHandler(async (req, res) => {

    const { playlistId } = req.params
     
    if (!(isValidObjectId(playlistId))) {
        throw new apiError(400, "Invalid playlist id")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new apiError(404, "Playlist not found")
    }

    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new apiError(401, "you cannot delete the playlist as you are not owner")
    }

    await Playlist.findByIdAndDelete(playlistId)

    return res.status(200).json(new apiResponse(200, null, "Playlist deleted successfully"))
})

const updatePlaylist = asyncHandler(async (req, res) => {

    const { playlistId } = req.params
    const { name, description } = req.body
  
    if (!(isValidObjectId(playlistId))) {
        throw new apiError(res, 400, "Invalid playlist id")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new apiError(404, "Playlist not found")
    }

    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new apiError(401, "you cannot update the playlist as you are not owner")
    }

    if (name) {
        playlist.name = name
    }
    if (description) {
        playlist.description = description
    }

    await playlist.save({ validateBeforeSave: false })

    return res.status(200).json( newapiResponse(200, playlist, "Playlist updated successfully"))
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}
