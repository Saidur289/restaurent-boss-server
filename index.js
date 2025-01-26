const express = require('express')
require('dotenv').config()
var morgan = require('morgan')
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.PAYMENT_KEY);
const cookieParser = require('cookie-parser')
const store_id = 'bistr67951d2a185e3'
const store_passwd = 'bistr67951d2a185e3@ssl'
const cors = require('cors');
const app = express()
const port = process.env.PORT || 5000
app.use(express.json())
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  optionSuccessStatus: 200,
}))
app.use(cookieParser())
app.use(morgan('dev'))
app.use(express.urlencoded())

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { default: axios } = require('axios');
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
    const usersCollection = client.db('bossDB').collection('users')
    const paymentsCollection = client.db('bossDB').collection('payments')
    app.post('/jwt', async(req, res) => {
      const email = req.body
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '365d'})
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      }).send({success: true})
    })
    // logout 
    app.get('/logout', async(req, res) => {
      try{
        res.clearCookie('token', {
          maxAge: 0,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        }).send({success: true})
      }
      catch (err) {
        res.status(500).send(err)
      }
    })
    const verifyToken = async (req, res, next) => {
      const token = req.cookies?.token 
      if(!token) return res.status(401).send({ message: 'unauthorized access' })
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if(err){
        return res.status(401).send({ message: 'unauthorized access' })
      }
      req.user = decoded
      next()
      })
    }
    // verify admin verify
    const verifyAdmin = async(req, res, next) => {
      const email = req.user?.email 
      const query = {email: email}
      const user = await usersCollection.findOne(query)
      const isAdmin = user?.role === 'admin'
      if(!isAdmin){
        return res.status(403).send({message: 'Forbidden Access'})
    
      }
      next()
    }
    //  work - 1 get data from database 
    app.get('/menu', async(req, res) => {
        const result = await menuCollection.find().toArray()
        res.send(result)
    })
    app.post('/menu', verifyToken, verifyAdmin, async(req, res) => {
      const item = req.body
      const result = await menuCollection.insertOne(item)
      res.send(result)
    })
    app.delete('/menu/:id', async(req, res) => {
      const id = req.params.id 
      const query = {_id: new ObjectId(id)}
      const result = await menuCollection.deleteOne(query)
      res.send(result)
    })
    app.get('/menu/:id', async(req, res) => {
      const id = req.params.id 
      const query = {_id: new ObjectId(id)}
      const result = await menuCollection.findOne(query)
      res.send(result)
    })
    app.put('/menu/:id', async(req, res) => {
      const item = req.body
      const id = req.params.id 
      const query = {_id: new ObjectId(id)}
      const updateDoc = {
        $set: item
      }
      const result = await menuCollection.updateOne(query, updateDoc)
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
    app.get('/carts', verifyToken,  async(req, res) => {
      const email = req.query.email 
      if(email !== req.user?.email){
        return res.status(403).send({message: 'unathorizided Access'})
      }
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
    // users collection work start here 
    app.post('/users', async(req, res) => {
      const user = req.body 
      const email = user?.email
      const query = {email: email}
      const isExists = await usersCollection.findOne(query)
      if(isExists) return res.send(isExists)
        const result = await usersCollection.insertOne(user)
      res.send(result)
    })
    app.get('/users',verifyToken, verifyAdmin,  async(req, res) => {
       const result = await usersCollection.find().toArray()
       res.send(result)
    })
    app.delete('/users/:id', verifyToken, verifyAdmin,  async(req, res) => {
      const id = req.params.id 
      const query = {_id: new ObjectId(id)}
      const result = await usersCollection.deleteOne(query)
      res.send(result)
    })
    app.patch('/users/admin/:id', verifyToken,verifyAdmin,  async(req, res) => {
      const id = req.params.id 
      const query = {_id: new ObjectId(id)}
      const updateDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(query, updateDoc)
      res.send(result)
    })
    app.get('/users/admin/:email', verifyToken,  async(req, res) => {
      const email = req.params.email
      if(email !== req.user?.email){
        return res.status(403).send({message: 'unauthorized Access'})
      }
      const query = {email: email}
      const user = await usersCollection.findOne(query)
      let admin = false
      if(user){
        admin = user?.role === 'admin'
      }
      res.send({admin})
      
    })
    app.post('/create-payment-intent', verifyToken, async(req, res) => {
      const {price} = req.body 
      const amount = parseInt(price * 100)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      })
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    })
    app.post('/payments', verifyToken, async(req, res) => {
      const payment = req.body
      const paymentResult = await paymentsCollection.insertOne(payment)
      const query = {_id: {
        $in: payment?.cartIds.map(id => new ObjectId(id))
      }}
      const deleteResult = await cartsCollection.deleteMany(query)
      res.send({paymentResult, deleteResult})
      
    })
    // get data show on payment history 
    app.get('/payments/:email', verifyToken, async(req, res) => {
      const query = {email: req.params.email}
      if(req?.user?.email !== req.params.email) return res.status(403).send({message: 'Forbidden Access'})
        const result = await paymentsCollection.find(query).toArray()
        res.send(result)
    })
    // route for ssl comerz payment gateway
    app.post('/create-ssl-payment', async(req, res) => {
      const payment = req.body
      const trxid = new ObjectId().toString()
      payment.transactionId = trxid
      console.log(payment);
      // step - 1 create intiate 
      const initiate = {
        store_id: store_id,
        store_passwd: store_passwd,
         total_amount: `${payment.price}`,
         currency: 'BDT',
         tran_id: trxid, // use unique tran_id for each api call
         success_url: 'http://localhost:5000/success-payment',
         fail_url: 'http://localhost:5173/fail',
         cancel_url: 'http://localhost:5173/cancel',
         ipn_url: 'http://localhost:5000/ipn-success-payment',
         shipping_method: 'Courier',
         product_name: 'Computer.',
         product_category: 'Electronic',
         product_profile: 'general',
         cus_name: 'Customer Name',
         cus_email: `${payment.email}`,
         cus_add1: 'Dhaka',
         cus_add2: 'Dhaka',
         cus_city: 'Dhaka',
         cus_state: 'Dhaka',
         cus_postcode: '1000',
         cus_country: 'Bangladesh',
         cus_phone: '01711111111',
         cus_fax: '01711111111',
         ship_name: 'Customer Name',
         ship_add1: 'Dhaka',
         ship_add2: 'Dhaka',
         ship_city: 'Dhaka',
         ship_state: 'Dhaka',
         ship_postcode: 1000,
         ship_country: 'Bangladesh',
     };
     const iniResponse = await axios({
      url: 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php',
      method: 'POST',
      data: initiate,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
     })
     const gatewayUrl = iniResponse?.data?.GatewayPageURL 
     const savedData = await paymentsCollection.insertOne(payment)
     console.log(gatewayUrl);
     res.send({gatewayUrl})
    })
    app.post('/success-payment', async(req, res) => {
      const paymentSuccess = req.body 
      console.log(paymentSuccess);
      const {data} = await axios.get(`https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${paymentSuccess.val_id}&store_id=${store_id}&store_passwd=${store_passwd}&format=json`)
      console.log(data);
      if(data?.status !== 'VALID') return res.send({message: 'Invalid Payment'})
        // after validation update the payment status to success 
      const updatePayment = await paymentsCollection.findOne({transactionId: data.tran_id}, {$set: {status: 'Success'}})
      const payment = await paymentsCollection.findOne({transactionId: data.tran_id})
      const query = {
        _id: {
          $in: payment?.cartIds?.map(id => new ObjectId(id))
        }
      }
      const deleteResult = await cartsCollection.deleteMany(query)
      console.log(deleteResult);
      res.redirect('http://localhost:5173/success')
    })
    // route for show data on admin home 
    app.get('/admin-stats', verifyToken, verifyAdmin,  async(req, res) => {
      const users = await usersCollection.estimatedDocumentCount()
      const orders = await paymentsCollection.estimatedDocumentCount()
      const menuItems = await menuCollection.estimatedDocumentCount()
      const result = await paymentsCollection.aggregate([
        {
          $group:{
            _id: null,
            totalPrice: {$sum: '$price'}
          }
        }
      ]).toArray()
      const revenue = result.length>0? result[0].totalPrice: 0
      res.send({users, orders, menuItems, revenue})
    })
    // route for recharts data
    app.get('/orders-stats', async(req, res) => {
      const result = await paymentsCollection.aggregate([
      {$unwind : '$menuIds'},
      {
        $addFields:{
          menuIds: {$toObjectId: '$menuIds'},
        },
      },
      {
        $lookup: {
          from: 'menu',
          localField: 'menuIds',
          foreignField: '_id',
          as: 'menuItems',
        }
      },
      {$unwind: '$menuItems'},
      {
        $group: {
          _id: '$menuItems.category',
          quantity: {$sum: 1},
          revenue: {$sum: '$menuItems.price'},
        },
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          quantity: '$quantity',
          revenue: '$revenue',
        }
      }

      ]).toArray()
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
// payment gate way work start here 

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('bistro boss menu and review coming...')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})