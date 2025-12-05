const jwt = require("jsonwebtoken");
const SECRET = "RAHASIA_BOT";

module.exports = function(req, res, next){
  const token = req.headers["authorization"];
  if(!token) return res.status(403).json({ message: "Token tidak ada" });

  try{
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch(err){
    res.status(401).json({ message: "Token tidak valid" });
  }
};
