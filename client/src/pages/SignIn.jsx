import axios from "axios";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { IoIosEye, IoIosEyeOff } from "react-icons/io";
import { RxCross2 } from "react-icons/rx";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import logo from "../assets/logo.png";
import logo2 from "../assets/logo2.png";
import { setUserData } from "../redux/features/userSlice";
import { GoogleLogin } from "@react-oauth/google";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

const SignIn = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [inputClicked, setInputClicked] = useState({
    userName: false,
    password: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSignIn = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await axios.post(
        `${SERVER_URL}/api/v1/auth/signin`,
        {
          userName,
          password,
        },
        {
          withCredentials: true,
        }
      );

      dispatch(setUserData(result.data));
      toast.success(result.data.message);

      setTimeout(() => navigate("/"), 800);
    } catch (error) {
      setError(error.response?.data?.message);
      toast.error(error.response?.data?.message);
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  // GOOGLE LOGIN HANDLER
  const handleGoogleLoginSuccess = async (credentialResponse) => {
    try {
      const token = credentialResponse.credential;

      const res = await axios.post(
        `${SERVER_URL}/api/v1/auth/google`,
        { credential: token },
        { withCredentials: true }
      );

      // IF USER DOES NOT EXIST
      if (res.data.requiresUsername) {
        toast.error("Google account not registered. Please sign up first.");
        return;
      }

      // EXISTING USER → LOGIN
      dispatch(setUserData({ user: res.data.user }));
      toast.success(`Welcome back ${res.data.user.name}`);
      navigate("/");
    } catch (error) {
      console.error(error);
      toast.error("Google login failed");
    }
  };

  return (
    <div className="w-full h-screen bg-linear-to-b from-black to-gray-900 flex flex-col justify-center items-center">
      <div className="w-[90%] lg:max-w-[60%] h-[500px] bg-white rounded-2xl flex justify-center items-center overflow-hidden border-2 border-[#1a1f23]">
        <form
          className="w-full lg:w-[50%] h-full bg-white flex flex-col items-center p-[10px] gap-[20px]"
          onSubmit={handleSignIn}
        >
          <div className="flex gap-[10px] items-center text-[20px] font-semibold mt-[40px]">
            <span>Sign In to</span>
            <img src={logo2} alt="" className="w-[70px]" />
          </div>

          {/* Username */}
          <div
            className="relative flex items-center justify-start w-[90%] h-[50px] rounded-2xl border-2 border-black"
            onClick={() => setInputClicked({ ...inputClicked, userName: true })}
          >
            <label
              htmlFor="userName"
              className={`absolute left-[20px] p-[5px] bg-white transition-all duration-200 ${
                inputClicked.userName || userName
                  ? "top-[-18px] text-[13px]"
                  : "top-[7px] text-[15px]"
              }`}
            >
              Enter Username
            </label>
            <input
              type="text"
              id="userName"
              className="w-full h-full rounded-2xl px-[20px] outline-none border-0"
              autoComplete="new-username"
              required
              name="userName"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
          </div>

          {/* Password */}
          <div
            className="relative flex items-center justify-start w-[90%] h-[50px] rounded-2xl border-2 border-black"
            onClick={() => setInputClicked({ ...inputClicked, password: true })}
          >
            <label
              htmlFor="password"
              className={`absolute left-[20px] p-[5px] bg-white transition-all duration-200 ${
                inputClicked.password || password
                  ? "top-[-18px] text-[13px]"
                  : "top-[7px] text-[15px]"
              }`}
            >
              Enter Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              className="w-full h-full rounded-2xl px-[20px] outline-none border-0"
              autoComplete="current-password"
              required
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {showPassword ? (
              <IoIosEyeOff
                className="absolute cursor-pointer right-[20px] w-[25px] h-[25px]"
                onClick={() => setShowPassword(!showPassword)}
              />
            ) : (
              <IoIosEye
                className="absolute cursor-pointer right-[20px] w-[25px] h-[25px]"
                onClick={() => setShowPassword(!showPassword)}
              />
            )}
          </div>

          {/* Forgot Password */}
          <p className="text-gray-800">
            Forgot Password?{" "}
            <span
              className="border-b-2 border-b-black pb-[3px] text-black hover:text-gray-700 cursor-pointer"
              onClick={() => navigate("/forgot-password")}
            >
              Reset Password
            </span>
          </p>

          {error && (
            <div className="flex items-center gap-1">
              <p className="text-red-600">{error}</p>
              <RxCross2
                className="cursor-pointer"
                size={20}
                onClick={() => setError("")}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-[70%] h-[50px] bg-black text-white font-semibold rounded-2xl mt-[20px] transition hover:scale-101 ${
              isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-900"
            }`}
          >
            {isLoading ? <ClipLoader color="white" size={30} /> : "Sign In"}
          </button>

          {/* Google Button */}
          <div className="mt-2">
            <GoogleLogin
              onSuccess={handleGoogleLoginSuccess}
              onError={() => toast.error("Google login failed")}
            />
          </div>

          <p className="cursor-pointer text-gray-800">
            Don't have an account?{" "}
            <span
              className="border-b-2 border-b-black pb-[3px] text-black hover:text-gray-700"
              onClick={() => navigate("/signup")}
            >
              Sign Up
            </span>
          </p>
        </form>

        {/* Right Side */}
        <div className="md:w-[50%] h-full hidden lg:flex justify-center items-center bg-[#000000] flex-col gap-[10px] text-white text-[16px] font-semibold rounded-l-[30px] shadow-2xl shadow-black">
          <img src={logo} alt="" className="w-[40%]" />
          <p>Welcome Back To The VYBE</p>
          <p className="uppercase tracking-wide text-xs flex items-center gap-1 mt-1 text-gray-600 made-in-india">
            <span>🇮🇳</span> Made in India
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
