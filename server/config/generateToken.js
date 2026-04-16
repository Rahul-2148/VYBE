import jwt from "jsonwebtoken";

const generateToken = async (userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "10y", // 10 years
  });
  return token;
};

export default generateToken;
