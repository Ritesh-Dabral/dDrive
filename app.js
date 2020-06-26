const e = require('express');

// VARIABLE DECLERATIONS
var express = require('express'),
    app     = express(),
    bodyParser = require('body-parser'),
    mongo   = require('mongodb'),
    bcrypt  = require('bcrypt'),
    multer  = require('multer'),
    fs      = require('fs'),
    session = require('client-sessions');


//INITIAL SETTINGS
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended:true}));
app.set('view engine','ejs');

        //Cookie initial setting
app.use(session({
    cookieName: 'session',
    secret: 'MarvelEntertainmentIsBetterThanDCUniverse',
    duration: 30 * 60 * 1000,  //30 min
    activeDuration: 5 * 60 * 1000, //5 min  , starts after
  }));


mongo = mongo.MongoClient;
var url = "mongodb://127.0.0.1:27017/"; 

            //to remove mongo db deprecation warnings
var warnings = { 
    useUnifiedTopology:true,
    useNewUrlParser: true
}
            //for bcrypt hash rounds
const saltRounds = 10;

//DOWNLOAD
app.get("/:userId/:fileName/download",(req,res)=>{
    const fileDir = `${__dirname}/uploads/${req.params.userId}/${req.params.fileName}`;
    res.download(fileDir);
    console.log("File download successful");
});

//UPLOAD
app.post("/:userId/upload",(req,res)=>{
    //setting up storage engine

    var newStorage = multer.diskStorage({
        destination: function(req,file,cb){
            cb(null,'uploads/'+req.params.userId+'/');
        },
        filename:function(req,file,cb){
            cb(null,file.originalname);
        }
    });

    var upload = multer({storage:newStorage}).array('myFile');

    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
          // A Multer error occurred when uploading.
          res.render('error',{error:err});
        } else if (err) {
          // An unknown error occurred when uploading.
          res.render('error',{error:err});
        }
        // Everything went fine.
        console.log("upload successful for user: "+req.params.userId);

        res.redirect("/dashboard/"+req.params.userId);
      })
    
});

//LOGOUT
app.get("/logout",(req,res)=>{
    req.session.reset();
    res.redirect('/');
});

// DASHBOARD
app.get("/dashboard/:userId",(req,res)=>{

    if(req.session && req.session.user){
        mongo.connect(url,warnings,(err,db)=>{
            if(err)
                throw err;
            var dbObj = db.db("dDrive_users");
            dbObj.collection("users").findOne({"username":req.session.user.username},(err,user)=>{
                if(!user){
                    req.session.reset();
                    res.redirect("/");
                }
                else{
                        delete req.session.user.password;
                        //find user id from users collection and then render the data
                        var userIdHere = req.params.userId;
                        var allFiles;
                        fs.readdir("uploads/"+userIdHere, (err,files)=>{
                            if(err)
                                throw err;
                            allFiles = files;
                            res.render('dashboard',{userId:userIdHere,allFiles:allFiles});
                        });
                }
            });
        });
    }
    else{
        res.redirect("/");
    }
    
});

// LOGIN ROUTE (POST)
app.post("/login",(req,res)=>{

    console.log("inside login");
    var loginFlag = false;
    //connect to db    
    mongo.connect(url,warnings,(err,db)=>{
        if(err)
            throw err;

        console.log("Inside DB");
        
        var dbObj = db.db("dDrive_users");

        dbObj.collection("users").findOne({"username":req.body.username}).then(
            function(user){
                if(!user){
                    res.redirect('/');
                }
                else{
                    bcrypt.compare(req.body.password, user.password,(err,result)=>{
                        if(result==true){
                            //saving user data, to Cookie Session
                            req.session.user = user;
                            res.redirect("/dashboard/"+user._id);
                        }
                        else{
                            console.log("Unable to login");
                            res.redirect("/");
                        }
                    });
                }
                console.log("DB CLOSED");
                db.close();
            });
    });
});

// SIGNUP ROUTE (POST)
app.post("/signup",(req,res)=>{

    var newUserId='';
    //user object
    let user = {
        username : req.body.username,
        email : req.body.email,
        password : req.body.password,
    };

    //connect to db
    mongo.connect(url,warnings,(err,db)=>{
        if(err)
            throw err;
        
        console.log("DB created / connected");
        let dbObj = db.db("dDrive_users");

        dbObj.createCollection("users", (err,data)=>{
            if(err)
                throw err;
            console.log("Collection created / connected");
        });

        // hashing the password
        bcrypt.hash(user.password, saltRounds, function(err, hash) {
            if(err)
                throw err;
            
            user.password = hash;

            //now saving the updated user into DB
            dbObj.collection("users").insertOne(user,(err,data)=>{
                if(err)
                    throw err;
                
                newUserId = data.insertedId;
                console.log('Insert Successful '+newUserId);
                
                //Creating new directory with unique UserId
                dir='uploads/'+newUserId;
                try {
                    if (!fs.existsSync(dir)){
                      fs.mkdirSync(dir)
                    }
                  } catch (err) {
                    console.error(err)
                  }
                db.close();
            });
        });

    });
    res.redirect("/");
});

// ROOT ROUTE
app.get('/',(req,res)=>{
    res.render('login',{title:'LOGIN'});
})

// SERVER
app.listen(8085,(err)=>{
    if(err)
        console.log('SHUT DOWN');
    else
        console.log('SERVER STARTED');
})