import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setReelData } from "../redux/features/reelSlice";
import api from "../lib/axios";

const GetAllReels = () => {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);

  useEffect(() => {
    if (!userData?._id) return;

    const fetchAllReels = async () => {
      try {
        const result = await api.get("/reel/get-all-reels");
        const reels = result.data?.reels;
        if (reels) {
          dispatch(setReelData(reels));
        }
      } catch (error) {
        console.error("GetAllReels error:", error);
      }
    };
    fetchAllReels();
  }, [dispatch, userData?._id]);

  return null;
};

export default GetAllReels;
