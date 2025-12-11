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
    const PremuimUsersCollection = cityFixDB.collection("premuimUsers");
    const usersCollection = cityFixDB.collection("users");
    const sttafsCollection = cityFixDB.collection("sttafs");

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
      const result = await issuesCollection
        .find(query)
        .sort({ priority: 1, createAt: -1 })
        .toArray();
      res.send(result);
    });

    app.get("/allIssues", async (req, res) => {
      const result = await issuesCollection
        .find()
        .sort({ priority: 1 })
        .toArray();
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

    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().skip(1).toArray();
      res.send(result);
    });
    // get single user
    app.get("/users/:email", async (req, res) => {
      const { email } = req.params;
      query = { email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    app.patch("/users/:id", async (req, res) => {
      const { accountStatus } = req.body;
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const updatedocs = {
        $set: {
          accountStatus,
        },
      };
      const result = await usersCollection.updateOne(query, updatedocs);
      res.send(result);
    });

    // sttafs related apis

    app.post("/sttafs", async (req, res) => {
      const sttaf = req.body;
      const existingSttaf = await sttafsCollection.findOne({
        email: sttaf.email,
      });
      if (existingSttaf) return;
      const result = await sttafsCollection.insertOne(sttaf);
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
          displayName: paymentInfo.displayName,
        },
        success_url: `${process.env.SITE_DOMAIN}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.SITE_DOMAIN}/payment-cancel`,
      });
      // console.log(session);
      res.send({ url: session.url });
    });

    app.post("/premium-checkout-session", async (req, res) => {
      const boostInfo = req.body;
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            // Provide the exact Price ID (for example, price_1234) of the product you want to sell
            price_data: {
              currency: "bdt",
              unit_amount: 100000,
              product_data: {
                name: `Please Pay to make  ${boostInfo.displayName} Premuim User`,
              },
            },
            quantity: 1,
          },
        ],
        customer_email: boostInfo.email,
        mode: "payment",
        metadata: {
          userId: boostInfo.userId,
          isSubscribed: boostInfo.isSubscribed,
          planType: boostInfo.planType,
          displayName: boostInfo.displayName,
        },
        success_url: `${process.env.SITE_DOMAIN}/premuim-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.SITE_DOMAIN}/premuim-cancel`,
      });
      // console.log(session);
      res.send({ url: session.url });
    });

    app.patch("/payment-success", async (req, res) => {
      const sessionId = req.query.session_id;
      // console.log(sessionId);
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      // for fixing duplicate payment
      const transactionId = session.payment_intent;
      const existingPayment = await paymentCollection.findOne({
        transactionId,
      });
      if (existingPayment) {
        return res.send({ success: true, message: "Already paid" });
      }

      if (session.payment_status === "paid") {
        const id = session.metadata.issueId;
        const query = { _id: new ObjectId(id) };
        const update = {
          $set: {
            paymentStatus: "paid",
            priority: "high",
          },
          $push: {
            timeline: {
              status: "pending",
              message: "Issue Boosted",
              updatedBy: {
                role: "citizen",
                name: session.metadata.displayName,
                email: session.customer_email,
              },
              createdAt: new Date(),
            },
          },
        };

        const result = await issuesCollection.updateOne(
          { ...query, paymentStatus: { $ne: "paid" } },
          update
        );

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

        const resultPayment = await paymentCollection.insertOne(payment);
        return res.send({
          success: true,
          modifyStatus: result,
          paymentInfo: resultPayment,
        });
      }
      // console.log("session retrieve ", session);
      return res.send({ success: false });
    });

    app.patch("/premuim-success", async (req, res) => {
      const sessionId = req.query.session_id;
      // console.log(sessionId);
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      // for fixing duplicate payment
      const transactionId = session.payment_intent;
      const premuimUsers = await PremuimUsersCollection.findOne({
        transactionId,
      });
      if (premuimUsers) {
        return res.send({ success: true, message: "Already Premuim" });
      }

      if (session.payment_status === "paid") {
        const id = session.metadata.userId;
        const query = { _id: new ObjectId(id) };
        const update = {
          $set: {
            isSubscribed: true,
            planType: "premuim",
            transactionId: session.payment_intent,
            paymentStatus: session.payment_status,
            paidAt: new Date(),
          },
        };

        const result = await usersCollection.updateOne(
          { ...query, isSubscribed: { $ne: true } },
          update
        );

        const payment = {
          amount: session.amount_total / 100,
          currency: session.currency,
          email: session.customer_email,
          userId: session.metadata.userId,
          displayName: session.metadata.displayName,
          transactionId: session.payment_intent,
          paymentStatus: session.payment_status,
          paidAt: new Date(),
        };

        const resultPayment = await PremuimUsersCollection.insertOne(payment);
        return res.send({
          success: true,
          modifyStatus: result,
          paymentInfo: resultPayment,
        });
      }
      // console.log("session retrieve ", session);
      return res.send({ success: false });
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
