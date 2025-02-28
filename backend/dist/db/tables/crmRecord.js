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
exports.createCRMRecordTable = createCRMRecordTable;
const util_1 = require("../util");
function createCRMRecordTable() {
    return __awaiter(this, void 0, void 0, function* () {
        const createCRMRecordTableQuery = `
        CREATE TABLE IF NOT EXISTS crm_records (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            interaction_type VARCHAR(50),
            interaction_date TIMESTAMP WITH TIME ZONE,
            notes TEXT
        );
    `;
        yield (0, util_1.query)(createCRMRecordTableQuery);
    });
}
