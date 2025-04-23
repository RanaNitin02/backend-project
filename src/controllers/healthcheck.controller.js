
import { apiResponsepiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const healthcheck = asyncHandler(async (req, res) => {

    return res.status(200).json(
        new apiResponse(200, {}, "Health report OK")
    )
})

export {
    healthcheck
}
