var Entities = require('html-entities').AllHtmlEntities; 
var jwt = require('jsonwebtoken');

var database;
var UserModel;
var postModel;

function init(db, usermodel, postmodel){ 
    console.log('post.js init 호출')
    database = db; 
    UserModel = usermodel;
    postModel = postmodel;
}
var processPost = (req, res) => {
    console.log('/process_reqpost 호출됨');
    var paramTitle = req.body.req_title;
    var paramContents = req.body.content;
    var paramCategory = req.body.category;
    var prHelperGender = req.body.helper_gender;
    var pay = req.body.pay;
    var token = jwt.decode(req.cookies.access_token);
    var prLatitude = req.body.latitude;
    var prLongitude = req.body.longitude;
    var prRoadAddr = req.body.road_addr;
    var prAddr = req.body.addr;
    if(database && token.data.id){
        var writerId = token.data.id;
        console.log(writerId)
        console.log('토큰에서 사용자 정보 세션에서 가져옴');
        
        UserModel.findById(writerId, function(err, result){   //findbyId는 배열형태로, findOne은 배열형태 아닌 객체로 results에 저장?
            if(err){
                callback(err, null);
                return;
            }
            if(result){
                console.log('아이디 [%s]로 사용자 검색', writerId);
                //console.dir(results);
                var userObjectId = result._doc._id;
                console.log('사용자 ObjectId : ' + userObjectId);
                var reqPost = new postModel({
                    "title":paramTitle, "contents":paramContents, "helper_gender":prHelperGender, "pay":pay, "category":paramCategory,"writer":userObjectId
                    ,"geometry":{type:'Point', coordinates:[prLongitude, prLatitude]}
                    ,"address":{'addr':prAddr, 'road_addr':prRoadAddr}
                });
                reqPost.save(function(err){ 
                //result는 reqposts 데이터베이스에서 reqPost에 해당하는 레코드, 172번째줄 해당유저데이터인 results와 다름
                    if(err){ throw err; }
                    console.log("새 포스트 추가함");
                    
                    return res.redirect('/viewpost/'+ reqPost._id);
                });
            }
        });
    }else{
        console.log('데이터베이스 연결이 안돼있거나 사용자아이디가 세션에 저장되어 있지 않음터베이스 연결이 안돼있거나 사용자아이디가 세션에 저장되어 있지 않음')
    }
}

var showPost = (req, res) =>{    //get으로 처리
    
    console.log('/view_reqpost/:id 호출됨');
    var postObjectId = req.params.id;
    console.log('postObjectId 값 : ' + postObjectId);
    //result는 objectid("_id"칼럼)로 조회한 포스트 레코드, findOne메서드로 찾음
    //findById는 배열형태로 저장되고 findOne메서드로 찾은 결과는 배열형태 아님? 
    postModel.load(postObjectId, function(err, result){  
            if(err){
            console.error('오류 발생 : ' + err.stack);
            res.writeHead('200', {'Content-Type':'text/html;charset=utf8'});
            res.write('<h2>포스트모델 load 메서드 실행 중 오류 발생</h2>'); res.end(); return;
        }
        if(result){
            console.log('포스트콜렉션에서 objectId로 조회한 레코드 가져옴');
            console.log("result._doc.title : " + result._doc.title);
            // console.log('dir result : ');
            // console.dir(result);            

            var upload_date = result._doc.upload_date;
            var process_date = [];
            var tdyear = upload_date.getFullYear().toString().substr(-2);
            var month = (upload_date.getMonth() + 1).toString();
            var date = upload_date.getDate().toString();
            if(month.length === 1){ month = "0" + month; }
            if(date.length === 1){ date = "0" + date; }
            process_date.push(tdyear, month, date);
            console.log('업로드데이트 : ' + upload_date);
            console.log('tdyear : ' + tdyear + ', month : ' + month + ', date : ' + date);
            console.log(process_date);

            var context = {post:result, date:process_date, Entities:Entities};
            res.writeHead('200', {'Content-Type' : 'text/html; charset= utf8'});
            req.app.render('viewpost', context, function(err, html){
                if(err){throw err;}
                console.log('viewpost.ejs파일 렌더링 시작');
                res.end(html); 
            });
        }
    });
}
var hprNear = (req,res) => {
    console.log('post.js 모듈 안의 hprNear 호출');
    var prLng = req.query.lng;
    var prLat = req.query.lat;
    console.log('hprNear 실행 - prLat : ' + prLat + 'prLng : ' + prLng )
    HprPostModel.find().populate('writer', 'name id gender pic').where('dep_geometry').near(
        {center:{type:'Point', coordinates:[parseFloat(prLng), parseFloat(prLat)]}}
    ).limit(3).exec(function(err, results){
        if(err){
            console.error('hrNear 실행 중 에러 발생 : ' + err.stack);
            res.writeHead('200', {'Content-Type':'text/html;charset=utf8'});
            res.write('<h2>hrNear 실행 중 에러 발생</h2>');
            res.write('<p>' + err.stack + '</p>');	res.end(); return;            
        }        
        if(results){
            console.log('hprNear 실행, results 넘겨 받음, hpr_list.ejs 렌더링');            
            req.app.render('hprlist_near', {posts:results, curLng:prLng, curLat:prLat, count:3}, function(err, html){
                if(err){
                    console.error('응답 웹문서 생성 중 에러 발생 : ' + err.stack);
                    res.writeHead('200', {'Content-Type':'text/html;charset=utf8'});
                    res.write('<h2>응답 웹문서 생성 중 에러 발생</h2>');
                    res.write('<p>' + err.stack + '</p>'); res.end(); return;                       
                }
                res.end(html);
            });           
        }
    });
}


var reqlist = (req,res) => {
    postModel.list(function(err, results){
        if (err) {
            console.error('게시판 글 목록 조회 중 에러 발생 : ' + err.stack);
            res.writeHead('200', {'Content-Type':'text/html;charset=utf8'});
            res.write('<h2>게시판 글 목록 조회 중 에러 발생</h2>');
            res.write('<p>' + err.stack + '</p>');	res.end(); return;
        }
        if(results){
            console.log('postModel.list메서도 호출, 결과 객체 넘겨받음');
            //console.log('콜백함수 count 파라미터 '); 
            postModel.count().exec(function(err, count){
                var context={ posts:results, count:count }
                req.app.render('req_list', context, function(err, html){
                    if (err) {
                        console.error('응답 웹문서 생성 중 에러 발생 : ' + err.stack);
                        res.writeHead('200', {'Content-Type':'text/html;charset=utf8'});
                        res.write('<h2>응답 웹문서 생성 중 에러 발생</h2>');
                        res.write('<p>' + err.stack + '</p>'); res.end(); return;
                    }
                    res.end(html);
                });
            });
        } 
    });
}



module.exports.init = init;
module.exports.processPost = processPost;
module.exports.showPost = showPost;
module.exports.reqlist = reqlist;

// module.exports.hprNear = hprNear;

// module.exports.reqFilter = reqFilter;
