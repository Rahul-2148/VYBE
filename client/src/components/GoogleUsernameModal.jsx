// src/components/GoogleUsernameModal.jsx
import { ClipLoader } from "react-spinners";

const GoogleUsernameModal = ({
  googleUsername,
  setGoogleUsername,
  usernameSuggestions,
  setUsernameSuggestions,
  googleLoading,
  handleSubmit,
  onClose,
  fetchUsernameSuggestions,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-xl w-[90%] max-w-[400px] flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Choose a username</h2>

        <input
          type="text"
          placeholder="Enter username"
          className="border-2 border-gray-300 rounded-xl p-2"
          value={googleUsername}
          onChange={(e) => {
            setGoogleUsername(e.target.value);
            fetchUsernameSuggestions(e.target.value);
          }}
        />

        {/* Suggestions */}
        {usernameSuggestions.length > 0 && (
          <div className="bg-white border border-gray-300 rounded-xl p-2 text-sm">
            {usernameSuggestions.map((u, i) => (
              <p
                key={i}
                className="p-2 cursor-pointer hover:bg-gray-100 rounded-lg"
                onClick={() => {
                  setGoogleUsername(u);
                  setUsernameSuggestions([]);
                }}
              >
                {u}
              </p>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-2">
          <button
            className="bg-gray-300 px-4 py-2 rounded-xl"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            className="bg-black text-white px-4 py-2 rounded-xl flex items-center justify-center"
            onClick={handleSubmit}
            disabled={googleLoading}
          >
            {googleLoading ? <ClipLoader size={20} color="white" /> : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoogleUsernameModal;
