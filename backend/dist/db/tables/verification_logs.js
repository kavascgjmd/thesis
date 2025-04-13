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
exports.createVerficationLogsTable = createVerficationLogsTable;
const util_1 = require("../util");
function createVerficationLogsTable() {
    return __awaiter(this, void 0, void 0, function* () {
        const createVerficationLogsTableQuery = `
 CREATE TABLE IF NOT EXISTS verification_logs (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL, -- 'ngo', 'donor', or 'recipient'
    entity_id INTEGER NOT NULL,
    verified_by INTEGER REFERENCES users(id),
    verification_notes TEXT,
    status VARCHAR(50) NOT NULL, -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
    `;
        try {
            yield (0, util_1.query)(createVerficationLogsTableQuery);
            console.log('Recipient table created successfully');
        }
        catch (error) {
            console.error('Error creating recipient table:', error);
            throw error;
        }
    });
}
