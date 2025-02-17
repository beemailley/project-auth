import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import crypto from "crypto";
import bcrypt from "bcrypt"

const mongoUrl = process.env.MONGO_URL || "mongodb://127.0.0.1/auth";
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.Promise = Promise;

// Defines the port the app will run on. Defaults to 8080, but can be overridden
// when starting the server. Example command to overwrite PORT env variable value:
// PORT=9000 npm start
const port = process.env.PORT || 8080;
const app = express();
const allEndpoints = require('express-list-endpoints');

// Add middlewares to enable cors and json body parsing
app.use(cors());
app.use(express.json());

const {Schema} = mongoose;

const UserSchema = new Schema ({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString('hex')
  }
})

const User = mongoose.model("User", UserSchema)

const QuoteSchema = new Schema ({
  index: {
    type: Number
  },
  category: {
    type: String
  },
  quote: {
    type: String
  },
  image_link: {
    type: String
  }
})

const Quote = mongoose.model("Quote", QuoteSchema)

// Start defining your routes here
app.get("/", (req, res) => {
  // res.send("Hello Technigo!");
  res.json(allEndpoints(app));
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const salt = bcrypt.genSaltSync();
    const newUser = await new User({
      username: username,
      password: bcrypt.hashSync(password, salt)
    }).save()
    res.status(201).json({
      success: true,
      response: {
        username: newUser.username,
        id: newUser._id,
        accessToken: newUser.accessToken
      }
    })

  } catch (error) {
    res.status(400).json({
      success: false,
      response: error
    })
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({username})

    if (user && bcrypt.compareSync(password, user.password)) {
      res.status(200).json({
        success: true,
        response: {
          username: user.username,
          id: user._id,
          accessToken: user.accessToken
        }
      })
    } else {
      res.status(400).json({
        success: false,
        response: "Username or password is not correct"
      })
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      response: error
    })
  }
});

const authenticateUser = async (req, res, next) => {
  const accessToken = req.header("Authorization")
  try {
    const user = await User.findOne({accessToken: accessToken})
    if (user) {
      next()
    } else {
      res.status(401).json({
        success: false,
        response: "Please log in"
      })
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      response: error
    })
  }
}

app.get("/secret", authenticateUser);
app.get("/secret", async (req, res) => {
  // console.log("A very secret secret")
  const response = {
    success: true,
    body: {}
  }

  try{
    const selectedQuote = await Quote.aggregate().sample(1)
    // const allQuotes = await Quote.find().sort({index: 'desc'}).limit(20)
    if(selectedQuote){
      response.body = selectedQuote
      res.status(200).json(response)
    } else {
      response.success = false
      response.body = {message: "No quotes found."}
      res.status(404).json(response)
    }
  } catch (error) {
    response.success = false
    response.body = {message: error}
    res.status(500).json(response)
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
