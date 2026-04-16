import axios from "axios";
import { useEffect } from "react";
import { SERVER_URL } from "../App";
import { useDispatch, useSelector } from "react-redux";
import { setLoopData } from "../redux/features/loopSlice";

const GetAllLoops = () => {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);

  useEffect(() => {
    const fetchAllLoops = async () => {
      try {
        const result = await axios.get(
          `${SERVER_URL}/api/v1/loop/get-all-loops`,
          {
            withCredentials: true,
          }
        );
        // console.log(result);
        dispatch(setLoopData(result?.data?.loops));
      } catch (error) {
        console.log(error);
      }
    };
    fetchAllLoops();
  }, [dispatch, userData]);
};

export default GetAllLoops;
