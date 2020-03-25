const models = require('./model.js');
const User = models.User;
const Profile = models.Profile;
const Article = models.Article;
const Comment = models.Comment;
const md5 = require('md5');
const uploadCloudinary = require('./uploadCloudinary.js');

const redis = require('async-redis');
if (process.env.NODE_ENV !== "production") {
  require('dot-env')
}
const client = redis.createClient(process.env.REDIS_URL);

client.on('error', function (err) {
  console.log('Error' + err);
});

const cookieKey = 'sid';
const pepper = 'pepper twin is good';

var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;


passport.serializeUser(function (user, done) {
  done(null, user._id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    if (!err) {
      done(null, user);
    }
    else {
      done(null, null);
    }
  })
});

let baseURL = 'http://yw90-final-be.herokuapp.com';
if (process.env.NODE_ENV === 'development') {
  baseURL = 'http://localhost:3000';
}


let feBaseUrl = 'http://yw90-final-fe.surge.sh';
if (process.env.NODE_ENV === 'development') {
  feBaseUrl = 'http://localhost:3006';
}

let linkingToTp = false;

const getUserId = async (username) => {
  let uid = null;
  await User.findOne({ username }).exec().then(function (user) { if (user) uid = user._id })
    .catch(function (err) { uid = null });
  return uid ? '' + uid : null;
}

passport.use(new GoogleStrategy({
  clientID: '939650410596-fthfslr476qevr3spiodp6463au6oi9u.apps.googleusercontent.com',
  clientSecret: 'p8jjsVBMKYpe8eRDrEENalA_',
  callbackURL: baseURL + "/auth/google/callback"
},
  function (token, tokenSecret, prof, done) {
    User.findOne({ thirdPartyId: prof.id, thirdPartyType: 'google' }, async function (err, user) {
      if (err) return done(err, null);
      if (user) {
        return done(null, user);
      }
      else {
        let cnt;
        await User.find({ thirdPartyName: prof.displayName })
          .exec()
          .then(function (users) { cnt = users.length; })
          .catch(function (err) { return done(err, null); });
        let attemptUser = new User({
          username: prof.displayName + '@google@' + cnt,
          thirdPartyId: prof.id,
          thirdPartyType: 'google',
          thirdPartyName: prof.displayName
        });
        await User
          .create(attemptUser)
          .then(function (user) {
            let profile = new Profile({
              user: user._id,
              headline: 'Tell something about yourself',
              following: [],
              email: prof.emails[0].value,
              dob: 'Unknown',
              zipcode: 'Not set yet',
              avatar: prof.photos[0].value
            });
            Profile
              .create(profile)
              .then(async function (profile) {
                user.profile = profile._id;
                await user.save();
                return done(null, user);
              })
              .catch(async function (err) {
                await User.deleteOne({ username });
                return done(err, null);
              });
          })

      }
    });
  }
));

const isLoggedIn = async (req, res, next) => {
  if (req.user) {
    if (!req.user.linkedTo) {
      req.username = req.user.username;
      req.thirdPartyType = req.user.thirdPartyType;
    }
    else {
      await User.findById(req.user.linkedTo, function (err, user) {
        req.username = user.username
      });
    }
    next();
  }
  else {
    let sid = req.cookies[cookieKey];
    if (!sid) {
      return res.sendStatus(401);
    }
    let username = await client.hget('sessions', sid);
    if (username) {
      req.username = username;
      next();
    }
    else {
      res.sendStatus(401);
    }
  }

}

const login = (req, res) => {
  let username = req.body.username;
  let password = req.body.password;
  if (!username || !password) {
    return res.sendStatus(400);
  }

  User.findOne({ username: username }, function (err, user) {
    if (!err && user && user.hash === md5(user.salt + password + pepper)) {
      const secretKey = 'I like owls because they are cute';
      const sid = md5(secretKey + username + Date.now());
      res.cookie(cookieKey, sid, { maxAge: 3600 * 1000, httpOnly: true });
      client.hset('sessions', sid, user.username);
      res.send({ username, result: 'success' });
    }
    else {
      res.sendStatus(400);
    }
  });
}

const logout = async (req, res) => {
  const sid = req.cookies[cookieKey];
  await client.hdel('sessions', sid);
  if (req.user) {
    req.logout();
  }
  res.clearCookie(cookieKey, { maxAge: 3600 * 1000, httpOnly: true });
  res.send('OK');
}

const register = (req, res) => {
  let username = req.body.username;
  let password = req.body.password;

  let ok = req.body.username && req.body.password && req.body.email && req.body.dob && req.body.zipcode;
  if (ok) {
    ok &= /^[a-zA-Z][a-zA-Z0-9]*$/.exec(req.body.username) !== null;
  }
  if (!ok) {
    return res.sendStatus(400);
  }
  let salt = (Math.random() + Date.now()).toString();
  let hash = md5(salt + password + pepper);
  let attemptUser = new User({ username, salt, hash });
  User
    .create(attemptUser)
    .then(function (user) {
      let profile = new Profile({
        user: user._id,
        headline: 'Tell something about yourself',
        following: [],
        email: req.body.email,
        dob: req.body.dob,
        zipcode: req.body.zipcode,
        avatar: uploadCloudinary.getImageUrl('default_avatar')
      });
      Profile
        .create(profile)
        .then(async function (profile) {
          user.profile = profile._id;
          await user.save();
          res.send({ username, result: 'success' });
        })
        .catch(async function (err) {
          await User.deleteOne({ username });
          res.sendStatus(400);
        });
    })
    .catch(function (err) {
      res.sendStatus(400);
    })
}

const updatePassword = (req, res) => {
  let newPassword = req.body.password;
  let username = req.username;
  if (newPassword && uid) {
    User.findOne({ username }, function (err, user) {
      if (!err && user) {
        user.hash = md5(user.salt + newPassword + pepper);
        user.save(function (err, user) {
          if (err) {
            res.send({ result: 'db server error' });
          }
          else {
            res.send({ username: user.username, result: 'success' });
          }
        });
      }
      else {
        res.sendStatus(400);
      }
    })
  }
  else {
    res.sendStatus(400);
  }
}

const handleLinkAccounts = async (uid, tpUid) => {
  let profile, tpProfile;
  await User.findById(uid).exec().then(function (user) {
    if (user.links.includes(tpUid)) {
      return;
    }
  });
  await User.findByIdAndUpdate(tpUid, { linkedTo: uid }).exec();
  await User.findByIdAndUpdate(uid, {
    '$push': { 'links': tpUid }
  }).exec();
  await Profile.findOne({ user: uid }).exec().then(function (prof) { profile = prof });
  await Profile.findOne({ user: tpUid }).exec().then(function (prof) { tpProfile = prof });

  profile.following = profile.following
    .concat(tpProfile.following.filter((item) => profile.following.indexOf(item) < 0));
  profile.following = profile.following.filter(item => ('' + item !== uid && '' + item !== '' + tpUid));

  tpProfile.following = [];

  await profile.save();
  await tpProfile.save();

  await Profile.updateMany({ following: tpUid }, { $set: { 'following.$': tpUid } }).exec();
  await Comment.updateMany({ author: tpUid }, { author: uid }).exec();
  await Article.updateMany({ author: tpUid }, { author: uid }).exec();
}

const handleUnLinkAccounts = async (uid, tpUid) => {
  await User.findByIdAndUpdate(tpUid, {
    $unset: { linkedTo: '' }
  });
  await User.findByIdAndUpdate(uid, {
    $pull: { links: tpUid }
  })
}


const getUserProfile = require('./profile.js').getUserProfile;

const linkToLoc = async (req, res) => {
  let username = req.body.username;
  let password = req.body.password;
  if (!username || !password) {
    return res.sendStatus(400);
  }
  User.findOne({ username }, async function (err, user) {
    if (!err && user && user.hash === md5(user.salt + password + pepper)) {
      const secretKey = 'I like owls because they are cute';
      const sid = md5(secretKey + username + Date.now());
      res.cookie(cookieKey, sid, { maxAge: 3600 * 1000, httpOnly: true });
      client.hset('sessions', sid, user.username);
      tpUid = await getUserId(req.username);
      await handleLinkAccounts(user._id, tpUid);
      let updated = await getUserProfile(username);
      res.send(updated);
      req.logout();
    }
    else {
      res.sendStatus(400);
    }
  });

}

const linkToTp = async (req, res, next) => {
  linkingToTp = true;
  next();
}

const unlink = async (req, res) => {
  let tpUid = req.body.tpUid;
  let uid = await getUserId(req.username);
  handleUnLinkAccounts(uid, tpUid);
  let updated = await getUserProfile(req.username);
  if (updated) {
    res.send(updated);
  }
  else {
    res.sendStatus(400);
  }
}

exports.getUserId = getUserId
exports.isLoggedIn = isLoggedIn;
exports.route = (app) => {
  app.post('/login', login);
  app.put('/logout', isLoggedIn, logout);
  app.post('/register', register);
  app.put('/password', isLoggedIn, updatePassword);
  
  app.get('/link/google', isLoggedIn, linkToTp, passport.authenticate('google', { scope: ['openid', 'profile', 'email'] }));
  app.post('/link/ricebook', isLoggedIn, linkToLoc);
  app.put('/unlink', isLoggedIn, unlink)

  app.get('/auth/google', passport.authenticate('google', { scope: ['openid', 'profile', 'email'] }));
  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: feBaseUrl + '/' }),
    async function (req, res) {
      if (linkingToTp) {
        let sid = req.cookies[cookieKey];
        if (sid) {
          let username = await client.hget('sessions', sid);
          let uid = await getUserId(username);
          await handleLinkAccounts(uid, req.user._id);
        }
        req.logout();
      }
      if(linkingToTp) {
        res.redirect(feBaseUrl + '/profile');
      }
      else {
        res.redirect(feBaseUrl + '/main');
      }
      linkingToTp = false;

    });
}

