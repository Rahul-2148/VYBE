import { Toaster } from "react-hot-toast";
import { useSelector } from "react-redux";
import { Navigate, Route, Routes } from "react-router-dom";
import GetAllLoops from "./hooks/GetAllLoops";
import GetAllPosts from "./hooks/GetAllPosts";
import GetCurrentUser from "./hooks/GetCurrentUser";
import GetSuggestedUsers from "./hooks/GetSuggestedUsers";
import EditProfile from "./pages/EditProfile";
import ForgotPassword from "./pages/ForgotPassword";
import Home from "./pages/Home";
import Loops from "./pages/Loops";
import Profile from "./pages/Profile";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Story from "./pages/Story";
import Upload from "./pages/Upload";
import Messages from "./pages/Messages";
import MessageArea from "./pages/MessageArea";
import GetStoryFeed from "./hooks/GetStoryFeed";

export const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:8000";

function App() {
  GetCurrentUser();
  GetSuggestedUsers();
  GetAllPosts();
  GetAllLoops();
  GetStoryFeed();
  const { userData } = useSelector((state) => state.user);

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={userData ? <Home /> : <Navigate to={"/signin"} />}
        />
        <Route
          path="/signup"
          element={!userData ? <SignUp /> : <Navigate to={"/"} />}
        />
        <Route
          path="/signin"
          element={!userData ? <SignIn /> : <Navigate to={"/"} />}
        />

        {/* OTP flow */}
        <Route
          path="/forgot-password"
          element={!userData ? <ForgotPassword /> : <Navigate to={"/"} />}
        />

        <Route
          path="/profile/:userName"
          element={userData ? <Profile /> : <Navigate to={"/signin"} />}
        />

        <Route
          path="/edit-profile"
          element={userData ? <EditProfile /> : <Navigate to={"/signin"} />}
        />

        <Route
          path="/upload"
          element={userData ? <Upload /> : <Navigate to={"/signin"} />}
        />

        <Route
          path="/loops"
          element={userData ? <Loops /> : <Navigate to={"/signin"} />}
        />

        <Route
          path="/story"
          element={userData ? <Story /> : <Navigate to={"/signin"} />}
        />

        <Route
          path="/messages"
          element={userData ? <Messages /> : <Navigate to={"/signin"} />}
        />

        <Route
          path="/messageArea"
          element={userData ? <MessageArea /> : <Navigate to={"/signin"} />}
        />

        {/* Reset link flow */}
        <Route
          path="/forgot-password/:token"
          element={!userData ? <ForgotPassword /> : <Navigate to={"/"} />}
        />
      </Routes>

      <Toaster />
    </>
  );
}

export default App;
