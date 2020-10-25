var express = require('express')
, http = require('http')
, path = require('path');

var bodyParser = require('body-parser')
, cookieParser = require('cookie-parser')
, static = require('serve-static')

var jwt = require('jsonwebtoken');

var expressSession = require('express-session');

var multer = require('multer');
var multerS3 = require('multer-s3');
const AWS = require('aws-sdk');

var fs = require('fs'); 
// Entities모듈 - showpost.ejs파일 content(내용입력부분) 처리시 사용?
var Entities = require('html-entities').AllHtmlEntities; 

var socketio = require('socket.io');
var cors = require('cors');
const { v4: uuidv4 } = require('uuid');

var mongoose = require('mongoose');


const configData = require('./config');
// console.log("configData : ", configData)

process.env.NODE_ENV = process.env.NODE_ENV && (process.env.NODE_ENV == 'production') ? 'production' : 'development';
console.log("process.env.NODE_ENV : ", process.env.NODE_ENV);

AWS.config.update({
    accessKeyId : configData.awsConfig.accessKeyId,
    secretAccessKey : configData.awsConfig.secretAccessKey,
    region : configData.awsConfig.region
});

var s3 = new AWS.S3(); 

var app = express();
app.set('views', __dirname + '/views');  //app.set('views', '/views'); 
app.set('view engine', 'ejs');

app.use(bodyParser({limit: '50mb'}))

app.use(function(req, res, next){
    res.header('Access-Control-Allow-Headers', 'content-type, x-access-token'); //1
    next();
});

app.use('/', static(path.join(__dirname, 'public'))); // public 폴더를 static으로 오픈

app.use(cookieParser()); // cookie-parser 설정

app.use(expressSession({ // 세션 설정
    secret:'my key',
    resave:true,
    saveUninitialized:true
}));

var upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: configData.awsConfig.bucket, // 버킷 이름
        contentType: multerS3.AUTO_CONTENT_TYPE, // 자동을 콘텐츠 타입 세팅
        acl: 'public-read-write', // 클라이언트에서 자유롭게 가용하기 위함
        key: (req, file, cb) => {
            console.log(file);
            var filename = uuidv4().substring(0, 4) + "-" + file.originalname; 
            console.log("in upload, filename : ", filename);
            cb(null, 'upload/' + filename)
        },
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 용량 제한
});
/*
var storage = multer.diskStorage({
    destination : function(req, file, callback){
        callback(null, '')
    },
    filename : function(req, file, callback){
        callback(null, Date.now()+file.originalname )  //date.now 앞으로 뺌 이미지확장자가 뒤로 와야될것 같아서
    }
});
var upload = multer({
    storage : storage
})
*/



//데이터베이스 객체를 위한 변수 선언
var database;
var UserModel;

var postModel;
var ChatModel = require('./database/chatroom').chat_model; 

var userModule = require('./routes/user');
var postModule = require('./routes/post');

//데이터베이스에 연결
function connectDB(){
    // var databaseUrl = 'mongodb://localhost:27017/local';
    var databaseUrl = configData.dbpath;
    console.log('databaseUrl : ' + databaseUrl)

    console.log('데이터베이스 연결을 시도합니다');
    mongoose.Promise = global.Promise;
    mongoose.connect(databaseUrl, {useUnifiedTopology: true});
    database = mongoose.connection;

    database.on('error', console.error.bind(console, 'mongoose connection error.'));
    database.on('open', function(){
        console.log('데이터베이스에 연결되었습니다 ');

        UserModel = require('./database/user_model');
        postModel = require('./database/post_model');
        
        //app.set('database', database); 
        userModule.init(database, UserModel); 
        postModule.init(database, UserModel, postModel);
    });
    database.on('disconnected', function(){
       console.log('연결이 끊어졌습니다 ');
    });
}

app.use(cors()); //?

app.get(['/index.html', '/'], function(req,res){
    var token = req.cookies.access_token;
    console.log("token : ", token)

    if(token==null || undefined){
        console.log("!token  구문 실행 redirect /login")
        res.redirect('/login');
        return;
    }
    else if(token){
        var decodeToken = jwt.decode(token, 'abc123');
        console.log('token : ' +JSON.stringify(decodeToken));
        if(decodeToken.data.id){
            var userId = decodeToken.data.id;
            res.render('index', {id:userId});
            return;
        }
        res.redirect('/login');
    }
});
app.get('/login', function(req,res){
    res.render('login')
})
app.post('/login', userModule.login);


app.get('/signup', function(req,res){
    res.render('signup')
})


app.post('/signup', upload.array('profile_image', 1), userModule.signup); //?? 

app.get('/posting', function(req,res){
    res.render('posting')
});

app.post('/posting', postModule.processPost);

app.get('/postlist', function(req,res){
    console.log('GET /postlist');
    postModel.find().populate('writer', 'name id gender pic')
    .sort({upload_date: 'desc'})
    .limit(20).exec(function(err, posts){
        if(err) throw err;
        if(posts){
            res.render('postlist', { posts:posts })
        }
    })
});

app.post('/postlist/filter', function(req,res){
    console.log('POST postlist/filter');

    console.log("req.body : ");
    console.log(req.body);
    
    var prCategory = req.body.category;
    var prPay = req.body.pay;
    var prGender = req.body.gender;
    
    var query = postModel.find().populate('writer', 'name id gender pic').sort({upload_date: 'desc'});
    if(prCategory){
        console.log('prCategory : ' + prCategory);
        query.where('category', prCategory); 
    }
    if(prPay){
        console.log('prPay : ' + prPay);
        query.where('pay').gte(prPay); 
    }
    if(prGender){
        console.log('prGender : ' + prGender);
        query.where('helper_gender').in([prGender, '무관']) 
    }
    query.exec(function(err, results) {
        console.log("postfilter 포스트 검색 callback ");
        if(err) throw err;
        if(results && results.length>0) {
            console.log('포스트 필터링 - results.length : ' + results.length);
            
            res.render('postlist', {posts:results});    
        }else{
            res.send("<p class='no_result_message'>검색 결과가 없습니다<p>")
        }
    });
    
});

app.get('/mapsearch', function(req,res){
    postModel.find().select('geometry').exec(function(err, results){
        if(err) throw err;
        res.send(results);
    });
})
app.post('/mapsearch', function(req,res){
    // ,data:{swCoords:[swLat, swLng], neCoords:[neLat, neLng]}

    var southWest = req.body.swCoords;
    var northEast = req.body.neCoords;
    var parseSouthWest = [parseFloat(southWest[1]), parseFloat(southWest[0])] 
    var parseNorthEast = [parseFloat(northEast[1]), parseFloat(northEast[0])] 
    console.log('req.body : ', req.body)
    // console.log("count : ", postModel.find().count());
    postModel.find({ 
            geometry:{$geoWithin:{$box:[parseSouthWest, parseNorthEast]}}  
    }).populate('writer', 'name id gender pic').exec(function(err, posts){
        console.log("posts : ")
        console.log(posts)
        console.log('posts.length : ', posts.length)

        if(err) throw err;
        if(posts.length>0){
            res.render('postlist', { posts:posts })
        }else{
            res.send("<p class='no_result_message'>검색 결과가 없습니다<p>")
        }
    })       
})
// url:'/mapsearch'
// ,method:'post'
// ,data:{swCoords:[swLat, swLng], neCoords:[neLat, neLng]}


app.post('/postlist/nearby', function(req,res){
    console.log("req.body : ", req.body)
    var prLat = req.body.lat;
    var prLng = req.body.lng;

    postModel.find().populate('writer', 'name id gender pic').where('geometry')
        .near({center:{type:'Point', coordinates:[parseFloat(prLng), parseFloat(prLat)]}})
        .limit(3)
        .exec(function(err, results){
        if(err) {
            console.log('near reqlist post 조회 중 에러 : ');
            throw err;
        }
        if(results){
            var context={ posts:results, coords:[Number(prLat), Number(prLng)]}
            res.render('postlist_nearby', context)
        }
    });
})

app.get('/chatlist', function(req, res){
    var token = jwt.decode(req.cookies.access_token, 'abc123');
    var userId = token.data.id;
    console.log(' /chatlist - userId : ' + userId);
    ChatModel.find({"participants.user_id":userId}).populate("contents.author").select("contents").exec(function(err, chatrooms){
        var lastMsgs = [];
        chatrooms.forEach(function(chat){
            if(chat.contents.length==0){
                return;
            }
            
            var lastIdx = chat.contents.length - 1;
            console.log('lastIdx : ' + lastIdx);
            var lastMsg = {};
            var lastMsgData = chat._doc.contents[lastIdx];
            var chatId = chat._doc._id;
            console.log('chatId : ' + chatId);
            console.log('lastMsgdata : ' + lastMsgData);
            // var getPicPath = chat._doc.contents[lastIdx].author.pic.path;
            // lastMsg.senderPicPath = getPicPath;
            var text = lastMsgData.text;
            var sender = lastMsgData.author.id;
            var senderPic = lastMsgData.author.pic.filename;
            console.log('senderPic : ', senderPic)

            var created = lastMsgData.created_at;
            var process_created = [];
            var month = (created.getMonth() + 1) + "월";
            var date = created.getDate() + "일";
            var hour = created.getHours();
            if (hour > 12) {
                hour = "오후 " + (hour-12) +"시";
            } else if (hour === 0) {
                hour = "오후 12시";
            }else{
                hour = "오전 " + hour + "시"; 
            }
            var min = created.getMinutes() + "분";
            process_created.push(month, date, hour, min);
            process_created = process_created.join(" ");
            
            console.log('process_created : ' + process_created);


            console.log("chatId : " + chatId + ", text : " + text + ", created : " + created + " ,sender : " + sender + " ,senderPic : " + senderPic);
            lastMsg ={"chatId":chatId, "text":text, "created":process_created, "sender":sender, "senderPic":senderPic}
            
            lastMsgs.push(lastMsg);
        });
        res.render('chatlist', {data:lastMsgs}, function(err, html){
            console.log('chatlist 렌더링');
            if(err) {throw err};
            res.send(html);
        });
    });
});

app.post('/chat', function(req,res){
    console.log('post /chat 호출');  
    // var writerObjId = req.body.writer_oid;
    var writerId = req.body.writer_id;
    var postObjId = req.body.post_oid;   
    var token = jwt.decode(req.cookies.access_token, 'abc123');
    var userId = token.data.id;
    console.log('새로 reqpostObjId : ' + postObjId);
    console.log('token.data.id : ' + token.data.id);
    if(token&&token.data.id){
        ChatModel.findOne({linkedpost:postObjId}, function(err, chatRoom){
            if (err) throw err;
            if(chatRoom){  //  1. 방개설 상태
                console.log('채팅방 존재')
                console.log('chatRoom.participants : ' + chatRoom.participants);
                var chatUsers = chatRoom.participants;
                function checkUser(user){
                    console.log('검사 시작')
                    console.log(user.user_id);
                    return user.user_id !== token.data.id;
                }
                if(chatUsers.every(checkUser)){  //return true 이면 -> 처음 입장 시
                    console.log('채팅방에 현재사용자 id 없음')
                    console.log('token.data.id : ' + token.data.id)
                    chatRoom.participants.push({ 
                        user_id : token.data.id     
                    })
                    chatRoom.save()
                }else{
                    console.log('채팅방에 현재사용자 id 존재')
                }
                res.send({chat_id:chatRoom._id}); 

            }else if(writerId == userId){
                console.log('채팅방 개설 안된 자신의 포스팅에서 메세지 버튼 클릭')
                res.send({chat_id:""})
            }else{  
                console.log('/chat - 채팅방 못찾음');// 2.방개설 안된 경우           

                var newChat = new ChatModel({linkedpost:postObjId})
                newChat.participants.push({user_id : userId}, {user_id : writerId});
                newChat.save(function(err, addedChat){
                    console.log('chatroom 인스턴스 저장, roomId : ' + newChat._id )
                    res.send({chat_id:newChat._id});         
                });
            }              
        });
    }  
});

app.get('/chaton/:id', function(req,res){
    var coid = req.params.id
    var token = jwt.decode(req.cookies.access_token, 'abc123');
    console.log('token : ' +JSON.stringify(token));
    var userId = token.data.id;
    var userOid = token.data.oid;
    console.log('userOid : '+userOid);
    ChatModel.findOne({_id:coid}).deepPopulate('contents.author').exec(function(err, conversation){
        var context = {conversation:conversation, user:userId, user_oid:userOid}
        req.app.render('chat', context, function(err, html){
            if(err) {throw err;}
            console.log('chat 렌더링');
            res.send(html);
        });      
    });
});

// app.get('/list_near', postModule.hprNear);

app.get('/viewpost/:id', postModule.showPost);


var server = http.createServer(app).listen(3003, function(){  
    console.log('서버가 시작되었습니다. 포트 : ' + 3003);
    connectDB(); // 데이터베이스 연결을 위한 함수 호출
});

var io = socketio.listen(server); // var io = require('socketio').listen(server);

io.sockets.on('connection', function(socket) {
    console.log('connection info :', socket.request.connection._peername);
    
    socket.on('message_req', function(data){  // data => {content:'text..', sender:userid, 

        console.log('룸으로 메세지 전송');
        console.log("socket.id : " + socket.id);
        console.log('data.content : ' + data.content + ', data.sender : ' 
            + data.sender + ', data.senderOid : ' + data.senderOid + ', data.room : ' + data.room);
        ChatModel.findOne({_id:data.room}, function(err, chat){
            chat.contents.push({text:data.content, author:data.senderOid});
            chat.save();
        }); 
        UserModel.findOne({id:data.sender}, function(err, user){   //룸 아이디 client emit('message' 시 넘겨 받기
            
            data.senderPic = user.pic.filename;

            var process_created = [];
            var createDate = new Date();
            var month = (createDate.getMonth() + 1) + "월";
            var date = createDate.getDate() + "일";
            var hour = createDate.getHours();
            if (hour > 12) {
                hour = "오후 " + (hour-12) +"시";
            } else if (hour === 0) {
                hour = "오후 12시";
            }else{
                hour = "오전 " + hour + "시"; 
            }
            var min = createDate.getMinutes() + "분";
            process_created.push(month, date, hour, min);
            process_created = process_created.join(" ");   
            console.log('process_created : ' + process_created);
            data.created = process_created;
            socket.to(data.room).emit('message_req', data); 
        });   
    });
    
    socket.on('join', function(data){
        console.log('join event');
        console.log("socket.id : " + socket.id);
        socket.join(data.chatOid);
    });
});