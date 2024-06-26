const express = require("express");
const jwt = require("jsonwebtoken");

// ----- py -------
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
// app.use(express.static("public"));


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
    // await client.connect();

    const userCollection = client.db("restoDB").collection("users");
    const menuCollection = client.db("restoDB").collection("menu");
    const reviewCollection = client.db("restoDB").collection("reviews");
    const cardCollection = client.db("restoDB").collection("cards");
    const paymentCollection = client.db("restoDB").collection("payments");

    // user related api
    app.post("/users", async (req, res) => {
      const user = req.body;
      // google login user allready existing or not
      // insert email if users dose not exists
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({
          message: "user all ready existing ",
          insertedId: null,
        });
      }

      const result = await userCollection.insertOne(user);
      res.send(result);
    });

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
      // console.log(result);
    });

    // card add Database
    app.post("/cards", async (req, res) => {
      const cardItem = req.body;
      const result = await cardCollection.insertOne(cardItem);
      res.send(result);
    });

    // delete Dashbord
    app.delete("/cards/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cardCollection.deleteOne(query);
      res.send(result);
    });

    // middlewares -> 3
    const verifyToken = (req, res, next) => {
      // console.log("insert verify token", req.headers.authorization);

      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorization access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      // jwt web/git viryfi
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: " unauthorization  access" });
        }
        req.decoded = decoded;
        next();
      });
      // next();
    };

    // user verifyAdmin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // Admin user related api
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // Admin user related api  some user see admin panel
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    //user deleted
    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // user admin
    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );

    //  jwt related api -> 1
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // ------------------- Menu inserted database -------------------------

    app.post("/menu", verifyToken, verifyAdmin, async (req, res) => {
      const menu = req.body;
      const result = await menuCollection.insertOne(menu);
      res.send(result);
    });
    // ------------------- Menu Deleted database -------------------------

    app.delete("/menu/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollection.deleteOne(query);
      res.send(result);
    });

    // ------------------- Menu Update database -------------------------
    app.get("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollection.findOne(query);
      res.send(result);
    });

    // ------------------- Menu Update->  database -------------------------
    app.patch("/menu/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          name: item.name,
          catagory: item.category,
          price: item.price,
          racipe: item.racipe,
          Image: item.image,
        },
      };

      const result = await menuCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // ------------------- payment intent stripe DOC  --------------- s -> 3
    app.post("/create-payment-intent", verifyToken, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount , 'amount the insert ');

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // ----------------- payment save in database  ------------------
   app.post('/payments', async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);

      //  carefully delete each item from the cart
      // console.log('payment info', payment);
      // const query = {_id : {
      //   $in: payment.cardIds.map(id => new ObjectId (id) )
      // }}
      // const deleteResult = await cardCollection.deleteMany(query);

      res.send({ paymentResult  });
    })

    // ----------------- Payment History -----------------
    app.get('/payments/:email',verifyToken , async(req,res)=> {
      const query = { email : req.params.email};
      // email not match 
      if(req.params.email !== req.decoded.email){
        return res.status(403).send({message : 'forbedden access'})
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    })

      // ----------------- Admin Stats -----------------
    app.get('/admin-stats' , verifyToken , verifyAdmin, async(req,res)=> {
      const user = await userCollection.estimatedDocumentCount();
      const menuIems = await menuCollection.estimatedDocumentCount();
      const orders = await paymentCollection.estimatedDocumentCount();

      // bangla
      // const payments = await paymentCollection.find().toArray();
      // const revenue = payments.reduce((items, payment) => items+payment.price ,0)

      // update
      const result  = await paymentCollection.aggregate([
        {
          $group:{
            _id: null,
            totalReveneu : {
              $sum : '$price'
            }
          }
        }
      ]).toArray();

      const revenue = result.length > 0 ? result[0].totalReveneu : 0;

      res.send({
        user,
        menuIems,
        orders,
        revenue
      })
    })

    // ----------------usintg aggregate pipeline --------------
    
    app.get('/order-stats', async (req,res)=>{
      const result = await paymentCollection.aggregate([

        {
          $unwind: '$menuItemIds' // split the array into separate documents
        },
        {
          $lookup:{
            from: 'menu',
            localField: 'menuItemIds',
            foreignField: '_id',
            as:'menuItems'
          }
        },
        {
          $unwind:'$menuItems'
        },
        {
          $group:{
            _id:'$menuItems.category',
            quantity:{
              $sum:1
            },
            revenue:{
              $sum: '$menuItems.price'
            }
          }
        },
        {
          $project: {
            _id: 0,
            category: '$_id',
            quantity: '$quantity',
            revenue : '$revenue'
          }
        }


      ]).toArray();

      res.send({
        result,
      })
    })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
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
