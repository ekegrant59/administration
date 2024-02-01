require('dotenv').config()
const express = require('express') 
const ejs = require('ejs')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const session = require('express-session')
const adminSchema = require('./schema/adminSchema')
const userschema = require('./schema/userSchema')
const balanceSchema = require('./schema/balanceSchema')
const depositSchema = require('./schema/depositSchema')
const withdrawSchema = require('./schema/withdrawSchema')

const adminkey = process.env.ADMINKEY
const secretkey = process.env.SECRETKEY

const mongodb = process.env.MONGODB
mongoose.connect(mongodb)
.then(() => {
   console.log('Connection successful')
}).catch((err) => {
    console.log(err, "Connection failed")
})

const app = express()
app.use('/assets', express.static('assets')) 
app.set('view engine', 'ejs')
app.use(express.urlencoded({extended: true}))
app.use(cookieParser())
app.use(express.json())
app.use(
    session({
      resave: false,
      saveUninitialized: true,
      secret: 'secret',
    })
);

app.use(require('connect-flash')());
app.use(function (req, res, next) {
  res.locals.messages = require('express-messages')(req, res);
  next();
});

app.get('/adminregister', (req,res)=>{
    res.render('adminregister')
})


app.post('/adminregister', async(req,res)=>{
    const regInfo = req.body
    const password = regInfo.password
    const password2 = regInfo.password2

  if (password != password2){
    req.flash('danger', 'Passwords do not match, Please Try Again')
    res.redirect('/adminregister')
  } else {
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)
  
      run()
      async function run(){
          try {
              const admin = new adminSchema({
                  email: regInfo.email,
                  password: hashedPassword
              })
              await admin.save()
          }
          catch (err) {
              console.log(err.message)
          
          }
      }
      req.flash('success', 'Registeration Successful, Please Log In')
      res.redirect('/')
  }
    
  })

  app.get('/',protectAdminRoute, async (req,res)=>{
    try{
        const user = await userschema.find()
        const pendDeposit = await depositSchema.find({status: 'Pending'})
        const confirmDeposit = await depositSchema.find({status: 'Completed'})
        const pendingwithdrawal = await withdrawSchema.find({status: 'Pending'})
        const confirmwithdrawal = await withdrawSchema.find({status: 'Completed'})
        const failedwithdrawal = await withdrawSchema.find({status: 'Failed'})
        res.render('admin', {users: user, pendDeposits: pendDeposit, confirmDeposits: confirmDeposit, confirmWithdrawals: confirmwithdrawal, pendingWithdrawals: pendingwithdrawal, failedwithdrawals:failedwithdrawal })
    } catch(err){
        console.log(err)
    }
  })
    
    function protectAdminRoute(req, res, next){
        const token = req.cookies.admintoken
        try{
            const user = jwt.verify(token, adminkey)
    
            req.user = user
            // console.log(req.user)
            next()
        }
        catch(err){
            res.clearCookie('admintoken')
            return res.render('adminlogin')
        }
    }
  
    app.post('/adminlogin', (req,res)=>{
      const loginInfo = req.body
  
      const email = loginInfo.email
      const password = loginInfo.password
  
      adminSchema.findOne({email})
      .then((admin)=>{
          adminSchema.findOne({email: email}, (err,details)=>{
              if(!details){
                  req.flash('danger','User not found!, Please try again')
                  res.redirect('/')
              } else{
                  bcrypt.compare(password, admin.password, async (err,data)=>{
                      if(data){
                          const payload1 = {
                              user:{
                                  email: admin.email
                              }
                          }
                          const token1 = jwt.sign(payload1, adminkey,{
                              expiresIn: '3600s'
                          })
  
                          res.cookie('admintoken', token1, {
                              httpOnly: false
                          })
  
                          res.redirect('/')
                      } else{
                          req.flash('danger', 'Incorrect Password, Please Try Again!')
                          res.redirect('/')
                      }
                  })
              }
          })
      }).catch((err)=>{
          console.log(err)
      })
  })
  
  app.get('/update',protectAdminRoute, (req,res)=>{
      res.render('adminUpdate')
  })
  
  app.get('/edit/:id', async (req,res)=>{
      let email = req.params.id 
      // console.log(username)
  
      try{
          let balance = await balanceSchema.findOne({email: email})
      // console.log(balance)
          res.send(balance)
      } catch(err){
          console.log(err)
      }
  })
  
  app.post('/edit', (req,res)=>{
      const details = req.body
      const filter = {email: details.email}
      balanceSchema.findOneAndUpdate(filter, {$set: {balance: details.balance, deposit: details.deposit, withdrawal: details.withdrawal, profit: details.profit}}, {new: true}, (err,dets)=>{
          if (err){
              console.log(err)
              req.flash('danger', 'An Error Occured, Please try again')
              res.redirect('/update')
          } else{
              req.flash('success', 'User Account Updated Successfully')
              res.redirect('/update')
          }
      })
  
  })
  
  app.post('/confirm/deposit', (req,res)=>{
      const body = req.body
      // console.log(body.transactID)
      const filter = {_id: body.id}
      depositSchema.findOneAndUpdate(filter, {$set: {status: 'Completed'}}, {new: true}, (err)=>{
          if(err){
              console.log(err)
          }
      })
      res.redirect('/')
  })
  
  app.post('/unconfirm/deposit', (req,res)=>{
      const body = req.body
      // console.log(body.transactID)
      const filter = {_id: body.id}
      depositSchema.findOneAndUpdate(filter, {$set: {status: 'Pending'}}, {new: true}, (err)=>{
          if(err){
              console.log(err)
          }
      })
      res.redirect('/')
  })
  
  app.post('/confirm/withdrawal', (req,res)=>{
      const body = req.body
      // console.log(body.transactID)
      // console.log(body.id)
      const filter = {_id: body.id}
      withdrawSchema.findOneAndUpdate(filter, {$set: {status: 'Completed'}}, {new: true}, (err)=>{
          if(err){
              console.log(err)
          }
      })
      res.redirect('/')
  })
  
  app.post('/failed/withdrawal', (req,res)=>{
      const body = req.body
      // console.log(body.transactID)
      // console.log(body.id)
      const filter = {_id: body.id}
      withdrawSchema.findOneAndUpdate(filter, {$set: {status: 'Failed'}}, {new: true}, (err)=>{
          if(err){
              console.log(err)
          }
      })
      res.redirect('/')
  })
  
  app.post('/unconfirm/withdrawal', async (req,res)=>{
      const body = req.body
      // console.log(body.transactID)
      const filter = {_id: body.id}
      // const found = await withdrawSchema.findOne(filter)
      // console.log(found)
      withdrawSchema.findOneAndUpdate(filter, {$set: {status: 'Pending'}}, {new: true}, (err)=>{
          if(err){
              console.log(err)
          }
      })
      res.redirect('/')
  })
  
  app.post('/delete/user', async (req,res)=>{
      const body = req.body
      const filter = {_id: body.id}
  
      let user = userschema.findOne(filter)
      let email = user.email
  
      userschema.deleteOne(filter).then(function(){
          console.log("User deleted"); // Success
      }).catch(function(error){
          console.log(error); // Failure
      });
  
      balanceSchema.deleteOne({email: email}).then(function(){
          console.log("User Balance deleted"); // Success
      }).catch(function(error){
          console.log(error); // Failure
      });
  
      res.redirect('/')
  })
  
  
  const port = process.env.PORT || 3000
  
  app.listen(port, ()=>{
      console.log(`App started on port ${port}`)
  } )