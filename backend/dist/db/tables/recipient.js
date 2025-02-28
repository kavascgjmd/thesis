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
exports.createRecipientTable = createRecipientTable;
const util_1 = require("../util");
function createRecipientTable() {
    return __awaiter(this, void 0, void 0, function* () {
        const createRecipientTableQuery = `
        CREATE TABLE IF NOT EXISTS recipients (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            recipient_name VARCHAR(255),
            recipient_details TEXT,
            contact_person VARCHAR(255),
            contact_number VARCHAR(50),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;
        try {
            yield (0, util_1.query)(createRecipientTableQuery);
            console.log('Recipient table created successfully');
        }
        catch (error) {
            console.error('Error creating recipient table:', error);
            throw error;
        }
    });
}
