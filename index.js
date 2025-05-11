require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const port = process.env.PORT || 5000;

// create the express app
const app = express();

// Global middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://career-bf062.web.app",
      "https://career-bf062.firebaseapp.com"
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// token verification middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    res.status(401);
    res.send({ message: "Unauthorized access" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.decoded = decoded;

    next();
  } catch (error) {
    res.status(401);
    res.send({ message: "Unauthorized access" });
  }
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cu6ru.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );

    // database & collections
    const jobsCollection = client.db("jobPortal").collection("jobs");
    const jobApplicationCollection = client
      .db("jobPortal")
      .collection("jobApplications");

    // jobs apis
    app.get("/jobs", async (req, res) => {
      const cursor = jobsCollection.find();
      const result = await cursor.toArray();

      res.send(result);
    });

    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.findOne(query);

      res.send(result);
    });

    // job application apis
    app.get("/applications", verifyToken, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;

      if (email !== decodedEmail) {
        res.status(403);
        res.send({ message: "Forbidden access" });
      }

      const jobApplications = await jobApplicationCollection
        .find({ user_email: email })
        .toArray();

      const jobDetails = await Promise.all(
        jobApplications.map(async (application) => {
          const jobDetail = await jobsCollection.findOne({
            _id: new ObjectId(application.jobId),
          });

          return {
            ...application,
            jobDetail,
          };
        })
      );

      res.send(jobDetails);
    });

    app.post("/apply", async (req, res) => {
      const applicationInfo = req.body;
      const result = await jobApplicationCollection.insertOne(applicationInfo);

      res.send(result);
    });

    // payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const {price} = req.body;
      const amount = parseInt(price * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });

    // jwt apis
    app.post("/generate-token", (req, res) => {
      const user = req.body;

      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "1d" });

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      });

      res.send({ success: true });
    });

    app.get("/remove-token", (req, res) => {
      res.clearCookie("token", {
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      });

      res.send({ success: true });
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Career server");
});

app.listen(port, () => {
  console.log(`Career server is running on port: ${port}`);
});
