
const express = require('express')
const app = express()
const data =require('./data.json')
const cors = require('cors');
const mongoose = require('mongoose')
const dotenv = require("dotenv")
const CryptoJS = require("crypto-js")
const jwt = require("jsonwebtoken")
const User = require("./models/User")
const posts = data.data
dotenv.config()
const pagination = 20 

app.use(express.json())
app.set('trust proxy', 1);
app.use(function(req, res, next) {
  if(req.headers['x-arr-ssl'] && !req.headers['x-forwarded-proto']) {
    req.headers['x-forwarded-proto'] = 'https';
  }
  return next();
});

app.use(cors({
  origin:'https://post-app-kappa.vercel.app',
  credentials:true,
  'Access-Control-Allow-Origin': 'https://post-app-kappa.vercel.app'
}
));

mongoose
    .connect(process.env.MONGO_URL)
    .then(() => console.log("Database Connected"))
    .catch((err) => {
        console.log("error :", err)
    })

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log(req.headers)
  if (authHeader) {
    if ( !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  
    const token = authHeader.split(' ')[1];
     
      jwt.verify(token, process.env.JWT_SEC, (err, user) => {
          if (err) {
              console.log("token is invalid")
              return res.status(403).json("Token is not valid!")
          }
          req.user = user
          next()
      })
  } else {
      console.log("i am here")
      return res.status(401).json("You are not authenticated!")
  }
}

app.get('/', (req, res) => {
  
    res.send('Welcome to Post App API')
  })

app.get('/posts',verifyToken,(req, res) => {
    const {page} = req.query
   
    const start = page*pagination;
  
    if(start>=posts.length)
    {
         res.json([])
    }
    else{
    const arr = posts.slice(start, Math.min(start + pagination,posts.length));
    res.json(arr)
    }
})
app.post("/login", async (req, res) => {
 try{
   const user = await User.findOne({email:req.body.email})
   if(!user)
   {
    console.log("no user")
    return res.status(401).json({message:'User not found'})
   } 
   else{
    const hashedPassword = CryptoJS.AES.decrypt(
      user.password,
      process.env.PASS_SEC
  )

  const originalPassword = hashedPassword.toString(CryptoJS.enc.Utf8)

  const inputPassword = req.body.password

  if(originalPassword != inputPassword)
  { 
      console.log("Wrong password")
  return res.status(401).json({message:'Incorrect password'})
  }

  const accessToken = jwt.sign(
      {
          id: user._id,
         // isAdmin: user.isAdmin,
      },
      process.env.JWT_SEC,
      { expiresIn: "1d" }
  )
  console.log(accessToken)
  const { password, ...others } = user._doc
  //console.log(password)
  //res.setHeader('Set-Cookie','jwt='+accessToken+";path=/;SameSite=None;Secure")

  res.status(200).json({ ...others, accessToken })
  
}
 }
catch(e){
  res.status(500).json('login failed')
}
   
})
app.post("/register", async (req, res) => {
  console.log(req.body)
  const newUser = new User({
      username: req.body.username,
      email: req.body.email,
      password: CryptoJS.AES.encrypt(
          req.body.password,
          process.env.PASS_SEC
      ).toString(),
  })
 
  try {
      const savedUser = await newUser.save()
      console.log(savedUser)
      const user = await User.findOne({
        username: req.body.username,
    })
      const accessToken = jwt.sign(
        {
            id: user._id,
           // isAdmin: user.isAdmin,
        },
        process.env.JWT_SEC,
        { expiresIn: "1d" }
    )
    console.log(accessToken)
    const { password, ...others } = user._doc
    //console.log(password)
    //res.setHeader('Set-Cookie',`jwt=${accessToken};path=/;HttpOnly;SameSite=None;Secure`)
    res.status(200).json({ ...others, accessToken })
    //  res.status(201).json(savedUser)

  } catch (err) {
      res.status(500).json(err)
  }
})

  
  app.listen(process.env.PORT||3002,()=>{
    console.log('server started')
  })

  module.exports = app