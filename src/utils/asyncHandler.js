export {asyncHandler}

const asyncHandler = (fn) => async(req, res, next) => {
    try {
    return await fn(req, res, next);
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message,
        });
    }
}