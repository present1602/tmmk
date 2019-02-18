var mongoose = require('mongoose');

var UserSchema = mongoose.Schema({
    id:{type:String, required:true, unique:true}
    ,hashed_password: {type: String, required: true, 'default':''}
    ,salt : {type:String, required:true}
    ,name : {type:String}
    ,birth : {type:String}
    ,gender : {type:String}
    ,phone : {type:String}
    ,email : {type:String}
    ,pic: {data: Buffer, path:String, filename:String, contentType: String} 
    ,signup_date : {type:Date, index:{unique:false}, 'default':Date.now}
});

UserSchema.statics = {
    findById : function(id, callback) { 
        return this.findOne({id:id}, callback);
    }
    ,findAll : function(callback){
        return this.find({}, callback);
    }
    ,findByObjectId : function(userObjectId, callback){
        return this.findOne({_id:userObjectId})
                    .exec(callback);
    }
}  


console.log('UserSchema 정의함');

module.exports = mongoose.model('users', UserSchema)
