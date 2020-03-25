const auth = require('./auth.js');
const models = require('./model.js');
const User = models.User;
const Profile = models.Profile;
const uploadCloudinary = require('./uploadCloudinary.js');

const getUserProfile = async (username) => {
  let ret = null;
  await User
    .findOne({ username })
    .exec()
    .then(async function (user) {
      if (user) {
        await Profile
          .findOne({ user: user._id })
          .populate({
            path: 'user',
            select: 'username links thirdPartyType',
            populate: {
              path: 'links'
            }
          })
          .exec()
          .then(function (profile) {
            ret = profile;
          });
      }
    })
    .catch(function (err) {
      ret = null;
    });
  return ret;
}

const updateUserProfile = async (username, newProfile) => {
  let ret = null;
  await User
    .findOne({ username })
    .exec()
    .then(async function (user) {
      if (user) {
        await Profile
          .updateOne({ user: user._id }, newProfile)
          .exec()
          .then(function () {
            ret = Object.assign({}, { username }, newProfile);
          });
      }
    })
    .catch(function (err) {
      ret = null;
    });
  return ret;
}

const getHeadline = async (req, res) => {
  let username = req.params.user || req.username;
  let profile = await getUserProfile(username);
  if (profile) {
    res.send({
      username,
      headline: profile.headline
    });
  }
  else {
    res.sendStatus(400);
  }
}

const updateHeadline = async (req, res) => {
  let username = req.username;
  let headline = req.body.headline;
  let updated = await updateUserProfile(username, { headline });
  if (updated) {
    res.send(updated)
  }
  else {
    res.sendStatus(400);
  }
}

const getProfile = async (req, res) => {
  let username = req.username;
  let profile = await getUserProfile(username);

  if(profile) {
    res.send(profile)
  }
  else {
    res.sendStatus(400);
  }
}

const updateProfile = async (req, res) => {
  let username = req.username;
  let profile = req.body.profile;
  let updated = await updateUserProfile(username, profile);
  if(updated) {
    res.send(updated);
  }
  else {
    res.sendStatus(400);
  }
}

const getEmail = async (req, res) => {
  let username = req.params.user || req.username;
  let profile = await getUserProfile(username);
  if (profile) {
    res.send({
      username,
      email: profile.email
    });
  }
  else {
    res.sendStatus(400);
  }
}

const updateEmail = async (req, res) => {
  let username = req.username;
  let email = req.body.email;
  let updated = await updateUserProfile(username, { email });
  if (updated) {
    res.send(updated)
  }
  else {
    res.sendStatus(400);
  }
}

const getDateOfBirth = async (req, res) => {
  let username = req.params.user || req.username;
  let profile = await getUserProfile(username);
  if (profile) {
    res.send({
      username,
      dob: profile.dob
    });
  }
  else {
    res.sendStatus(400);
  }
}

const getZipcode = async (req, res) => {
  let username = req.params.user || req.username;
  let profile = await getUserProfile(username);
  if (profile) {
    res.send({
      username,
      zipcode: profile.zipcode
    });
  }
  else {
    res.sendStatus(400);
  }
}

const updateZipcode = async (req, res) => {
  let username = req.username;
  let zipcode = req.body.zipcode;
  let updated = await updateUserProfile(username, { zipcode });
  if (updated) {
    res.send(updated)
  }
  else {
    res.sendStatus(400);
  }
}

const getAvatar = async (req, res) => {
  let username = req.params.user || req.username;
  let profile = await getUserProfile(username);
  if(profile) {
    res.send({
      username,
      avater: profile.avatar
    });
  }
  else {
    res.sendStatus(400);
  }
}

const updateAvatar = async (req, res) => {
  let username = req.username;
  let avatar = req.fileurl;
  if(!avatar) {
    res.sendStatus(400)
  }
  let updated = await updateUserProfile(username, { avatar });
  if (updated) {
    res.send(updated)
  }
  else {
    res.sendStatus(400);
  }
}

const uploadImage = (req, res) => {
  let image = req.fileurl;
  if(!image) {
    res.sendStatus(400)
  }
  else {
    res.send({image})
  }
}
exports.getUserProfile = getUserProfile;
exports.route = (app) => {
  app.get('/headline/:user?', auth.isLoggedIn, getHeadline);
  app.put('/headline', auth.isLoggedIn, updateHeadline);
  app.get('/email/:user?', auth.isLoggedIn, getEmail);
  app.put('/email', auth.isLoggedIn, updateEmail);
  app.get('/dob/:user?', auth.isLoggedIn, getDateOfBirth);
  app.get('/zipcode/:user?', auth.isLoggedIn, getZipcode);
  app.put('/zipcode', auth.isLoggedIn, updateZipcode);
  app.get('/avatar/:user?', auth.isLoggedIn, getAvatar);
  app.put('/avatar', auth.isLoggedIn, uploadCloudinary.uploadImage('title') ,updateAvatar);

  app.post('/upload/image', auth.isLoggedIn, uploadCloudinary.uploadImage('title') ,uploadImage);

  app.get('/profile', auth.isLoggedIn, getProfile);
  app.put('/profile', auth.isLoggedIn, updateProfile);
}

