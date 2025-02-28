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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCartTable = createCartTable;
const util_1 = require("../util");
function createCartTable() {
    return __awaiter(this, void 0, void 0, function* () {
        const createCartTableQuery = `
  CREATE TABLE IF NOT EXISTS carts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'active',
    delivery_fee NUMERIC(10,2) DEFAULT 0.00,
    total_amount NUMERIC(10,2) DEFAULT 0.00,
    delivery_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
    `;
        try {
            yield (0, util_1.query)(createCartTableQuery);
            console.log('Cart table created successfully');
        }
        catch (error) {
            console.error('Error creating cart table:', error);
            throw error;
        }
    });
}
