var fs = require('fs'); 
var database;
var UserModel;
var crypto = require('crypto');
var jwt = require('jsonwebtoken');

var init = function(db, model){
    console.log('init호출됨');
    database = db;
    UserModel = model;
}
var login = (req, res) =>{
    // console.log('/login 호출됨.');
    var paramId = req.body.uid || req.query.uid;  // 요청 파라미터 확인
    var paramPassword = req.body.upw || req.query.upw;
    console.log('요청 파라미터 : ' + paramId + ', ' + paramPassword);
    //var database = req.app.get('database');
    
    UserModel.findOne({id:paramId}, function(err, user){
        if (err) { throw err; }
        console.log('아이디 [%s]로 사용자 검색', paramId); //console.dir(result);
        if(user){ console.log('아이디와 일치하는 사용자 찾음.');
            // var authenticated = user.authenticate(paramPassword, user._doc.salt, user._doc.hashed_password); //password는 req.body.upw
            var authenticated = comparePassword(paramPassword, user._doc.salt, user._doc.hashed_password)
            
            function comparePassword(pw, salt, hashed_pw){
                var hashing =  crypto.createHmac('sha1', salt).update(pw).digest('hex');
                return hashing == hashed_pw;
            }

            if (authenticated) {
                console.log('비밀번호 일치함, 로그인 성공 ' + paramId);
            
                var token = jwt.sign(
                    {data:{id:user.id, oid:user._id, username:user.name, userpic:user.pic.filename, useremail:user.email}}
                    ,'abc123'
                    ,{expiresIn : '7d'}
                )
                res.send({is_success:"success", token:token});
                
            }else {
                var msg = "<p>아이디와 패스워드를 다시 확인하십시오.</p>";
                res.send({is_success:"fail", message:msg});
                
            }
        }else {  // 조회된 레코드가 없는 경우 실패 응답 전송
            var msg = "<p>아이디와 패스워드를 다시 확인하십시오.</p>";
            res.send({is_success:"fail", message:msg});

        }
    });
};

var signup = (req, res) => { 
    var paramId = req.body.uid;
    var paramPassword = req.body.upw;
    var paramName = req.body.uname; 
    var paramBirth = req.body.ubirth;
    var paramGender = req.body.ugender;
    var paramPhone = req.body.uphone;
    var paramEmail = req.body.uemail;
    var paramPic = req.files[0];    
    
    var salt = makeSalt();
    var hashedPassword = encryptPassword(paramPassword, salt);
    
    function makeSalt(){
        return Math.round((new Date().valueOf() * Math.random())) + '';
    }
    function encryptPassword(pw, salt){
        return crypto.createHmac('sha1', salt).update(pw).digest('hex');
    }

    if (database) {  //addUser실행되면 -> 1) var user = new UserModel(...), user.save 저장
        var user = new UserModel({"id":paramId, "hashed_password":hashedPassword, "salt":salt, 
            "name":paramName, "birth":paramBirth, "gender":paramGender, "phone":paramPhone, 
            "email":paramEmail, "pic":paramPic});
        if(paramPic){
            var getFilename = paramPic.key.split('/')[1]
            console.log("paramPic : ", paramPic)
            // user.pic.data = fs.readFileSync(paramPic.path); //추가 
            // console.log("fs.readFileSync(paramPic.path) : ", fs.readFileSync(paramPic.path))
            user.pic.contentType= paramPic.mimetype;
            user.pic.path = paramPic.location;
            user.pic.filename = getFilename;
        }
        
        user.save();
        res.send('<script type="text/javascript">alert("회원가입이 완료되었습니다"); document.location = "/login" </script>');
        // res.redirect('/login')
        
   } else {  // 데이터베이스 객체가 초기화되지 않은 경우 실패 응답 전송
       res.writeHead('200', {'Content-Type':'text/html;charset=utf8'});
       res.write('<h2>데이터베이스 연결 실패</h2>');
       res.end();
   }
}

module.exports.init = init;
module.exports.login = login;
module.exports.signup = signup;
