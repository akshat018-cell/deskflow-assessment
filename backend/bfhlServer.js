const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/bfhl", (req, res) => {
  res.status(200).json({ operation_code: 1 });
});

app.post("/bfhl", (req, res) => {
  const { data } = req.body;

  if (!data || !Array.isArray(data)) {
    return res.status(400).json({ is_success: false });
  }

  const numbers = data.filter((item) => !isNaN(item) && item.trim() !== "");
  const alphabets = data.filter((item) => /^[a-zA-Z]$/.test(item));

  const highestAlphabet =
    alphabets.length > 0
      ? [alphabets.reduce((a, b) => (a.toLowerCase() > b.toLowerCase() ? a : b))]
      : [];

  res.status(200).json({
    is_success: true,
    user_id: "akshat_khandelwal_26052026",
    email: "akshat.khandelwal2024@vitbhopal.ac.in",
    roll_number: "23BCE10877",
    numbers,
    alphabets,
    highest_alphabet: highestAlphabet,
  });
});

const PORT = process.env.BFHL_PORT || 3001;
app.listen(PORT, () => {
  console.log(`BFHL server running on port ${PORT}`);
});
