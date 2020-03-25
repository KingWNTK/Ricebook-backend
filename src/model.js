const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  salt: {
    type: String,
  },
  hash: {
    type: String,
  },
  profile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
  },
  thirdPartyId: String,
  thirdPartyType: String,
  thirdPartyName: String,
  links: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  linkedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});


const profileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  headline: {
    type: String,
    required: true
  },
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  email: {
    type: String,
    required: true
  },
  dob: {
    type: String,
    required: true
  },
  zipcode: {
    type: String,
    required: true
  },
  avatar: String
});

const articleSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    require: true
  },
  picture: String,
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }]
});

const commentSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  }
});

exports.User = mongoose.model('User', userSchema);
exports.Profile = mongoose.model('Profile', profileSchema);
exports.Article = mongoose.model('Article', articleSchema);
exports.Comment = mongoose.model('Comment', commentSchema);