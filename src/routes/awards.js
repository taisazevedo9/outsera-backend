const express = require('express');
const awardService = require('../services/awardService');
const { asyncHandler } = require('../middlewares/errorHandler');
const { HTTP_STATUS } = require('../config/constants');

const router = express.Router();


router.get('/producers-intervals', asyncHandler(async (req, res) => {
  const result = await awardService.getProducersIntervals();
  res.status(HTTP_STATUS.OK).json(result);
}));

module.exports = router;
