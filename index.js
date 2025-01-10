const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;

// create the express app
const app = express();

// middleware
app.use(cors());
app.use(express.json());

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
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

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
    app.get("/applications", async (req, res) => {
      const email = req.query.email;
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
