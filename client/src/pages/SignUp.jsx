import { GoogleLogin } from "@react-oauth/google";
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
import GoogleUsernameModal from "../components/GoogleUsernameModal";
import { setUserData } from "../redux/features/userSlice";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

const SignUp = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [inputClicked, setInputClicked] = useState({
    name: false,
    userName: false,
    email: false,
    password: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [name, setName] = useState("");
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Username suggestion state
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);

  // GOOGLE FLOW
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [googleUser, setGoogleUser] = useState(null);
  const [googleUsername, setGoogleUsername] = useState("");

  // Username Suggestion API call
  const fetchUsernameSuggestions = async (value) => {
    if (!value || value.length < 3) {
      setUsernameSuggestions([]);
      return;
    }

    try {
      const res = await axios.get(
        `${SERVER_URL}/api/v1/auth/username/suggest?query=${value}`
      );
      setUsernameSuggestions(res.data.suggestions);
    } catch (err) {
      console.log(err);
    }
  };

  // Normal Signup Handler
  const handleSignUp = async (e) => {
    e.preventDefault();

    setIsLoading(true);
    setError("");

    try {
      const result = await axios.post(
        `${SERVER_URL}/api/v1/auth/signup`,
        { name, userName, email, password },
        { withCredentials: true }
      );

      dispatch(setUserData(result.data));
      toast.success(result.data.message);
      setTimeout(() => navigate("/signin"), 1000);
    } catch (error) {
      setError(error.response?.data?.message);
      toast.error(error.response?.data?.message);
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Google Login Handler
  const handleGoogleLoginSuccess = async (credentialResponse) => {
    try {
      const token = credentialResponse.credential;

      const res = await axios.post(
        `${SERVER_URL}/api/v1/auth/google`,
        { credential: token },
        { withCredentials: true }
      );

      if (res.data.requiresUsername) {
        setGoogleUser(res.data.googleUser);
        setShowUsernameModal(true);
      } else {
        dispatch(setUserData({ user: res.data.user }));
        toast.success(`Welcome back ${res.data.user.name}`);
        navigate("/");
      }
    } catch (error) {
      console.error(error);
      toast.error("Google login failed");
    }
  };

  const handleGoogleUsernameSubmit = async () => {
    if (!googleUsername) return toast.error("Username is required");

    setGoogleLoading(true);

    try {
      const res = await axios.post(
        `${SERVER_URL}/api/v1/auth/google/complete`,
        {
          ...googleUser,
          userName: googleUsername,
        },
        { withCredentials: true }
      );

      dispatch(setUserData({ user: res.data.user }));
      toast.success("Account created via Google successfully");
      setShowUsernameModal(false);
      navigate("/");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Error completing signup");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="w-full h-screen bg-linear-to-b from-black to-gray-900 flex flex-col justify-center items-center">
      <div className="w-[90%] lg:max-w-[60%] h-[550px] bg-white rounded-2xl flex justify-center items-center overflow-hidden border-2 border-[#1a1f23]">
        <form
          className="w-full lg:w-[50%] h-full bg-white flex flex-col items-center p-[10px] gap-[13px] mb-[40px]"
          onSubmit={handleSignUp}
        >
          <div className="flex gap-[10px] items-center text-[20px] font-semibold mt-[40px]">
            <span>Sign Up to</span>
            <img src={logo2} alt="" className="w-[70px]" />
          </div>

          {/* NAME */}
          <div
            className="relative flex items-center justify-start w-[90%] h-[50px] rounded-2xl mt-[20px] border-2 border-black"
            onClick={() => setInputClicked({ ...inputClicked, name: true })}
          >
            <label
              htmlFor="name"
              className={`absolute left-[20px] p-[5px] bg-white transition-all duration-200 ${
                inputClicked.name || name
                  ? "top-[-18px] text-[13px]"
                  : "top-[5px] text-[15px]"
              }`}
            >
              Enter Your Name
            </label>
            <input
              id="name"
              type="text"
              className="w-full h-full rounded-2xl px-[20px] outline-none border-0"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* USERNAME WITH LIVE SUGGESTIONS */}
          <div
            className="relative flex flex-col items-start w-[90%]"
            onClick={() => setInputClicked({ ...inputClicked, userName: true })}
          >
            <div className="relative flex items-center justify-start w-full h-[50px] rounded-2xl border-2 border-black">
              <label
                htmlFor="userName"
                className={`absolute left-[20px] p-[5px] bg-white transition-all duration-200 ${
                  inputClicked.userName || userName
                    ? "top-[-18px] text-[13px]"
                    : "top-[5px] text-[15px]"
                }`}
              >
                Enter Your Username
              </label>
              <input
                id="userName"
                type="text"
                className="w-full h-full rounded-2xl px-[20px] outline-none border-0"
                required
                value={userName}
                onChange={(e) => {
                  setUserName(e.target.value);
                  fetchUsernameSuggestions(e.target.value);
                }}
              />
            </div>

            {/* Username Suggestions UI */}
            {usernameSuggestions.length > 0 && (
              <div className="w-full bg-white border border-gray-300 rounded-xl mt-1 p-2 shadow-sm text-sm z-40">
                {usernameSuggestions.map((u, i) => (
                  <p
                    key={i}
                    className="p-2 cursor-pointer hover:bg-gray-100 rounded-lg"
                    onClick={() => {
                      setUserName(u);
                      setUsernameSuggestions([]);
                    }}
                  >
                    {u}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* EMAIL */}
          <div
            className="relative flex items-center justify-start w-[90%] h-[50px] rounded-2xl border-2 border-black"
            onClick={() => setInputClicked({ ...inputClicked, email: true })}
          >
            <label
              htmlFor="email"
              className={`absolute left-[20px] p-[5px] bg-white transition-all duration-200 ${
                inputClicked.email || email
                  ? "top-[-18px] text-[13px]"
                  : "top-[5px] text-[15px]"
              }`}
            >
              Enter Your Email
            </label>
            <input
              id="email"
              type="email"
              className="w-full h-full rounded-2xl px-[20px] outline-none border-0"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* PASSWORD */}
          <div
            className="relative flex items-center justify-start w-[90%] h-[50px] rounded-2xl border-2 border-black"
            onClick={() => setInputClicked({ ...inputClicked, password: true })}
          >
            <label
              htmlFor="password"
              className={`absolute left-[20px] p-[5px] bg-white transition-all duration-200 ${
                inputClicked.password || password
                  ? "top-[-18px] text-[13px]"
                  : "top-[5px] text-[15px]"
              }`}
            >
              Enter Your Password
            </label>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className="w-full h-full rounded-2xl px-[20px] outline-none border-0"
              required
              autoComplete="new-password"
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

          {/* ERROR */}
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
            {isLoading ? <ClipLoader color="white" size={30} /> : "Sign Up"}
          </button>

          {/* GOOGLE LOGIN */}
          <div className="mt-2">
            <GoogleLogin
              onSuccess={handleGoogleLoginSuccess}
              onError={() => toast.error("Google login failed")}
            />
          </div>

          <p className="text-gray-800 mt-2">
            Already have an account?{" "}
            <span
              className="border-b-2 border-b-black pb-[3px] text-black hover:text-gray-700 cursor-pointer"
              onClick={() => navigate("/signin")}
            >
              Sign In
            </span>
          </p>
        </form>

        {/* RIGHT SIDE PANEL */}
        <div className="md:w-[50%] h-full hidden lg:flex justify-center items-center bg-[#000000] flex-col gap-[10px] text-white text-[16px] font-semibold rounded-l-[30px] shadow-2xl shadow-black">
          <img src={logo} alt="" className="w-[40%]" />
          <p>Not Just A Platform, It's A VYBE</p>
          <p className="uppercase tracking-wide text-xs flex items-center gap-1 mt-1 text-gray-600">
            <span>🇮🇳</span> Made in India
          </p>
        </div>
      </div>

      {/* GOOGLE USERNAME MODAL WITH SUGGESTIONS */}
      {showUsernameModal && (
        <GoogleUsernameModal
          googleUsername={googleUsername}
          setGoogleUsername={setGoogleUsername}
          usernameSuggestions={usernameSuggestions}
          setUsernameSuggestions={setUsernameSuggestions}
          googleLoading={googleLoading}
          handleSubmit={handleGoogleUsernameSubmit}
          onClose={() => setShowUsernameModal(false)}
          fetchUsernameSuggestions={fetchUsernameSuggestions}
        />
      )}
    </div>
  );
};

export default SignUp;
