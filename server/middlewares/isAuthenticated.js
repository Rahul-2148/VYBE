import jwt from "jsonwebtoken";

const isAuthenticated = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "User not authenticated!" }); // token not found
    }

    const verifyToken = jwt.verify(token, process.env.JWT_SECRET);
    if (!verifyToken) {
      return res.status(401).json({ message: "token not valid" }); 
    }

    req.userId = verifyToken.userId; // user id from token

    next();
  } catch (error) {
    return res
      .status(500)
      .json({ message: `isAuthenticated error: ${error.message}` });
  }
};

export default isAuthenticated;
