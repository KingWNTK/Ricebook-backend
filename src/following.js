const auth = require('./auth.js');
const models = require('./model.js');
const User = models.User;
const Profile = models.Profile;


const getUserId = auth.getUserId;

const getUserFollowing = async (username) => {
  let ret = null;
  let uid = await getUserId(username);
  await Profile
    .findOne({ user: uid })
    .populate({
      path: 'following',
      select: 'username'
    })
    .exec()
    .then(function (profile) {
      ret = {
        username,
        following: profile.following.map(v => v.username)
      }
    })
    .catch(function (err) {
      ret = null;
    });
  return ret;
}

const getUserFollowingProfiles = async (username) => {
  let ret = null;
  let uid = await getUserId(username);
  await Profile
    .findOne({ user: uid })
    .populate({
      path: 'following',
      populate: {
        path: 'profile'
      }
    })
    .exec()
    .then(function (profile) {
      ret = {
        username,
        following: profile.following
      }
    })
    .catch(function (err) {
      ret = null;
    });
  return ret;
}

const getFollowing = async (req, res) => {
  let username = req.params.user || req.username;
  let following = await getUserFollowing(username);

  if (following) {
    res.send(following);
  }
  else {
    res.sendStatus(400);
  }
}

const getFollowingProfiles = async (req, res) => {
  let username = req.username;
  let followingProfiles = await getUserFollowingProfiles(username);

  if(followingProfiles) {
    res.send(followingProfiles);
  }
  else {
    res.sendStatus(400);
  }
}


const updateFollowing = async (req, res) => {
  let username = req.username;
  let fname = req.params.user;
  let fuid = await getUserId(fname);

  //If the user try to follow a linked account, follow the master account
  await User.findById(fuid).exec().then(function(user) {
    if(user && user.linkedTo) {
      fuid = '' + user.linkedTo;
    }
  });

  let uid = await getUserId(username);

  await User.findById(uid).exec().then(function(user) {
    if(user && user.linkedTo) {
      uid = '' + user.linkedTo;
    }
  });

  let following = null;
  if (uid && fuid && uid !== fuid) {
    await Profile
      .findOne({ user: uid })
      .exec()
      .then(async function (profile) {
        let p = new Profile(profile);
        if (!p.following.includes(fuid)) {
          p.following.push(fuid);
          await p.save();
          following = await getUserFollowingProfiles(username);
        }
      })
      .catch(function (err) {
        following = null;
      });
  }

  if (following) {
    res.send(following)
  }
  else {
    res.sendStatus(400);
  }
}

const deleteFollowing = async (req, res) => {
  let username = req.username;
  let fname = req.params.user;
  let fuid = await getUserId(fname);
  let uid = await getUserId(username);

  let following = null;
  if (uid && fuid) {
    await Profile
      .findOne({ user: uid })
      .exec()
      .then(async function (profile) {
        let p = new Profile(profile);
        if (p.following.includes(fuid)) {
          p.following = p.following.filter(id => '' + id !== fuid);
          await p.save();
          following = await getUserFollowingProfiles(username);
        }
      })
      .catch(function (err) {
        ret = null;
      });
  }

  if (following) {
    res.send(following)
  }
  else {
    res.sendStatus(400);
  }
}

exports.route = (app) => {
  app.get('/following/:user?', auth.isLoggedIn, getFollowing);
  app.put('/following/:user', auth.isLoggedIn, updateFollowing);
  app.delete('/following/:user', auth.isLoggedIn, deleteFollowing);
  app.get('/followingProfiles', auth.isLoggedIn, getFollowingProfiles);
}