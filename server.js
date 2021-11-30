require('dotenv').config()

//Brings express into the app
const express = require('express')
const fs = require('fs')
const app = express()
const MongoClient = require('mongodb').MongoClient
const cloudinary = require('cloudinary').v2
const multer = require('multer')
const upload = multer()

let db,
    dbConnectionStr = process.env.DB_STRING,
    dbName = 'SouthernPaiute'
    PORT = process.env.PORT || 8000

MongoClient.connect(dbConnectionStr, { useUnifiedTopology : true})
    .then(client => {
        console.log(`Connected to ${dbName} Database`)
        db = client.db(dbName)
    })
    .catch((err) =>{
      console.error("Failure to connect: ", err.message, err.stack)
    })

//Using EJS for views
app.set("view engine", "ejs");

//Body Parsing
app.use(express.static('views'))//lets you use files in your public folder
app.use(express.urlencoded({ extended : true}))//method inbuilt in express to recognize the incoming Request Object as strings or arrays. 
app.use(express.json())//method inbuilt in express to recognize the incoming Request Object as a JSON Object.

//Home Page
app.get('/', (req,res) =>{
  res.render('homePage.ejs')
})
//Search Results Page
app.get("/search", async (req, res) => {
    res.render('searchResults.ejs')

    let { searchResult } = await req.query;
    const regex = new RegExp(searchResult, "gi");
    try {
      const dictionaryDB = await db
        .collection("SouthernPaiute")
        .find({
           result: { $regex: regex } 
        })
        .toArray();
      console.log(dictionaryDB);
      if (dictionaryDB.length) {
        return res.render("searchResults.ejs", { searchQueryResults: dictionaryDB });
      }
      return res.render("searchResults.ejs", { searchQueryResults: null });
    } catch (err) {
      console.error(err);
    }

  });
// app.get('/search', (req, res) =>  {
//   getResult: async (req,res) => {
//       try {
//           const results = await Result.findbyId({req.params.id})
//           .then((data) => {
//               if (!data) {
//                   return res.status(404).send({
//                       message: "Sorry, that result can't be found."
//                   })
//               }
//           })
//       }
//   }
//   db.collection('SouthernPaiute').find({}, { projection: {_id:}}).toArray()
//   .then(data => {
//       console.log(data)
//       res.render('searchResults.ejs', { info: data })
// //   })
//   .catch(error => console.error(error))
// })

// Specific Results Page
// app.get('/:id', (req,res) =>{
//     db.collection('SouthernPaiute').find().toArray()
//     .then(data => {
//         console.log(data)
//         res.render('wordPage.ejs', { info: data })
//     })
//     .catch(error => console.error(error))
//   })


//About Page
app.get('/about', (req,res) =>{
    res.render('aboutPage.ejs')
    if(err){console.log(error)}
})

//Contact Page
app.get('/contact', (req,res) =>{
    res.render('contactPage.ejs')
})

//Alphabet Page
app.get('/alphabet', (req,res)=>{
    try {res.render('alphabetPage.ejs')
  }catch (err) {
    console.error(err);}
})

//Input Page
app.get('/input', (req,res)=>{
    res.render('inputPage.ejs')
})

  app.post("/addEntry", async (req, res) => {
    // Get the file name and extension with multer
    const storage = multer.diskStorage({
      filename: (req, file, cb) => {
        const fileExt = file.originalname.split(".").pop();
        const filename = `${new Date().getTime()}.${fileExt}`;
        cb(null, filename);
      },
    });
  
    // Filter the file to validate if it meets the required audio extension
    const fileFilter = (req, file, cb) => {
      if (file.mimetype === "audio/mp3" || file.mimetype === "audio/wav") {
        cb(null, true);
      } else {
        cb(
          {
            message: "Unsupported File Format",
          },
          false
        );
      }
    };
  
    // Set the storage, file filter and file size with multer
    const upload = multer({
      storage,
      fileFilter,
    }).single("audio");
  
    // upload to cloudinary
    upload(req, res, (err) => {
      if (err) {
        return res.send(err);
      }
  
      // SEND FILE TO CLOUDINARY
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });

      const { path } = req.file; // file becomes available in req at this point
  
      const fName = req.file.originalname.split(".")[0];
       cloudinary.uploader.upload( //got rid of 'result' var because it wasn't being used and wasn't in source code.
        path,
        {
          resource_type: "raw",
          public_id: `AudioUploads/${fName}`,
        },
  
        // Send cloudinary response or catch error
        (err, audio) => {
          if (err) return res.send(err);

          db.collection("SouthernPaiute").insertOne(
            {wordInput: req.body.wordInput, audioInput: audio, phoneticInput: req.body.phoneticInput, grammaticalInput: req.body.grammaticalInput, translationInput: req.body.translationInput, exampleInput: req.body.exampleInput, })
            ///for the audio input, changed req.body.audioInput to 'result' to implement the 'result' var. Not sure if that's how it works or not.
            .then(audio => {
              console.log(audio)
              
            })
  
          fs.unlinkSync(path);
          res.redirect('/');
        }
      );
      
    });
  });


app.listen(PORT, ()=>{
    console.log(`Server running on port ${PORT}`)
})


      //to be fixed
      // cloudinary.v2.uploader.upload(req.file.path, 
      //   function(error, result) {console.log(result, error); });
      // .then(result => {
      //   console.log(result)
      //   res.redirect('/')
      // })
      //this comes from the documentation, but I kind of already have this under the 'result' var. So how do I implement 'result'?