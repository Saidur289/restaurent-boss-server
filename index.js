const express = require('express')
require('dotenv').config()
const cors = require('cors');
const app = express()
const port = process.env.PORT || 5000
app.use(cors())
app.use(express.json())



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9cbr8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const menuCollection = client.db('bossDB').collection('menu')
    const reviewCollection = client.db('bossDB').collection('reviews')
    const cartsCollection = client.db('bossDB').collection('carts')
  
    //  work - 1 get data from database 
    app.get('/menu', async(req, res) => {
        const result = await menuCollection.find().toArray()
        res.send(result)
    })
    // work - 2 get data from database
    app.get('/reviews', async(req, res) => {
        const result = await reviewCollection.find().toArray()
        res.send(result)
    })
    // work - 3 post data to cartsCollection
    app.post('/carts', async(req, res) => {
      const cart = req.body 
      const result = await cartsCollection.insertOne(cart)
      res.send(result)
    })
    // work - 4 get data from cartsCollection
    app.get('/carts', async(req, res) => {
      const email = req.query.email 
      const query = {email: email}
      const result = await cartsCollection.find(query).toArray()
      res.send(result)
    })
    // work - 5 delete data from cartsCollection
    app.delete('/carts/:id', async(req, res) => {
      const id = req.params.id 
      const query = {_id: new ObjectId(id)}
      const result = await cartsCollection.deleteOne(query)
      res.send(result)
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

app.get('/', (req, res) => {
  res.send('bistro boss menu and review coming...')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})