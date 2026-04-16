import axios from "axios";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { IoIosEye, IoIosEyeOff } from "react-icons/io";
import { useNavigate, useParams } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { RxCross2 } from "react-icons/rx";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { token } = useParams(); // RESET LINK TOKEN
  const navigate = useNavigate();

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) return;

      try {
        setIsLoading(true);
        setError("");

        const res = await axios.post(
          `${SERVER_URL}/api/v1/auth/verifyResetToken`,
          { token },
          { withCredentials: true }
        );

        toast.success(res.data.message);
        console.log(res.data);
        setStep(3);
      } catch (error) {
        setError(error.response?.data?.message);
        toast.error(error.response?.data?.message);
        console.log(error);
        navigate("/forgot-password");
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  // STEP 1 → Send OTP
  const handleStep1 = async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await axios.post(
        `${SERVER_URL}/api/v1/auth/sendOtp`,
        { email },
        { withCredentials: true }
      );

      toast.success(result.data.message);
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.message);
      setError(error.response?.data?.message);
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2 → Verify OTP
  const handleStep2 = async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await axios.post(
        `${SERVER_URL}/api/v1/auth/verifyOtp`,
        { email, otp },
        { withCredentials: true }
      );

      toast.success(result.data.message);
      setStep(3);
    } catch (error) {
      toast.error(error.response?.data?.message);
      setError(error.response?.data?.message);
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 3 → Reset Password (Works for BOTH: OTP or Reset Link)
  const handleStep3 = async () => {
    if (newPass !== confirmPass) {
      setError("Passwords do not match!");
      toast.error("Passwords do not match!");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      // IF reset link token exists → send only token + password
      const payload = token
        ? { token, password: newPass }
        : { email, password: newPass };

      const result = await axios.post(
        `${SERVER_URL}/api/v1/auth/resetPassword`,
        payload,
        { withCredentials: true }
      );

      toast.success(result.data.message);

      setTimeout(() => navigate("/signin"), 1000);
    } catch (error) {
      toast.error(error.response?.data?.message);
      setError(error.response?.data?.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-screen bg-gradient-to-b from-gray-900 to-black flex justify-center items-center px-4">
      <div className="w-full max-w-[420px] bg-white/10 backdrop-blur-2xl border border-white/15 shadow-xl rounded-2xl p-6 text-white">
        {/* Back Button */}
        {step > 1 && !token && (
          <button
            className="text-sm text-gray-300 mb-3"
            onClick={() => setStep(step - 1)}
          >
            ← Back
          </button>
        )}

        <h2 className="text-[28px] font-semibold mb-1">
          {step === 3 ? "Reset Password" : "Forgot Password"}
        </h2>
        <p className="text-gray-300 text-sm mb-6">
          {token ? "Resetting via secure link" : `Step ${step} of 3`}
        </p>

        {/* STEP 1 — Enter Email */}
        {!token && step === 1 && (
          <>
            <div className="relative w-full mb-6">
              <input
                type="email"
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl outline-none text-white placeholder-transparent focus:border-blue-400 transition-all"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <label
                className={`absolute left-4 px-1 transition-all duration-200 pointer-events-none ${
                  email ? "-top-3 text-xs bg-gray-900" : "top-3 text-gray-400"
                }`}
              >
                Enter Email
              </label>
            </div>

            {error && (
              <div className="flex items-center justify-center gap-1 pb-3">
                <p className="text-red-500">{error}</p>
                <RxCross2
                  className="cursor-pointer"
                  size={20}
                  onClick={() => setError("")}
                />
              </div>
            )}

            <button
              disabled={isLoading}
              className={`w-full py-3 bg-blue-600 hover:bg-blue-700 transition rounded-xl text-white font-medium ${
                isLoading && "opacity-50 cursor-not-allowed"
              }`}
              onClick={handleStep1}
            >
              {isLoading ? <ClipLoader color="#fff" size={30} /> : "Send OTP"}
            </button>
          </>
        )}

        {/* STEP 2 — Enter OTP */}
        {!token && step === 2 && (
          <>
            <div className="relative w-full mb-6">
              <input
                type="text"
                pattern="[0-9]{4}"
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl outline-none text-white placeholder-transparent focus:border-blue-400 transition-all"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
              <label
                className={`absolute left-4 px-1 transition-all duration-200 pointer-events-none ${
                  otp ? "-top-3 text-xs bg-gray-900" : "top-3 text-gray-400"
                }`}
              >
                Enter OTP
              </label>
            </div>

            {error && (
              <div className="flex items-center justify-center gap-1 pb-3">
                <p className="text-red-500">{error}</p>
                <RxCross2
                  className="cursor-pointer"
                  size={20}
                  onClick={() => setError("")}
                />
              </div>
            )}

            <button
              disabled={isLoading}
              className={`w-full py-3 bg-blue-600 hover:bg-blue-700 transition rounded-xl text-white font-medium ${
                isLoading && "opacity-50 cursor-not-allowed"
              }`}
              onClick={handleStep2}
            >
              {isLoading ? <ClipLoader color="#fff" size={30} /> : "Verify OTP"}
            </button>
          </>
        )}

        {/* STEP 3 — Reset Password */}
        {step === 3 && (
          <>
            <div className="relative w-full mb-4">
              <input
                type={showNewPassword ? "text" : "password"}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl outline-none text-white placeholder-transparent focus:border-blue-400 transition-all"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                required
              />
              {showNewPassword ? (
                <IoIosEye
                  className="absolute right-4 top-4 cursor-pointer text-[18px]"
                  onClick={() => setShowNewPassword(false)}
                />
              ) : (
                <IoIosEyeOff
                  className="absolute right-4 top-4 cursor-pointer text-[18px]"
                  onClick={() => setShowNewPassword(true)}
                />
              )}
              <label
                className={`absolute left-4 px-1 transition-all duration-200 pointer-events-none ${
                  newPass ? "-top-3 text-xs bg-gray-900" : "top-3 text-gray-400"
                }`}
              >
                New Password
              </label>
            </div>

            <div className="relative w-full mb-6">
              <input
                type={showConfirmPassword ? "text" : "password"}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl outline-none text-white placeholder-transparent focus:border-blue-400 transition-all"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                required
              />
              {showConfirmPassword ? (
                <IoIosEye
                  className="absolute right-4 top-4 cursor-pointer text-[18px]"
                  onClick={() => setShowConfirmPassword(false)}
                />
              ) : (
                <IoIosEyeOff
                  className="absolute right-4 top-4 cursor-pointer text-[18px]"
                  onClick={() => setShowConfirmPassword(true)}
                />
              )}
              <label
                className={`absolute left-4 px-1 transition-all duration-200 pointer-events-none ${
                  confirmPass
                    ? "-top-3 text-xs bg-gray-900"
                    : "top-3 text-gray-400"
                }`}
              >
                Confirm Password
              </label>
            </div>

            {error && (
              <div className="flex items-center justify-center gap-1 pb-3">
                <p className="text-red-500">{error}</p>
                <RxCross2
                  className="cursor-pointer"
                  size={20}
                  onClick={() => setError("")}
                />
              </div>
            )}

            <button
              disabled={isLoading}
              className={`w-full py-3 bg-green-600 hover:bg-green-700 transition rounded-xl text-white font-medium ${
                isLoading && "opacity-50 cursor-not-allowed"
              }`}
              onClick={handleStep3}
            >
              {isLoading ? (
                <ClipLoader color="white" size={30} />
              ) : (
                "Reset Password"
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
