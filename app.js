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
const botSchema = require('./schema/botSchema')
const kycSchema = require('./schema/kycSchema')

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

// app.get('/adminregister', (req,res)=>{
//     res.render('adminregister')
// })


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
        const user = await userschema.find().populate('kyc')
        const pendDeposit = await depositSchema.find({status: 'Pending'})
        const confirmDeposit = await depositSchema.find({status: 'Completed'})
        const pendingwithdrawal = await withdrawSchema.find({status: 'Pending'})
        const confirmwithdrawal = await withdrawSchema.find({status: 'Completed'})
        const failedwithdrawal = await withdrawSchema.find({status: 'Failed'})
        res.render('admin', {users: user, pendDeposits: pendDeposit, confirmDeposits: confirmDeposit, confirmWithdrawals: confirmwithdrawal, pendingWithdrawals: pendingwithdrawal, failedwithdrawals: failedwithdrawal })
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
  
  app.post('/edit', async (req,res)=>{
      const details = req.body
      const email = details.email
      const filter = {email: details.email}
      balanceSchema.findOneAndUpdate(filter, {$set: {balance: details.balance, deposit: details.deposit, withdrawal: details.withdrawal, profit: details.profit}}, {new: true}, (err,dets)=>{
          if (err){
              console.log(err)
              req.flash('danger', 'An Error Occured, Please try again')
              res.redirect('/update')
          } else{
              req.flash('success', 'User Account Updated Successfully')
              res.redirect('/update')
            //   console.log(dets)
                let balance = dets.balance
                let deposit = dets.deposit
                let bot = dets.bot
                let botID
              if(balance > 0 && deposit >0 && !(bot)){
                balanceSchema.findOneAndUpdate(filter, {$set: {bot: true}}, {new: true}, (err)=>{
                    if(err){
                        console.log(err)
                    }
                })
                setTimeout(() => { 
                    botTnx(email);
                    console.log(`Bot started for ${email}`)
                   }, 1000 * 60 * 10); 
                botID = setInterval(() => { 
                    botTnx(email);
                    console.log(`Bot started again for ${email}`)
                   }, 1000 * 60 * 60 * 24); 
                // console.log(botID[Symbol.toPrimitive]())
                let botID2 = botID[Symbol.toPrimitive]()
                balanceSchema.findOneAndUpdate(filter, {$set: {botID: botID2}}, {new: true}, (err)=>{
                    if(err){
                        console.log(err)
                    } else{
                        console.log(`BotID updated for ${email}`)
                    }
                })
              } else if (balance > 0 && deposit >0 && bot){
                console.log(`Bot Active for ${email}`)
              } else{
                console.log(`Insufficient balance for ${email}`)
              }
          }
      })
  
  })

  app.post('/endBot', async (req,res)=>{
    let details = req.body
    let email = details.email
    const filter = {email: details.email}
    let theuser = await balanceSchema.findOne({email: email})
    let botIntervalID = theuser.botID
    // console.log(botIntervalID)
    clearInterval(botIntervalID)
    balanceSchema.findOneAndUpdate(filter, {$set: {bot: false}}, {new: true}, (err)=>{
        if(err){
            console.log(err)
        }
    })
    req.flash('success', `Bot Stopped for ${email}`)
    res.redirect('/')
  })

  app.post('/addBot', async (req,res)=>{
    let {amount, type, loss, email} = req.body
    // console.log(amount, type, loss, email)
    
    try {
        let theuser = await balanceSchema.findOne({email: email})
        let balance = theuser.balance
        let profit = theuser.profit
        let newBalance, newProfit
        const btcPrice = await getBTCPriceWithRetry()
        const currentDate = new Date();
        const formattedDateTime = currentDate.toLocaleDateString();

        if(btcPrice != null){
            // console.log(`BTC Price: ${btcPrice}`)
            // console.log(`Bot started for ${email}`)
            // console.log(`Time: ${formattedDateTime}`)
            // console.log(`Amount : ${amount}`)

            let isLoss = loss == 'true' ? true : false

            const bot = new botSchema({
                email: email,
                btcPrice: btcPrice,
                time: formattedDateTime,
                amount: amount,
                type: type,
                loss: isLoss
            })
            await bot.save()

            if (isLoss){
                newBalance = balance - parseFloat(amount)
                newProfit = profit - parseFloat(amount)
                newBalance = newBalance.toFixed(2)
                newProfit = newProfit.toFixed(2)
            } else{
                newBalance = balance + parseFloat(amount)
                newProfit = profit + parseFloat(amount)
                newBalance = newBalance.toFixed(2)
                newProfit = newProfit.toFixed(2)
            }

            balanceSchema.findOneAndUpdate({email: email}, {$set: {balance: newBalance, profit: newProfit}}, {new: true}, (err,dets)=>{
                if (err){
                    console.log(err)
                    req.flash('danger', 'An Error Occured, Please try again')
                    res.redirect('/update')
                } else{
                    req.flash('success', 'Bot Transaction added succesfully!')
                    res.redirect('/update')
                }
            })

        } else{
            console.log("Failed to fetch BTC price. Skipping transaction.");
            req.flash('danger', 'An Error Occured, Please try again')
            res.redirect('/update')
        }        
    } catch (error) {
        console.log('Error in adding bot transaction:', error)
        req.flash('danger', 'An Error Occured, Please try again')
        res.redirect('/update')
    }

  })

  async function botTnx(email){
    let tradesCount = 0;
    while ( tradesCount < 6) {
        try {
            let theuser = await balanceSchema.findOne({email: email})
            let balance = theuser.balance
            let profit = theuser.profit
            let newBalance, newProfit
            const btcPrice = await getBTCPriceWithRetry()
            const currentDate = new Date();
            const formattedDateTime = currentDate.toLocaleDateString();
            // generateAmount(email)
            const amount = await generateAmount(email)
            if(btcPrice != null){
                // console.log(`BTC Price: ${btcPrice}`)
                // console.log(`Bot started for ${email}`)
                // console.log(`Time: ${formattedDateTime}`)
                // console.log(`Amount : ${amount}`)

                const isBuyTransaction = Math.random() < 0.5;
                const isLossTransaction = Math.random() < 0.13;
                const txnDurationRatio = Math.random()

                let transactionType = isBuyTransaction ? 'buy' : 'sell'
                let isLoss = isLossTransaction ? true : false

                const bot = new botSchema({
                    email: email,
                    btcPrice: btcPrice,
                    time: formattedDateTime,
                    amount: amount,
                    type: transactionType,
                    loss: isLoss
                })
                await bot.save()

                if (isLoss){
                    newBalance = balance - parseFloat(amount)
                    newProfit = profit - parseFloat(amount)
                    newBalance = newBalance.toFixed(2)
                    newProfit = newProfit.toFixed(2)
                } else{
                    newBalance = balance + parseFloat(amount)
                    newProfit = profit + parseFloat(amount)
                    newBalance = newBalance.toFixed(2)
                    newProfit = newProfit.toFixed(2)
                }

                balanceSchema.findOneAndUpdate({email: email}, {$set: {balance: newBalance, profit: newProfit}}, {new: true}, (err,dets)=>{
                    if (err){
                        console.log(err)
                    }
                })

                // console.log(transactionType)
                // console.log(isLoss)
                tradesCount++
                await new Promise(resolve => setTimeout(resolve, 1000 * 60 * 60 * 4 * txnDurationRatio));
            } else{
                console.log("Failed to fetch BTC price. Skipping transaction.");
            }
        } catch (error) {
            console.error('Error in bot:', error);
        }
    }
    console.log("Maximum number of trades reached for the day.");
  }

  async function getBTCPriceWithRetry(maxRetries = 3) {
    let retries = 0;

    while (retries < maxRetries) {
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
            const data = await response.json();
            
            // Extract the BTC price from the response
            const btcPrice = data.bitcoin.usd;
            
            return btcPrice;
        } catch (error) {
            console.error('Error fetching BTC price:', error);

            // Increment the retry count
            retries++;

            // Add a delay before retrying (adjust as needed)
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
    }
    // If max retries reached without success, return null or throw an error
    console.error(`Failed to fetch BTC price after ${maxRetries} retries.`);
    return null;
  }

  async function generateAmount(email){
    let theuser = await balanceSchema.findOne({email: email})
    let deposit = theuser.deposit
    // console.log(theuser)
    let twoPercent = deposit * 0.02;

    function getRandomNumber() {
        return Math.random();
    }

    const randomValue = getRandomNumber() * twoPercent;
    return randomValue.toFixed(2)
  }
  
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
    //   console.log(body.id)
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
      let theemail = user.email

      const filter2 = {email: theemail}
  
      userschema.deleteOne(filter).then(function(){
          console.log("User deleted"); // Success
      }).catch(function(error){
          console.log(error); // Failure
      });
  
      balanceSchema.deleteOne(filter2).then(function(){
          console.log("User Balance deleted"); // Success
      }).catch(function(error){
          console.log(error); // Failure
      });

      botSchema.deleteOne(filter2).then(function(){
            console.log("User Bot Txns deleted"); // Success
        }).catch(function(error){
            console.log(error); // Failure
        });
  
      res.redirect('/')
  })

  app.get('/kyc/:id', async(req,res)=>{
    const id = req.params.id
    const user = await userschema.findOne({_id:id}).populate('kyc')
    res.render('kyc', {theuser: user})
  })
  
  app.post('/verifyKYC', async(req,res)=>{
    const {id} = req.body
    const filter = {_id: id}
    kycSchema.findOneAndUpdate(filter, {$set: {status: 'Verified'}}, {new: true}, (err)=>{
        if(err){
            console.log(err)
        }
    })
    res.redirect('back')
  })
  
  const port = process.env.PORT || 3000
  
  app.listen(port, ()=>{
      console.log(`App started on port ${port}`)
  } )