import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import {
  createAdCampaign,
  getFeedAds,
  recordAdClick,
  getMonetizationDetails,
  sendCreatorGift,
  getPremiumPlans,
  createPremiumOrder,
  verifyPremiumPayment,
  withdrawEarnings,
  simulateEarning,
} from "../controllers/monetization.controller.js";

const monetizationRouter = express.Router();

monetizationRouter.post("/ad/create", isAuthenticated, createAdCampaign);
monetizationRouter.get("/ad/feed", isAuthenticated, getFeedAds);
monetizationRouter.post("/ad/click/:adId", isAuthenticated, recordAdClick);
monetizationRouter.get("/dashboard", isAuthenticated, getMonetizationDetails);
monetizationRouter.post("/gift", isAuthenticated, sendCreatorGift);
monetizationRouter.get("/premium/plans", isAuthenticated, getPremiumPlans);
monetizationRouter.post("/premium/order", isAuthenticated, createPremiumOrder);
monetizationRouter.post("/premium/verify", isAuthenticated, verifyPremiumPayment);
monetizationRouter.post("/payout", isAuthenticated, withdrawEarnings);
monetizationRouter.post("/test/simulate-earning", isAuthenticated, simulateEarning);

export default monetizationRouter;
