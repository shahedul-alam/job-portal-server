const express = require('express');
const cors = require('cors');
require("dotenv").config();
const port = process.env.PORT || 5000;

// create the express app
const app = express();

// middleware
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Career server');
});

app.listen(port, () => {
  console.log(`Career server is running on port: ${port}`);
});
