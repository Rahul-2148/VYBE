import express from "express";
import {
  resetPassword,
  sendOtp,
  signIn,
  signOut,
  signUp,
  suggestUsername,
  verifyOtp,
  verifyResetToken,
} from "../controllers/auth.controller.js";
import {
  googleAuth,
  googleAuthComplete,
} from "../controllers/googleAuth.controller.js";

const authRouter = express.Router();

authRouter.post("/signup", signUp);
authRouter.post("/signin", signIn);
authRouter.post("/sendOtp", sendOtp);
authRouter.post("/verifyOtp", verifyOtp);
authRouter.post("/verifyResetToken", verifyResetToken);
authRouter.post("/resetPassword", resetPassword);
authRouter.post("/signout", signOut);

authRouter.post("/google", googleAuth);
authRouter.post("/google/complete", googleAuthComplete);
authRouter.get("/username/suggest", suggestUsername);

export default authRouter;
