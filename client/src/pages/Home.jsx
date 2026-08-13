import React from "react";
import LeftHome from "../components/LeftHome";
import Feed from "../components/Feed";
import RightHome from "../components/RightHome";

const Home = () => {
  return (
    <div className="w-full h-screen bg-bg text-text flex justify-center overflow-hidden">
      <div className="w-full max-w-[1440px] flex justify-between h-full w-full">
        {/* Fixed Left Sidebar Navigation */}
        <LeftHome />
        
        {/* Middle Scrolling Feed */}
        <Feed />
        
        {/* Fixed Right Suggestions Sidebar */}
        <RightHome />
      </div>
    </div>
  );
};

export default Home;
