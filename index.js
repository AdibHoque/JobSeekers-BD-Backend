require("dotenv").config();
const express = require('express');
const cors = require('cors');
const app = express()
const port = process.env.PORT || 5000
const jwt = require('jsonwebtoken');

const cookieParser = require('cookie-parser');
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://jobseekers-bd.web.app',
    'https://jobseekers-bd.firebaseapp.com'
  ],
  credentials: true
}))
app.use(express.json())
app.use(cookieParser());

const logger = (req, res, next) => {
  console.log('logging info', req.method, req.url);
  next();
}
const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: 'Unauthorized Access' })
  }
  jwt.verify(token, process.env.SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'Unauthorized Access' })
    }
    req.user = decoded;
    next();
  })
}

app.get("/", (req, res) => {
  res.send("API server is running for JobSeekers!")
})

app.listen(port, () => {
  console.log("Listening to Port: ", port)
})

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.knvnnno.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server(optional starting in v4.7)
    await client.connect();

    const jobCollection = client.db('JobSeekers').collection('jobs');
    const appliedJobCollection = client.db('JobSeekers').collection('appliedJobs');

    app.post('/jwt', logger, async (req, res) => {
      const user = req.body;

      const token = jwt.sign(user, process.env.SECRET, { expiresIn: '1h' });

      res.cookie('token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'none'
      })
        .send({ success: true });
    })

    app.post('/logout', async (req, res) => {
      console.log("Logout")
      res.clearCookie('token', { maxAge: 0 }).send({ success: true })
    })

    app.get("/jobs", verifyToken, async (req, res) => {
      const idQuery = req.query.id
      const emailQuery = req.query.email

      if (emailQuery) {
        const q = { email: emailQuery }
        const cursor = await jobCollection.find(q);
        const result = await cursor.toArray();
        return res.send(result);
      }

      if (idQuery) {
        const q = { _id: new ObjectId(idQuery) }
        const result = await jobCollection.findOne(q);
        return res.send(result);
      }

      const cursor = jobCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.post('/jobs', verifyToken, async (req, res) => {
      const newJob = req.body;
      const result = await jobCollection.insertOne(newJob);
      res.send(result);
    })

    app.delete('/jobs', verifyToken, async (req, res) => {
      const id = req.query.id;
      const query = { _id: new ObjectId(id) }
      const result = await jobCollection.deleteOne(query);
      res.send(result);
    })

    app.put('/jobs/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const updatedJob = req.body;

      const job = {
        $set: {
          category: updatedJob.category,
          name: updatedJob.name,
          email: updatedJob.email,
          job_title: updatedJob.job_title,
          job_posting_date: updatedJob.job_posting_date,
          application_deadline: updatedJob.application_deadline,
          salary_range: updatedJob.salary_range,
          job_applicants_number: updatedJob.job_applicants_number,
          image: updatedJob.image,
          job_description: updatedJob.job_description,
        }
      }

      const result = await jobCollection.updateOne(query, job);
      res.send(result);
    })

    app.get("/appliedjobs", verifyToken, async (req, res) => {
      const idQuery = req.query.id
      const emailQuery = req.query.email

      if (emailQuery) {
        const q = { email: emailQuery }
        const cursor = await appliedJobCollection.find(q);
        const result = await cursor.toArray();
        return res.send(result);
      }

      if (idQuery) {
        const q = { _id: new ObjectId(idQuery) }
        const result = await appliedJobCollection.findOne(q);
        return res.send(result);
      }

      const cursor = appliedJobCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.post('/appliedjobs/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const update = {
        $inc: {
          job_applicants_number: 1
        }
      }
      const newJob = req.body;
      const result = await appliedJobCollection.insertOne(newJob);
      const result2 = await jobCollection.updateOne(query, update);

      res.send(result);
    })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

