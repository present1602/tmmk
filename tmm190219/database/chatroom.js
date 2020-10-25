var mongoose = require('mongoose');
var deepPopulate = require('mongoose-deep-populate')(mongoose)
var Schema = mongoose.Schema;

// var MsgSchema = new Schema({
//     text:{type:String, required:true}
//     ,author:{ type:Schema.Types.ObjectId, ref:'users' }
//     ,createdAt:{type:Date, index:{unique:false}, 'default':Date.now}
// });
var ChatRoomSchema = new Schema({
    participants:[{
        user_id:{type:String} //user_oid or userid 선택
        ,joined_at : {type:Date, 'default':Date.now}
    }]
    //participants:[{type:Schema.Types.ObjectId, ref:'users'} ]
    ,contents:[{
        author:{type:Schema.Types.ObjectId, ref:'users'}
        ,created_at:{type:Date, 'default':Date.now}
        ,text:{type:String}
    }]
    ,linkedpost : {type:Schema.Types.ObjectId, ref:'reqposts'} 
    ,created_at :{type:Date, 'default':Date.now} 
}, {usePushEach: true});


ChatRoomSchema.plugin(deepPopulate);
module.exports.chat_model = mongoose.model('chatroom', ChatRoomSchema);

