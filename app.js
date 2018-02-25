const express = require('express');
const mongoose = require('mongoose');
const _ = require('lodash');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const bcrypt = require('bcrypt');
const multer = require('multer');
const session = require('express-session');
mongoose.connect('mongodb://localhost/usermangement');

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
  resave: true,
  saveUninitialized: false,
  store: new MongoStore({
    mongooseConnection: mongoose.connection
  }),
  cookie: {
    path: '/',
    httpOnly: true,
    maxAge:  1800000
  }
}));


//Default Route is User List
//requiresLogin
app.get('', (req,res) => {
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
  //use schema.create to insert data into the db
  console.log(Admin);
  Admin.create(postdata, function (err, user) {
    if(err) throw err;
    console.log(user);
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
        //resp.send('Login Successful');
        resp.redirect('/');
        req.session.userId = admin._id;
        session.Session.prototype.login = function(admin){
          this.userInfo = admin;
        };
        console.log('req.session.userId',req.session.userId);
        console.log('session.Session.prototype.login', session.Session.prototype.login);
        console.log('session.Session.prototype.login.userInfo',session.Session.prototype.login.userInfo);
      });
  });
});

function requiresLogin(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  } else {
    var err = new Error('You must be logged in to view this page.');
    err.status = 401;
    return next(err);
  }
}

function authenticate(req,res) {
  console.log('session.Session.prototype.login.userInfo 2',req.session.Session.prototype.login.userInfo);
  if((req.session) && req.session.userId != '' ){
    var userId = req.session.userId;
    console.log(req.session.userId);
    Admin.findById({userId}, (req,resp) => {
      console.log(resp);
    });
  }
}

//Load Add User form
app.get('/adduser', (req,res) => {
  //res.render('adduser');
  Admin.find({}, (err,admin) => {
    if(err) throw err;
    //console.log(`User Data ${user}`);
    console.log(JSON.stringify(admin,false,2));
    res.render('adduser', {admin});
  });
});

//Profile View
app.get('/profile', (req,res) => {
  res.render('profile');
});

//Save User
app.post('/saveuser',upload, (req,res) => {
  //console.log('Save User');
  //console.log(req);
  console.log(req.file.destination);
  var filedestiny = req.file.destination.substr(7);
  console.log(filedestiny);
  var filepath = req.file.filename;
  var postdata = _.pick(req.body,['name','email','contact','password','createdby']);
  //console.log(postdata);
  postdata.image = filepath;
  var user = new User(postdata);
  //res.send(postdata);
  user.save(postdata, (err,success) => {
    if(err) throw err;
    //console.log(success);

    res.redirect('/');

  })
});

//Edit User Form
app.get('/edituser/:userId', (req,res) => {
  //var user = new User(postdata);
  var userdata = {};
  var admindata = {};
  var userId = req.params.userId;
  Admin.find({}, (err,admin) => {
    if(err) throw err;
    //console.log(`User Data ${user}`);
    //console.log(JSON.stringify(admin,false,2));
    admindata = admin;
    User.findById(userId, (err,user) => {
      if(err) throw err;
      //console.log(`User Data ${user}`);
      userdata = user;
      res.render('edituser', {admindata,userdata});
    });
    //res.render('adduser', {admin});
  });
});

//Update User info
app.put('/updateuser/:userId', (req,res) => {
  //var user = new User(postdata);
  var userId = req.params.userId;
  var postdata = _.pick(req.body,['name','email','contact','password']);
  //console.log(userId);
  User.findByIdAndUpdate(userId, { $set: postdata },{ new: true}, (err,user) => {
    if(err) throw err;
    //console.log(`User Data ${user}`);
    res.redirect('/');
  });
});

app.delete('/deleteuser/:userId', (req,res) => {
  //var user = new User(postdata);
  var userId = req.params.userId;
  var postdata = _.pick(req.body,['name','email','contact','password']);
  //console.log(userId);
  User.findByIdAndRemove(userId, {}, (err,user) => {
    if(err) throw err;
    //console.log(`User Data ${user}`);
    res.redirect('/');
  });
});

//Run App
app.listen(port);
console.log(`App running on port ${port}`);
