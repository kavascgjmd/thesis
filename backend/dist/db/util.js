"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = query;
const pg_1 = __importDefault(require("pg"));
const { Pool } = pg_1.default;
function query(text, params) {
    return __awaiter(this, void 0, void 0, function* () {
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: false
        });
        const client = yield pool.connect();
        try {
            const result = yield client.query(text, params);
            return result;
        }
        finally {
            client.release();
        }
    });
}
