var mongoose = require('mongoose');

var ReqPostSchema = mongoose.Schema({
    title:{type:String, required:true}
    ,contents: {type: String, required: true}
    //,category:{type:String}
    ,category:{type:String, 'default':''}
    ,upload_date : {type:Date, index:{unique:false}, 'default':Date.now}
    ,pay:{type:Number}  //??
    ,helper_gender:{type:String}
    ,writer:{type:mongoose.Schema.ObjectId, ref:'users'}
    ,address:{
        'addr':{type:String, 'default': ''}
        ,'road_addr':{type:String, 'default':''}    
    }
    ,geometry : {
        'type':{type:String, 'default': "Point"}
        ,coordinates : [{type:"Number"}]
        
    }
    //  1)writer변경 - 기존코드 :  writer:{type:string} 2)userObjectId 삭제 
});

ReqPostSchema.index({geometry:'2dsphere'});

ReqPostSchema.statics = {
    load : function(postId, callback){
        this.findOne({_id:postId})
            .populate('writer', 'name id gender pic')
            .exec(callback);
    }
    ,list: function(callback){
        //var criteria = options.criteria || {};
        this.find({})
            .populate('writer', 'name id gender pic')
            .exec(callback);
    }
}
   

console.log('ReqPostSchema 정의함');

module.exports = mongoose.model('reqposts', ReqPostSchema)