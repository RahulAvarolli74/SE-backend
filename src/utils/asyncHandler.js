const asyncHandler = (fn) => async (req, res, next) => {
  try {
    return await fn(req, res, next);
  } catch (error) {
    console.error('ERROR in handler:', error);
    let status = error.statusCode || error.code || 500;

    if (typeof status !== 'number' || status < 100 || status > 599) {
      status = 500;
    }
    res.status(status).json({
      success: false,
      message: error.message || 'Internal Server Error',
    });
  }
};

export { asyncHandler };
