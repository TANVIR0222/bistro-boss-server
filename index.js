const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const cors = require("cors");
const port = process.env.PORT || 5000;

//mid

const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.htwfwrv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    const userCollection = client.db("restoDB").collection("users");
    const menuCollection = client.db("restoDB").collection("menu");
    const reviewCollection = client.db("restoDB").collection("reviews");
    const cardCollection = client.db("restoDB").collection("cards");

    // Admin user 


    // user related api
    app.post('/users', async(req , res)=>{
      const user = req.body;
      // google login user allready existing or not 
      // insert email if users dose not exists
      const query = {email : user.email }
      const existingUser = await userCollection.findOne(query);
      if(existingUser){
        return res.send({ message : 'user all ready existing ' , insertedId : null})
      }

      const result = await userCollection.insertOne(user);
      res.send(result);
    })


    // menu all data get database
    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });

    app.get("/reviews", async (req, res) => {
      const resut = await reviewCollection.find().toArray();
      res.send(resut);
    });

    //get database
    app.get("/cards", async (req, res) => {
      //one user data
      const email = req.query.email;
      const query = { email: email };
      const result = await cardCollection.find(query).toArray();
      res.send(result);
      console.log(result);
    });

    // card add Database
    app.post("/cards", async (req, res) => {
      const cardItem = req.body;
      const result = await cardCollection.insertOne(cardItem);
      res.send(result);
    });

    // delete Dashbord
    app.delete('/cards/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id : new ObjectId(id)};
      const result = await cardCollection.deleteOne(query);
      res.send(result)
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("bistro-boss-server is running ");
});

app.listen(port, () => {
  console.log(`bistro-boss-server is running this port ${port}`);
});

//
//
