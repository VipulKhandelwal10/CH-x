"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const url = process.env.MONGODB_URI || 'mongodb+srv://vipulkhandelwal356:TtN2mFjT2uMndoNC@clusternew.ubarc9i.mongodb.net/uhi';
mongoose_1.default.connect(url)
    .then(() => console.log('Connected to DB'))
    .catch((e) => console.log('Error', e));
