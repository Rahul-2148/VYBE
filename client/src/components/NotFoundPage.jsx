import { useNavigate } from "react-router-dom";
import logo2 from "../assets/logo2.png";

/**
 * NotFoundPage — Dedicated 404 page for the wildcard * route.
 *
 * Replaces the previous blind redirect to "/" with an informative,
 * Vybe-branded "page not found" experience.
 */
const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="w-screen h-screen bg-bg flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <img src={logo2} alt="VYBE" className="w-16 h-16 object-contain opacity-60" />
        </div>

        {/* 404 */}
        <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-pink-500 leading-none">
          404
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-text">
          Page not found
        </h1>

        {/* Message */}
        <p className="text-text-secondary text-sm leading-relaxed">
          The page you're looking for doesn't exist, has been removed, or the link is broken.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 text-sm font-semibold text-text border border-border rounded-xl hover:bg-surface transition-all duration-200 cursor-pointer"
          >
            Go Back
          </button>
          <button
            onClick={() => navigate("/")}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-500 rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all duration-200 shadow-lg shadow-rose-500/20 cursor-pointer"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
