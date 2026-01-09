import bcrypt from "bcrypt";

const password = "admin@123"; 

(async () => {
  try {
    const saltRounds = 10;
    const hashed = await bcrypt.hash(password, saltRounds);
    console.log("Hashed Password:", hashed);
  } catch (err) {
    console.error("Error hashing password:", err);
  }
})();

