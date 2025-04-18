export {asyncHandler}

const asyncHandler = (fn) => async(req, resizeBy, next) => {
    try {
        await fn(req, res, next);
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message,
        });
    }
}