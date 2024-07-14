import mongoose from 'mongoose';

const url = process.env.MONGODB_URI || 'mongodb+srv://vipulkhandelwal356:TtN2mFjT2uMndoNC@clusternew.ubarc9i.mongodb.net/uhi';

mongoose.connect(url)
  .then(() => console.log('Connected to DB'))
  .catch((e) => console.log('Error', e));


