const express = require('express')
const app = express()
const { MongoClient } = require("mongodb");
const { ObjectId } = require('mongodb');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt')
const MongoStore = require('connect-mongo')

const uri = "-------";

app.use(express.static('public'));
app.use(session({
    secret: '------',
    resave: false,
    saveUninitialized : false,
    cookie: {maxAge: 60 * 60 * 1000},
    store: MongoStore.create({
        mongoUrl : uri,
        dbName: 'forum',
      })
}))
app.use(express.json())
app.use(express.urlencoded({extended:false}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(async (입력한아이디, 입력한비번, cb) => {
    let result = await db.collection('user').findOne({ username : 입력한아이디})
    if (!result) {
      return cb(null, false, { message: '아이디 DB에 없음' })
    }
  
    if (await bcrypt.compare(입력한비번, result.password)) {
      return cb(null, result)
    } else {
      return cb(null, false, { message: '비번불일치' });
    }
  })) ;

passport.serializeUser((user, done) => {
    process.nextTick(() => {
        done(null, { id: user._id, username: user.username })
    })
})

passport.deserializeUser( async (user, done) => {
    let result = await db.collection('user').findOne({ _id : new ObjectId(user.id)})
    delete result.password
    process.nextTick(() => {
      return done(null, user)
    })
})

const client = new MongoClient(uri);

async function run() {
    await client.connect();
    const db = client.db('forum');
    global.db = db
    app.listen(8080,()=>{
        console.log('서버 on')
    })
    console.log('db on');
  } 
run().catch(console.dir);


app.get('/list/:page', async (req,res) => {
    let result = await db.collection('post').find().skip((req.params.page -1) * 10).limit(10).toArray()
    const page = parseInt(req.params.page)
    user = req.user
    res.render('list.ejs',{result:result, page: page+1, user : user})
})

app.get('/create', async (req,res) => {
    res.render('create.ejs')
})

app.post('/create', async (req,res) => {
    await db.collection('post').insertOne({
        title : req.body.title,
        content : req.body.content
    })
    res.redirect('/list/1')
})

app.get('/:_id/update', async(req,res) => {
    let result = await db.collection('post').findOne({_id : new ObjectId(req.params._id)})
    res.render('update.ejs',{result:result})
})

app.post('/:_id/update', async(req,res) => {
    await db.collection('post').updateOne({_id : new ObjectId(req.params._id)}, 
        {$set: { title : req.body.title,
        content : req.body.content}})
    res.redirect('/list/1')
})

app.get('/:_id/delete', async(req,res) => {
    await db.collection('post').deleteOne({_id : new ObjectId(req.params._id)})
    res.redirect('/list/1')
})

app.get('/login', async(req,res) => {
    res.render('login.ejs')
})

app.post('/login', passport.authenticate('local', {
    successRedirect: '/list/1',
    failureRedirect: '/login'
}));

app.get('/logout', (req, res) => {
    req.logout();
    req.session.save((err) => {
        res.redirect('/');
    });
});

app.get('/signup', async(req,res) => {
    res.render('signup.ejs')
})

app.post('/signup', async(req,res) => {
    let hashing = await bcrypt.hash(req.body.password, 10)
    await db.collection('user').insertOne({
        username : req.body.username,
        password : hashing
    })
    res.redirect('/list/1')
})

app.get('/user_info', async(req,res) => {
    let result = await db.collection('user').findOne({ _id : new ObjectId(req.user.id)})
    res.render('user_info.ejs',{result : result})
})
