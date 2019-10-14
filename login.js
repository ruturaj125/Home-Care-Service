var fs=require('fs');
var express=require('express');
var bcrypt=require('bcrypt');
var bodyParser = require('body-parser')
var MongoClient = require('mongodb').MongoClient;
var nodemailer = require("nodemailer");
var session=require('express-session');
var ejs=require('ejs');
var url = "mongodb://localhost:27017/";
var app=express();

 ///////////////////        declarations            ////////////////////////

app.use(session({resave: true, saveUninitialized: true, secret: 'SOMERANDOMSECRETHERE', cookie: { maxAge: 600000 }}));
var urlencodedParser = bodyParser.urlencoded({ extended: false })
app.use('/assets',express.static('./assets'));
app.set('view engine','ejs');

///////////////////      Respective Login page display       /////////////////////////////////
function checkAuth(req, res, next) {
  if (!req.session.user) {
    res.redirect('/');
  } else {
    next();
  }
}
app.get('/',function(req,res){
	res.writeHead(200, {'Content-Type': 'text/html'})
	var MyReadStream=fs.createReadStream(__dirname+"/index.html",'utf8');
	MyReadStream.pipe(res);
});
app.get('/customer',function(req,res){
	res.writeHead(200, {'Content-Type': 'text/html'})
	var MyReadStream=fs.createReadStream(__dirname+"/Customer_login.html",'utf8');
	MyReadStream.pipe(res);
});
app.get('/customer/home',checkAuth,function(req,res){
	res.writeHead(200, {'Content-Type': 'text/html'})
	var MyReadStream=fs.createReadStream(__dirname+"/Cust_dashboard.html",'utf8');
	MyReadStream.pipe(res);
});
app.get('/provider',function(req,res){
	res.writeHead(200, {'Content-Type': 'text/html'})
	var MyReadStream=fs.createReadStream(__dirname+"/Provider_login.html",'utf8');
	MyReadStream.pipe(res);
});
app.get('/forgot',function(req,res){
	res.writeHead(200, {'Content-Type': 'text/html'})
	var MyReadStream=fs.createReadStream(__dirname+"/forgot.html",'utf8');
	MyReadStream.pipe(res);
});

///////////////////////// profile pages//////////////////////////////////////
app.get('/customer/profile',checkAuth,function(req,res){
	var email=req.session.user.email;
	MongoClient.connect(url, function(err, db) {
		if (err) throw err;
		var dbo=db.db('homecare');
		dbo.collection("customers").find({email:email}).toArray(function(err,cres){
			if (err) throw err;
			res.render('Customer_profile',{data:cres[0]});
		})

})
})

app.get('/provider/profile',checkAuth,function(req,res){
	var email=req.session.user.email;
	MongoClient.connect(url, function(err, db) {
		if (err) throw err;
		var dbo=db.db('homecare');
		dbo.collection("providers").find({email:email}).toArray(function(err,cres){
			if (err) throw err;
			res.render('Servent_profile',{data:cres[0]});
		})

})
})
////////////////////  adress update     /////////////////////////////////////
app.post('/customer/update',checkAuth,urlencodedParser, function(req,res){
	var area=req.body.area;
	var city=req.body.city;
	var pincode=req.body.pincode;
	MongoClient.connect(url, function(err, db) {
		if (err) throw err;
		var dbo=db.db('homecare');
		dbo.collection("customers").update({email:req.session.user.email},{$set:{area:area,city:city,pincode:pincode}},function(err,cres){
			if (err) throw err;
			res.redirect('/customer/profile');
		})

	})
})

app.post('/provider/update',checkAuth,urlencodedParser,function(req,res){
	var area=req.body.area;
	var city=req.body.city;
	var pincode=req.body.pincode;
	MongoClient.connect(url, function(err, db) {
		if (err) throw err;
		var dbo=db.db('homecare');
		dbo.collection("providers").update({email:req.session.user.email},{$set:{area:area,city:city,pincode:pincode}},function(err,cres){
			if (err) throw err;
			res.redirect('/provider/profile');
		})

	})
})
////////////////////    Nodemailer Login smtpTransport        //////////////////////////////

var smtpTransport = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: "lldevelopers18@gmail.com",
        pass: "lasun12345"
    },
    tls: {
         rejectUnauthorized: false
     }
});
var rand,mailOptions,host,link;

///////////////////        Customer Registration         ///////////////////////////
app.post('/customer/register',urlencodedParser,function(req,res){
	console.log("customer registration ")
	var name=req.body.name;
  	var emailid=req.body.email;
	var mobno=req.body.mobno;
	var area=req.body.area;
	var pin=req.body.pin;
	var city=req.body.city;
  	var pass=req.body.password;
	MongoClient.connect(url, function(err, db) {
		if (err) throw err;
		var dbo=db.db('homecare');
		dbo.collection("customers").find({email:emailid}).toArray(function(err,cres){
			if(cres.length!=0){
				console.log("user already Exist");
				res.writeHead(200, {'Content-Type': 'text/html'})
				var MyReadStream=fs.createReadStream(__dirname+"/customer_login.html",'utf8');
				MyReadStream.pipe(res);
				res.end();
			}
			else{
				var passhash=bcrypt.hashSync(pass,10);
				rand=Date.now();
				host=req.get('host');
        link="http://"+req.get('host')+"/customer/verify?id="+rand;
        mailOptions={
          to : emailid,
          subject : "Please confirm your Email account",
          html : "Hello,<br> Please Click on the link to verify your email.<br><a href="+link+">Click here to verify</a>"
        }
        console.log("link created:"+link);
				dbo.collection("customers").insertOne({name:name,email:emailid,mobno:mobno,area:area,city:city,pincode:pin,password:passhash,token:rand,active:false},function(err,res){
   		      if(err) throw err;
   		      console.log("user inserted");

         });
			 	smtpTransport.sendMail(mailOptions, function(error, response){
			         if(error){
			           console.log(error);
			         }else{
						console.log("mail sent");
			           res.redirect('/customer');
			        }
			      });
			}
			db.close();
		});

	});
});
//////////////////         Customer Login              ///////////////////////////////
app.post('/customer/login',urlencodedParser,function(req,res){
	console.log("customer login ")
	var emailid=req.body.email;
	var pass=req.body.password;
	MongoClient.connect(url, function(err, db) {
		if (err) throw err;
		var dbo=db.db('homecare');
		dbo.collection("customers").find({email:emailid}).toArray(function(err,cres){
			if(err) throw err;
			if(cres.length==0){
				console.log(ures);
				console.log("User Doesn't exist..Register first");
				res.redirect('/customer');
				res.end();
			}
			else if(cres[0].active==false){
				console.log("Please Verify Your email first");
				res.redirect('/');
			}
			else{
				console.log(cres);
				if(bcrypt.compareSync(pass,cres[0].password)){
					console.log("succesfully login");
					req.session.user={email:emailid,type:'customer',pincode:cres[0].pincode};
					res.writeHead(200, {'Content-Type': 'text/html'})
					var MyReadStream=fs.createReadStream(__dirname+"/Cust_dashboard.html",'utf8');
					MyReadStream.pipe(res);
				}
			}
		});
		db.close();
		});
});

app.get('/customer/verify',function(req,res){
  MongoClient.connect(url, function(err, db) {
      if (err) throw err;
      var dbo=db.db('homecare');
      var key=Number(req.query.id);
      dbo.collection("customers").find({"token":key}).toArray(function(err,result){
        if(result.length==0){
            console.log("key does not exist");
            res.sendFile('test.html');
        }
        else{
            if(result[0].token==key){
              dbo.collection("customers").update({"token":key},{$set:{"active":true,"token":null}},function(error,uresult){
                  if(error) throw error;
                  console.log(result[0].email+" account activated");
                  res.redirect('/');
              });
            }
        }
      });
  });
});
//////////////////        Provider Registration      /////////////////////////////
app.post('/provider/register',urlencodedParser,function(req,res){
	console.log("provider registration ")
	var name=req.body.name;
  	var emailid=req.body.email;
	var mobno=req.body.mobno;
	var service=req.body.service;
	var area=req.body.area;
	var pin=req.body.pin;
	var city=req.body.city;
  	var pass=req.body.password;
	MongoClient.connect(url, function(err, db) {
		if (err) throw err;
		var dbo=db.db('homecare');
		dbo.collection("providers").find({email:emailid}).toArray(function(err,cres){
			if(cres.length!=0){
				console.log("user already Exist");
				res.writeHead(200, {'Content-Type': 'text/html'})
				var MyReadStream=fs.createReadStream(__dirname+"/Provider_login.html",'utf8');
				MyReadStream.pipe(res);
				res.end();
			}
			else{
				var passhash=bcrypt.hashSync(pass,10);
				rand=Date.now();
				host=req.get('host');
        link="http://"+req.get('host')+"/provider/verify?id="+rand;
        mailOptions={
          to : emailid,
          subject : "Please confirm your Email account",
          html : "Hello,<br> Please Click on the link to verify your email.<br><a href="+link+">Click here to verify</a>"
        }
        console.log("link created:"+link);
				dbo.collection("providers").insertOne({name:name,email:emailid,mobno:mobno,service:service,area:area,city:city,pincode:pin,password:passhash,token:rand,active:false},function(err,res){
   		      if(err) throw err;
   		      console.log("user inserted");

         });
			 smtpTransport.sendMail(mailOptions, function(error, response){
	         if(error){
	           console.log(error);
	         }else{
				console.log("mail sent");
	           res.redirect('/provider');
	        }
	      });
			}
			db.close();
		});

	});
})

/////////////////        provider Login             //////////////////////////////
app.post('/provider/login',urlencodedParser,function(req,res){
	console.log("provider login")
	var emailid=req.body.email;
	var pass=req.body.password;
	MongoClient.connect(url, function(err, db) {
		if (err) throw err;
		var dbo=db.db('homecare');
		dbo.collection("providers").find({email:emailid}).toArray(function(err,cres){
			if(err) throw err;
			if(cres.length==0){
				console.log(ures);
				console.log("User Doesn't exist..Register first");
				res.redirect('/provider');
				res.end();
			}
			else if(cres[0].active==false){
				console.log("Please Verify Your email first");
				res.redirect('/');
			}
			else{
				console.log(cres);
				if(bcrypt.compareSync(pass,cres[0].password)){
					console.log("succesfully login");
					req.session.user={password:pass,email:emailid,type:'provider'};
					res.redirect('/provider/pending');
				}
			}
		});
		db.close();
	});
})
app.get('/logout',function(req,res){
	delete req.session.user;
	res.redirect('/');
})

app.get('/provider/verify',function(req,res){
  MongoClient.connect(url, function(err, db) {
      if (err) throw err;
      var dbo=db.db('homecare');
      var key=Number(req.query.id);
      dbo.collection("providers").find({"token":key}).toArray(function(err,result){
        if(result.length==0){
            console.log("key does not exist");
            //res.sendFile('test.html');
        }
        else{
            if(result[0].token==key){
              dbo.collection("providers").update({"token":key},{$set:{"active":true,"token":null}},function(error,uresult){
                  if(error) throw error;
                  console.log(result[0].email+" account activated");
                  res.redirect('/');
              });
            }
        }
      });
  });
});

///////////////////////// Forget Password(sends Email) /////////////////////////////////////

app.post('/forget',urlencodedParser,function(req,res){
	var emailid=req.body.email;
	var type=req.body.type;
	rand=Date.now();
	MongoClient.connect(url, function(err, db) {
      var dbo=db.db('homecare');
      dbo.collection(type).update({"email":emailid},{$set:{"token":rand}},function(error,result){
        if(error) throw error;
        if(result.length==0){
          console.log("Invalid Email id");
          res.redirect('/forgot');
        }
      });
    });
	if(type=='customers'){
		link="http://"+req.get('host')+"/customer/pass_redirect?id="+rand;
	}
	else{
		link="http://"+req.get('host')+"/provider/pass_redirect?id="+rand;
	}
	mailOptions={
      to : emailid,
      subject : "Link to renew Password ",
      html : "Hello,<br> Please Click on the link to set new password.<br><a href="+link+">Click here to set new password</a>"
    }
	smtpTransport.sendMail(mailOptions, function(error, response){
		if(error){
		  console.log(error);
		}else{
		  console.log("Message sent: " + response.message);
		  res.redirect('/');
	   }
	});
})
////////////////////// password Redirect /////////////////////
app.get('/customer/pass_redirect',function(req,res){
	MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo=db.db('homecare');
        var key=Number(req.query.id);
        dbo.collection("customers").find({"token":key}).toArray(function(err,result){
          if(result.length==0){
              console.log("key does not exist");
              res.redirect('/customer');
          }
          else{
              if(result[0].token==key){
                dbo.collection("customers").find({"token":key}).toArray(function(error,uresult){
                    if(error) throw error;
                    res.render('change_Password',{email:uresult[0].email,type:'customers'});
                });
              }
            }
        });
    });

});
app.get('/provider/pass_redirect',function(req,res){
	MongoClient.connect(url, function(err, db) {
		if (err) throw err;
		var dbo=db.db('homecare');
		var key=Number(req.query.id);
		dbo.collection("providers").find({"token":key}).toArray(function(err,result){
		  if(result.length==0){
			  console.log("key does not exist");
			  res.redirect('/provider');
		  }
		  else{
			  if(result[0].token==key){
				dbo.collection("providers").find({"token":key}).toArray(function(error,uresult){
					if(error) throw error;
					res.render('change_Password',{email:uresult[0].email,type:'providers'});
				});
			  }
			}
		});
	});

});
///////////////////////// set Password ///////////////////////////////////
app.post('/set_pass',urlencodedParser,function(req,res){
	var emailid=req.body.email;
	var type=req.body.type;
	var pass=req.body.password;
	MongoClient.connect(url,function(err,db){
      if(err) throw err;
      var dbo=db.db('homecare');
      var hash=bcrypt.hashSync(pass,10);
      dbo.collection(type).update({email:emailid},{$set:{"password":hash}},function(err,result){
          if(err) throw err;
          console.log("password updated succesfully");
          //res.render('chome',{username:req.session.username.username});
		  if(type=='customers')
		  	res.redirect('/customer')
		  else
		  	res.redirect('/provider')
      });
    });

})

///////////////////////// Pending Services  /////////////////////////////
app.get('/customer/pending',function(req,res){
	MongoClient.connect(url, function(err, db){
		if(err) throw err;
		console.log(req.body);
		var dbo = db.db("homecare");
		var query = { "user": req.session.user.email};
		dbo.collection("workLog").find(query).toArray(function(err, result){
			console.log(result);
			res.render('pending_services',{data:result})
		})
	})
})
app.get('/customer/remove_complete',function(req,res){
	var pos=req.query.id;
	MongoClient.connect(url, function(err, db){
		if(err) throw err;
		console.log(req.body);
		var dbo = db.db("homecare");
		var query = { "user": req.session.user.email};
		dbo.collection("workLog").find(query).toArray(function(err, result){
			if(err) throw err;
			var que=result[pos];
			console.log(que);
			dbo.collection("workLog").deleteOne(que,function(err,delres){
				if(err) throw err;
				console.log("Deleted");
				db.close();
				res.redirect('/customer/pending')
			})
		})
	})
})

///////////////////////// show available providers ///////////////////////
function getCurrentDate(){
  var dateObj = new Date();
  var month = dateObj.getUTCMonth() + 1; //months from 1-12
  var day = dateObj.getUTCDate();
  var year = dateObj.getUTCFullYear();

  if(day<10)
    day = "0" + day;
  if(month<10)
    month = "0" + month
  newdate = year + "/" + month + "/" + day;
  return newdate;
}

function isAvailableInArea(result,pincode,date,callback){
  var arr = [];
  var i = 0;
  console.log("in avail");
  result.forEach(function(item){

    if(item.pincode.indexOf(pincode)>=0)
    {
		//console.log(result.length);
      MongoClient.connect(url, function(err, db){
        if(err) throw err;
        var dbo = db.db("homecare");
        var query = { "servant":item.email ,"serviceDate":date };
		console.log(query);
        dbo.collection("workLog").find(query).toArray(function(err, result2) {
          if (err) throw err;
		  console.log(result2.length);
		  console.log("date match");
          if(result2.length<3){
            arr.push(item);
		  }
          else {
            console.log("Not Available"+ item.name);
          }
		  i++;
		  //console.log(i);
          if(i == result.length)
          {

            callback(arr);
          }
        });
      });
    }
  });

}

var gdata,gdate;
app.post('/customer/available_providers',checkAuth,urlencodedParser, function(req, res){
      MongoClient.connect(url, function(err, db){
      if(err) throw err;
	  console.log(req.body);
      var dbo = db.db("homecare");
      var query = { "service": req.body.type,pincode:req.session.user.pincode };
	  gdate={date:req.body.date};
      dbo.collection("providers").find(query).toArray(function(err, result) {
      if (err) throw err;
      isAvailableInArea(result,req.session.user.pincode,req.body.date,function(data){
		  console.log("returned");
		  console.log(data);
		  gdata=data;
     	  res.render("available_servents",{data:data});
      });
    });
});
});

app.get('/customer/selected_servent',checkAuth,function(req,res){
	var data=gdata;
	gdata=data[req.query.id];
	console.log(req.query);
	console.log(data[req.query.id])
	res.redirect('/getHostedPageLink2');
});

app.get('/getHostedPageLink2',checkAuth,function(req,res){
  console.log("nav to hosted page");
  //var plan_id=req.body.plan_id;
  var chargebee = require("chargebee");
	chargebee.configure({site : "bookminer-test",
  api_key : "test_CenIe5M2TgsMePcdsXFGxcuIqRIY6Hd8sp"});
  chargebee.hosted_page.checkout_new({
    subscription : {
      plan_id : "service_provider"
    },
    customer : {
      email : "",
      first_name : "",
      last_name : "",
      locale : "",
      phone : ""
    },
    billing_address : {
      first_name : "",
      last_name : "",
      line1 : "",
      city : "",
      state : "",
      zip : "",
      country : ""
    }
  }).request(function(error,result){
    if(error){
      //handle error
      console.log(error);
    }else{
      console.log(result);
      var hosted_page = result.hosted_page;
      res.redirect(hosted_page.url);
    }
  });
});

app.get('/customer/success',checkAuth,function(req,res){
	MongoClient.connect(url, function(err, db) {
		if (err) throw err;
		var dbo=db.db('homecare');
		dbo.collection("customers").find({email:req.session.user.email}).toArray(function(err,cres){
							var query = {
								"user":req.session.user.email,
								"name":cres[0].name,
								"mobno":cres[0].mobno,
								"area":cres[0].area,
								"orderedDate":getCurrentDate(),
								"serviceDate":gdate.date,
								"service":gdata.service,
								"servant":gdata.email,
								"like":false,
								"dislike":false
							};
						dbo.collection("workLog").insertOne(query, function(err, result) {
							if (err) throw err;
							console.log("1 document inserted");
							db.close();
					  });
				  });
		});
		res.writeHead(200, {'Content-Type': 'text/html'})
		var MyReadStream=fs.createReadStream(__dirname+"/Cust_dashboard.html",'utf8');
		MyReadStream.pipe(res);
});

app.get('/customer/failure',checkAuth,function(req,res){
	res.writeHead(200, {'Content-Type': 'text/html'})
	var MyReadStream=fs.createReadStream(__dirname+"/Cust_dashboard.html",'utf8');
	MyReadStream.pipe(res);
});

app.get('/provider/pending',checkAuth,function(req,res){
	MongoClient.connect(url, function(err, db) {
		if (err) throw err;
		console.log(req.session.user.email);
		var dbo=db.db('homecare');
		dbo.collection("workLog").find({servant:req.session.user.email}).toArray(function(err,cres){
				console.log(cres);
				for(var i=0;i<cres.length;i++){
					var obj=cres[i];
					if(new Date(obj.serviceDate) < new Date()){
						console.log(i);
						cres.splice(i,1);
						i--;
					}
				}
				console.log("after");
				console.log(cres);
				res.render('provider_dashboard',{data:cres});
		});
		db.close();
	});
});

app.listen(8443);
