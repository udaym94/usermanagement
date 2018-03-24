const express = require('express');
const mongoose = require('mongoose');
const _ = require('lodash');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const bcrypt = require('bcrypt');
const multer = require('multer');
const session = require('express-session');
//mongoose.connect('mongodb://localhost/usermangement');
mongoose.connect('mongodb://udaymishra:###wow123@ds123399.mlab.com:23399/usermanagement');

var db = mongoose.connection;
db.on('error', console.log('db connection error:'));

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads')
  },
  filename: function (req, file, cb) {
    var filename = file.originalname;
    var filenameparts = filename.split('.');
    cb(null, file.fieldname + '-' + Date.now() + '.' + filenameparts[1])
  }
})

var upload = multer({ storage: storage }).single('image')

//mongo-connect
const MongoStore = require('connect-mongo')(session);

const port = process.env.PORT || 3000; //Dynamic Port For Heroku

var app = express()

app.use(express.static('uploads'))
app.use(express.static('public'))

var User = require('./models/Usermodel.js');
var Admin = require('./models/Adminmodel.js');
//console.log(User);
app.use(bodyParser.urlencoded({ extended: false }))
app.use(methodOverride('_method'))
app.set('view engine', 'ejs');

app.use(session({
  secret: 'admin secret',
  //resave: true,
  resave: false,
  //rolling: true,
  saveUninitialized: false,
  cookie: {
    maxAge:3600000 //one hour
  },
  store: new MongoStore({
    mongooseConnection: mongoose.connection
  })
}));

app.use(function(req, res, next){
  res.locals.currentUser = req.session.userId;
  if(req.session.userId){
    Admin.findById(req.session.userId, (err,admin) => {
      if(err) throw err;
      res.locals.adminEmail = admin.email;
    });
  }
  next();
});

//Default Route is User List
//requiresLogin
app.get('', requiresLogin, (req,res) => {
  User.
  find({}).
  populate('createdby').
  exec(function (err, users) {
    if (err) throw err;
    console.log(JSON.stringify(users,false,2));
    res.render('home',{users});
  });
  //res.render('home');
});


//Register View
app.get('/register', (req,res) => {
  res.render('register');
});

//Login View
app.get('/login', (req,res) => {
  res.render('login');
});

//Create Admin Account
app.post('/createadmin', (req,res) => {
  var postdata = _.pick(req.body,['name','email','username','contactno','password','passwordConf']);
  Admin.create(postdata, function (err, user) {
    if(err) throw err;
    res.redirect('/profile');
  });
});

//Authenticate Admin login
app.post('/authenticateadmin', (req,resp) => {
  var postdata = _.pick(req.body,['email','password']);
  Admin.findOne({'email':postdata.email}, (err,admin) => {
    if(err) throw err;

      bcrypt.compare(postdata.password, admin.password, function(err, res) {
        if(err) throw err;
        req.session.userId = admin._id;
        req.session.save();
        resp.redirect('/');
      });
  });
});

function requiresLogin(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  } else {
    return res.redirect(403,'login');
  }
}

//Logout Admin
app.get('/logout', (req,res) => {
  req.session.cookie.expires = new Date(Date.now() - 3600000);
  //return res.redirect('login',{succ_msg : 'Successfully Logged Out! See You again'});
  return res.redirect(200,'login');
    // req.session.destroy( () => {
    //   console.log('After' ,req.session);
    //   req.sessionID = null;
    //     // if(err){
    //     //   console.log('err in Logout');
    //     //   console.log(typeof err);
    //     //   console.log(JSON.stringify(err,false,2))
    //     // }
    //     //if(err)  return res.render('login',{err_msg : 'You Must be Logged In to Manage Users'});
    //     return res.render('login',{succ_msg : 'Successfully Logged Out! See You again'});
    // });
});

//Load Add User form
app.get('/adduser', requiresLogin, (req,res) => {
  //res.render('adduser');
  Admin.find({}, (err,admin) => {
    if(err) throw err;
    res.render('adduser', {admin});
  });
});

//Profile View
app.get('/profile', requiresLogin, (req,res) => {
  res.render('profile');
});

//Save User
app.post('/saveuser', requiresLogin, upload, (req,res) => {
  var filedestiny = req.file.destination.substr(7);
  var filepath = req.file.filename;
  var postdata = _.pick(req.body,['name','email','contact','password','createdby']);
  postdata.image = filepath;
  var user = new User(postdata);
  user.save(postdata, (err,success) => {
    if(err) throw err;

    res.redirect('/');

  })
});

//Edit User Form
app.get('/edituser/:userId', requiresLogin, (req,res) => {
  var userdata = {};
  var admindata = {};
  var userId = req.params.userId;
  User.
  findById(userId).
  populate('createdby').
  exec((err,user) => {
    if(err) throw err;
    userdata = user;
      Admin.find({}, (err,admin) => {
        if(err) throw err;
        admindata = admin;
        res.render('edituser', {admindata,userdata});
      });
  });
});

//Update User info
app.put('/updateuser/:userId', requiresLogin, (req,res) => {
  var userId = req.params.userId;
  var postdata = _.pick(req.body,['name','email','contact','password']);
  User.findByIdAndUpdate(userId, { $set: postdata },{ new: true}, (err,user) => {
    if(err) throw err;
    res.redirect('/');
  });
});

app.delete('/deleteuser/:userId', requiresLogin, (req,res) => {
  var userId = req.params.userId;
  var postdata = _.pick(req.body,['name','email','contact','password']);
  User.findByIdAndRemove(userId, {}, (err,user) => {
    if(err) throw err;
    res.redirect('/');
  });
});

//AJAX Calls
//Check User Email
app.post('/checkUserEmail', (req,res) => {
  //var postdata = _.pick(req.body,['email']);
  User.count({email:req.body.email}, (err,count) => {
    if(err) throw err;
    res.status(200).send({'count':count});
  });
});
//Check Admin Email
app.post('/checkAdminEmail', (req,res) => {
  Admin.count({email:req.body.email}, (err,count) => {
    if(err) throw err;
    res.status(200).send({'count':count});
  });
});


//Run App
app.listen(port);
console.log(`App running on port ${port}`);
