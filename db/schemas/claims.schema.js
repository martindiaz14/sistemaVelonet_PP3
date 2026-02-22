import mongoose from "mongoose";

const {Schema, model, models, ObjectId, Date} = mongoose;

const claimsSchema = new Schema({
    IdClient:{type:ObjectId, required:true, ref:"clients"},
    IdEmployee:{type:ObjectId, ref:"employees"},
    date:{type:Date, required:true},
    resolutionTime:{type:String},
    dateResolution:{type:Date,},
    claimNumber:{type:Number, required:true, unique:true},
    desc:{type:String, required:true},
    state:{type:Number, required:true},
    descTec:{type:String},
    Idseverity:{type:ObjectId, ref:"severity"},
    Idrecurrence:{type:ObjectId, required:true, ref:"recurrence"},
    IdService:{type:ObjectId, required:true, ref:"service"},

})

const claims = models.claims || model('claims',claimsSchema )

export default claims