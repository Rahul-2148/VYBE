import { useRef, useState } from "react";
import { MdOutlineKeyboardBackspace } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { SERVER_URL } from "../App";
import dp from "../assets/dp3.png";
import { setProfileData, setUserData } from "../redux/features/userSlice";
import { ClipLoader } from "react-spinners";
import { toast } from "react-hot-toast";
import axios from "axios";

const platformOptions = [
  "Facebook",
  "Instagram",
  "Twitter",
  "YouTube",
  "Custom",
];

const EditProfile = () => {
  const { userData } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);

  const imageInput = useRef(null);

  const [frontendImage, setFrontendImage] = useState(
    userData?.user?.profileImage?.url || dp
  );
  const [backendImage, setBackendImage] = useState(null);

  const [formFields, setFormFields] = useState({
    name: userData?.user?.name || "",
    userName: userData?.user?.userName || "",
    bio: userData?.user?.bio || "",
    profession: userData?.user?.profession || "",
    gender: userData?.user?.gender || "male",
    age: userData?.user?.age || "",
    location: userData?.user?.location || "",
    website: userData?.user?.website || "",
    accountType: userData?.user?.accountType || "public",
  });

  const [links, setLinks] = useState(userData?.user?.links || []);
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLink, setNewLink] = useState({
    platform: "Custom",
    customPlatform: "",
    url: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormFields((prev) => ({ ...prev, [name]: value }));
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    setBackendImage(file);
    setFrontendImage(URL.createObjectURL(file));
  };

  const handleAddLink = () => {
    if (!newLink.url.trim()) return;

    const platformName =
      newLink.platform === "Custom"
        ? newLink.customPlatform.trim() || "Custom"
        : newLink.platform;

    setLinks([...links, { platform: platformName, url: newLink.url }]);

    setNewLink({ platform: "Custom", customPlatform: "", url: "" });
    setShowAddLink(false);
  };

  const handleRemoveLink = (index) => {
    const updated = [...links];
    updated.splice(index, 1);
    setLinks(updated);
  };

  const handleEditProfile = async () => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", formFields.name);
      formData.append("userName", formFields.userName);
      formData.append("bio", formFields.bio);
      formData.append("profession", formFields.profession);
      formData.append("gender", formFields.gender);
      formData.append("age", formFields.age);
      formData.append("location", formFields.location);
      formData.append("website", formFields.website);
      formData.append("accountType", formFields.accountType);

      // Append profile image if changed
      if (backendImage) formData.append("profileImage", backendImage);

      // Append links as JSON string
      formData.append("links", JSON.stringify(links));

      const result = await axios.put(
        `${SERVER_URL}/api/v1/user/edit-profile`,
        formData,
        { withCredentials: true }
      );

      dispatch(setProfileData(result.data));
      dispatch(setUserData(result.data));
      toast.success(result.data.message);
      setIsLoading(false);
      navigate(`/profile/${formFields.userName}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
      setIsLoading(false);
      console.log(error);
    }
  };

  return (
    <div className="w-full min-h-[100vh] bg-black flex flex-col items-center gap-[20px] py-5 px-4">
      {/* Header */}
      <div className="w-full flex items-center gap-4 mb-4">
        <MdOutlineKeyboardBackspace
          className="w-7 h-7 text-white cursor-pointer"
          onClick={() => navigate(`/profile/${userData?.user?.userName}`)}
        />
        <h1 className="text-white text-xl font-semibold">Edit Profile</h1>
      </div>

      {/* Avatar */}
      <div
        className="w-[100px] h-[100px] rounded-full overflow-hidden border-2 border-gray-700 cursor-pointer mb-2"
        onClick={() => imageInput.current.click()}
      >
        <input
          type="file"
          accept="image/*"
          ref={imageInput}
          hidden
          onChange={handleImage}
        />
        <img
          src={frontendImage}
          alt="avatar"
          className="w-full h-full object-cover"
        />
      </div>
      <div
        className="text-blue-500 text-sm font-semibold mb-4 cursor-pointer"
        onClick={() => imageInput.current.click()}
      >
        Change Profile Picture
      </div>

      {/* Form Fields */}
      {[
        { name: "name", placeholder: "Enter name" },
        { name: "userName", placeholder: "Enter username" },
        { name: "bio", placeholder: "Enter bio" },
        { name: "profession", placeholder: "Enter profession" },
      ].map((field, i) => (
        <input
          key={i}
          type="text"
          name={field.name}
          placeholder={field.placeholder}
          value={formFields[field.name]}
          onChange={handleChange}
          className="w-full max-w-[600px] h-12 bg-[#0a1010] border border-gray-700 rounded-2xl text-white px-4 outline-none focus:border-blue-500 mb-2"
        />
      ))}

      <input
        type="number"
        min="0"
        name="age"
        placeholder="Enter age (in years)"
        value={formFields.age}
        onChange={handleChange}
        className="w-full max-w-[600px] h-12 bg-[#0a1010] border border-gray-700 rounded-2xl text-white px-4 outline-none focus:border-blue-500 mb-2 no-spinner"
      />
      <input
        type="text"
        name="location"
        placeholder="Enter location"
        value={formFields.location}
        onChange={handleChange}
        className="w-full max-w-[600px] h-12 bg-[#0a1010] border border-gray-700 rounded-2xl text-white px-4 outline-none focus:border-blue-500 mb-2"
      />
      <input
        type="text"
        name="website"
        placeholder="Enter primary website"
        value={formFields.website}
        onChange={handleChange}
        className="w-full max-w-[600px] h-12 bg-[#0a1010] border border-gray-700 rounded-2xl text-white px-4 outline-none focus:border-blue-500 mb-2"
      />

      {/* Gender */}
      <select
        name="gender"
        value={formFields.gender}
        onChange={handleChange}
        className="w-full max-w-[600px] h-12 bg-[#0a1010] border border-gray-700 rounded-2xl text-white px-4 outline-none mb-2"
      >
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="other">Other</option>
      </select>

      {/* Account Type */}
      <select
        name="accountType"
        value={formFields.accountType}
        onChange={handleChange}
        className="w-full max-w-[600px] h-12 bg-[#0a1010] border border-gray-700 rounded-2xl text-white px-4 outline-none mb-4"
      >
        <option value="public">Public</option>
        <option value="private">Private</option>
      </select>

      {/* Links Section */}
      <div className="w-full max-w-[600px] mb-4">
        <h2 className="text-white font-semibold mb-2">Links</h2>
        {links.map((link, idx) => (
          <div
            key={idx}
            className="flex justify-between items-center bg-[#111] p-2 rounded mb-2"
          >
            <div>
              <p className="text-white font-medium">{link.platform}</p>
              <p className="text-gray-400 text-sm truncate">{link.url}</p>
            </div>
            <button
              className="text-red-500 font-medium"
              onClick={() => handleRemoveLink(idx)}
            >
              Remove
            </button>
          </div>
        ))}

        {/* Add Link Button */}
        {!showAddLink && (
          <button
            className="w-full bg-gray-700 text-white py-2 rounded mt-1 font-medium"
            onClick={() => setShowAddLink(true)}
          >
            + Add Link
          </button>
        )}

        {/* Add Link Form */}
        {showAddLink && (
          <div className="bg-[#111] p-3 rounded mt-2 flex flex-col gap-2">
            {/* Platform Dropdown */}
            <select
              className="w-full bg-[#0a1010] text-white p-2 rounded border border-gray-700 outline-none"
              value={newLink.platform}
              onChange={(e) =>
                setNewLink((prev) => ({ ...prev, platform: e.target.value }))
              }
            >
              {platformOptions.map((option, i) => (
                <option key={i} value={option}>
                  {option}
                </option>
              ))}
            </select>

            {/* Custom Platform Name (Only for Custom) */}
            {newLink.platform === "Custom" && (
              <input
                type="text"
                placeholder="Enter platform name (e.g. GitHub, LinkedIn)"
                className="w-full bg-[#0a1010] text-white p-2 rounded border border-gray-700 outline-none"
                value={newLink.customPlatform}
                onChange={(e) =>
                  setNewLink((prev) => ({
                    ...prev,
                    customPlatform: e.target.value,
                  }))
                }
              />
            )}

            {/* URL */}
            <input
              type="url"
              placeholder="Enter URL"
              className="w-full bg-[#0a1010] text-white p-2 rounded border border-gray-700 outline-none"
              value={newLink.url}
              onChange={(e) =>
                setNewLink((prev) => ({ ...prev, url: e.target.value }))
              }
            />

            <div className="flex gap-2">
              <button
                className="flex-1 bg-blue-600 py-2 rounded text-white font-medium"
                onClick={handleAddLink}
              >
                Add
              </button>
              <button
                className="flex-1 bg-gray-600 py-2 rounded text-white font-medium"
                onClick={() => {
                  setShowAddLink(false);
                  setNewLink({
                    platform: "Custom",
                    customPlatform: "",
                    url: "",
                  });
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <button
        onClick={handleEditProfile}
        disabled={isLoading}
        className="w-full max-w-[600px] bg-white py-3 rounded-2xl font-semibold hover:bg-gray-200 flex justify-center items-center"
      >
        {isLoading ? (
          <ClipLoader size={28} color="#36d7b7" />
        ) : (
          "Update Profile"
        )}
      </button>
    </div>
  );
};

export default EditProfile;
