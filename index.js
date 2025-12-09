const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET);

const port = process.env.PORT || 5000;

// middleware
app.use(express.json());
app.use(cors());

//mongodb
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vybtxro.mongodb.net/?appName=Cluster0`;

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

    // database collecitons

    const cityFixDB = client.db("cityFixDB");
    const issuesCollection = cityFixDB.collection("issues");
    const districtbyRegionCollection = cityFixDB.collection("districtbyRegion");
    const paymentCollection = cityFixDB.collection("payments");
    const usersCollection = cityFixDB.collection("users");

    // issue related apis
    app.post("/issues", async (req, res) => {
      const issue = req.body;
      const result = await issuesCollection.insertOne(issue);
      res.send(result);
    });

    app.get("/issues", async (req, res) => {
      const query = {};
      const { email } = req.query;
      if (email) {
        query.email = email;
      }
      const options = { sort: { createAt: -1 } };
      const result = await issuesCollection.find(query, options).toArray();
      res.send(result);
    });
    // get single issues data
    app.get("/issues/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await issuesCollection.findOne(query);
      res.send(result);
    });
    app.get("/payment/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await issuesCollection.findOne(query);
      res.send(result);
    });
    // update issues

    app.patch("/issues/:id", async (req, res) => {
      const { issueTitle, photo, district, region, number, information, area } =
        req.body;
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const updatedocs = {
        $set: {
          issueTitle,
          photo,
          district,
          region,
          number,
          information,
          area,
        },
      };
      const result = await issuesCollection.updateOne(query, updatedocs);
      res.send(result);
    });

    //delete issues
    app.delete("/issues/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await issuesCollection.deleteOne(query);
      res.send(result);
    });

    // district by region apis

    app.get("/districtbyRegion", async (req, res) => {
      const result = await districtbyRegionCollection.find().toArray();
      res.send(result);
    });

    // user related apis

    app.post("/users", async (req, res) => {
      const user = req.body;
      const existingUser = await usersCollection.findOne({ email: user.email });
      if (existingUser) return;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // payment related api

    app.post("/create-checkout-session", async (req, res) => {
      const paymentInfo = req.body;
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            // Provide the exact Price ID (for example, price_1234) of the product you want to sell
            price_data: {
              currency: "bdt",
              unit_amount: 10000,
              product_data: {
                name: `Please Pay for ${paymentInfo.issueTitle}`,
              },
            },
            quantity: 1,
          },
        ],
        customer_email: paymentInfo.email,
        mode: "payment",
        metadata: {
          issueId: paymentInfo.issueId,
          issueTitle: paymentInfo.issueTitle,
          issueTitle: paymentInfo.issueTitle,
          trackingId: paymentInfo.trackingId,
        },
        success_url: `${process.env.SITE_DOMAIN}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.SITE_DOMAIN}/payment-cancel`,
      });
      // console.log(session);
      res.send({ url: session.url });
    });

    app.patch("/payment-success", async (req, res) => {
      const sessionId = req.query.session_id;
      // console.log(sessionId);
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status === "paid") {
        const id = session.metadata.issueId;
        const query = { _id: new ObjectId(id) };
        const update = {
          $set: {
            paymentStatus: "paid",
            priority: "high",
          },
        };
        const result = await issuesCollection.updateOne(query, update);

        const payment = {
          amount: session.amount_total / 100,
          currency: session.currency,
          customer_email: session.customer_email,
          issueId: session.metadata.issueId,
          issueTitle: session.metadata.issueTitle,
          trackingId: session.metadata.trackingId,
          transactionId: session.payment_intent,
          paymentStatus: session.payment_status,
          paidAt: new Date(),
        };

        if (session.payment_status === "paid") {
          const resultPayment = await paymentCollection.insertOne(payment);
          res.send({
            success: true,
            modifyStatus: result,
            paymentInfo: resultPayment,
          });
        }
      }
      // console.log("session retrieve ", session);
      res.send({ success: false });
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "✅Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
