const auth = require('./auth.js');
const models = require('./model');
const md5 = require('md5');
const Article = models.Article;
const Comment = models.Comment;
const User = models.User;
const Profile = models.Profile;
const uploadCloudinary = require('./uploadCloudinary.js');

const init = async () => {
  await Article.deleteMany({}).exec();
  await Comment.deleteMany({}).exec();
  await User.deleteMany({}).exec();
  await Profile.deleteMany({}).exec();

  const pepper = "pepper twin is good";

  let username = 'yw90';
  let password = '123';
  let salt = (Math.random() + Date.now()).toString();
  let hash = md5(salt + password + pepper);
  let user = await User.create({ username, salt, hash, myId: username });
  let profile = await Profile.create({
    user: user._id,
    headline: 'Tell something about yourself',
    following: [],
    email: 'yw90@rice.edu',
    dob: '01/01/1991',
    zipcode: '77005',
    avatar: uploadCloudinary.getImageUrl('default_avatar')
  });
  user.profile = profile._id;
  await user.save();
  let articles = [
    {
      author: user._id,
      text: 'test user only text 1',
      date: new Date,
      comments: []
    },
    {
      author: user._id,
      text: 'test user only text 2',
      date: new Date,
      comments: []
    },
    {
      author: user._id,
      text: 'test user only text 3',
      date: new Date,
      comments: []
    },
    {
      author: user._id,
      text: 'test user only text 4',
      date: new Date,
      comments: []
    },
    {
      author: user._id,
      text: 'test user only text 5',
      date: new Date,
      comments: []
    }
  ];
  await Article.insertMany(articles).then(function (res) {
    articles = res;
  });

  let a0 = new Article(articles[0]);
  let a1 = new Article(articles[1]);
  let comments = [
    {
      author: user._id,
      text: 'comment 1',
      date: new Date
    },
    {
      author: user._id,
      text: 'comment 2',
      date: new Date
    },
    {
      author: user._id,
      text: 'comment 3',
      date: new Date
    }
  ];
  await Comment.insertMany([comments[0], comments[1]]).then(async function (comments) {
    for (let comment of comments) {
      a0.comments.push(comment);
    }
    await a0.save();
  });

  await Comment.create(comments[2]).then(async function (comment) {
    a1.comments.push(comment);
    await a1.save();
  })
  console.log('init done');
}

// init();

const getUserFeed = async (username) => {
  let ret = null;
  let uid = await getUserId(username);
  if (!uid) {
    return null;
  }
  await Profile
    .findOne({ user: uid })
    .exec()
    .then(async function (profile) {
      if (!profile) return;
      let uids = profile.following;
      uids.push(uid);
      await Article
        .find({
          author: { $in: uids }
        })
        .populate({
          path: 'comments',
          populate: {
            path: 'author',
            select: 'username'
          }
        })
        .populate('author', 'username')
        .sort('-date _id')
        .limit(10)
        .exec()
        .then(function (articles) {
          ret = articles ? articles : [];
        })
    })
    .catch(function (err) {
      console.log(err);
      ret = null
    });
  return ret;
}

const getUserId = auth.getUserId;

const commentArticle = async (aid, text, username, cid) => {
  let ret = null;
  await Article
    .findById(aid)
    .exec()
    .then(async function (article) {
      if (!article) return ret;
      let uid = await getUserId(username);
      if (uid) {
        if (article.comments.includes(cid)) {
          await Comment
            .findById(cid)
            .exec()
            .then(async function (comment) {
              if ('' + comment.author === uid) {
                comment.text = text;
                comment.date = new Date;
                await comment.save().then(function() {ret = 'ok'});
              }
            })
        }
        else {
          let comment = new Comment({
            author: uid,
            text,
            date: new Date
          });
          await comment.save().then(function (comment) { article.comments.push(comment); });
          await article.save().then(function (article) { ret = 'ok' });
        }
      }
    })
    .catch(function (err) {
      ret = null;
    });
  if (ret) {
    ret = await getUserFeed(username);
  }
  return ret;
}

const updateArticleText = async (aid, text, username) => {
  let ret = null;
  let uid = await getUserId(username);
  await Article
    .findOneAndUpdate({ _id: aid, author: uid }, { text, date: new Date })
    .exec()
    .then(function () {
      ret = 'ok';
    });
  if (ret) {
    ret = await getUserFeed(username);
  }
  return ret;
}

const getArticles = async (req, res) => {
  let username = req.username;
  let articles;
  if (req.params.id) {
    await Article.findById(req.params.id).exec()
      .then(function (res) { if (res) articles = res })
      .catch(function (err) { articles = null });
  }
  else {
    articles = await getUserFeed(username);
  }

  if (articles) {
    res.send(articles);
  }
  else {
    res.sendStatus(400);
  }

}

const updateArticle = async (req, res) => {
  if (!req.params.id) {
    return res.sendStatus(400);
  }
  let aid = req.params.id;
  let username = req.username;
  let text = req.body.text;
  let cid = req.body.cid;
  let articles = null;
  if (cid) {
    articles = await commentArticle(aid, text, username, cid);
  }
  else {
    articles = await updateArticleText(aid, text, username);
  }
  if (articles) {
    res.send(articles);
  }
  else {
    res.sendStatus(400);
  }
}

const addArticle = async (req, res) => {
  let username = req.username;
  let text = req.body.text;
  let uid = await getUserId(username);
  let article = new Article({
    author: uid,
    text: text,
    date: new Date,
    comments: [],
    picture: req.body.picture
  });

  let ret = null;
  await article.save();
  ret = await getUserFeed(username);

  if (ret) {
    res.send(ret);
  }
  else {
    res.sendStatus(400);
  }
}

exports.route = (app) => {
  app.get('/articles/:id?', auth.isLoggedIn, getArticles);
  app.put('/articles/:id', auth.isLoggedIn, updateArticle);
  app.post('/article', auth.isLoggedIn, addArticle);
}