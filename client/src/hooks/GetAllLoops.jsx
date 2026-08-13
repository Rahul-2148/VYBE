import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setLoopData } from "../redux/features/loopSlice";
import api from "../lib/axios";

const GetAllLoops = () => {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);

  useEffect(() => {
    if (!userData?._id) return;

    const fetchAllLoops = async () => {
      try {
        const result = await api.get("/loop/get-all-loops");
        if (result.data?.loops) {
          dispatch(setLoopData(result.data.loops));
        }
      } catch (error) {
        console.error("GetAllLoops error:", error);
      }
    };
    fetchAllLoops();
  }, [dispatch, userData?._id]);

  return null;
};

export default GetAllLoops;
