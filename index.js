const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const cors = require('cors');
const passport = require('passport');
const expressSession = require('express-session');
const auth =  require('./src/auth.js');
const articles = require('./src/articles.js');
const following = require('./src/following.js');
const profile = require('./src/profile.js');



if (process.env.NODE_ENV !== "production") {
  require('dot-env')
}

mongoose
  .connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('db connected'));


const getIndex = (req, res) => {
  res.send('hello world!');
}

app.use(bodyParser.json());
app.use(cookieParser());
app.use(expressSession({
  secret: "Shh, its a secret!", 
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

app.use(cors(
  {
    credentials: true,
    origin: true
  }
));

app.get('/', getIndex);

auth.route(app);
articles.route(app);
following.route(app);
profile.route(app);


const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  const addr = server.address();
  console.log(`Server listening at http://${addr.address}:${addr.port}`);
});